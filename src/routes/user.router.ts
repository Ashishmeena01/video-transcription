
import express from "express";
import prisma from "../lib/db.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken
} from "../utils/jwt.js";


const userRouter = express.Router();

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

interface GoogleUserResponse {
  id: string;
  email: string;
  verified_email?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/*
 * Step 1:
 * Redirect the user to Google.
 */
userRouter.get("/login-google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: "Google OAuth environment variables are missing",
    });
  }

  const authURL = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth"
  );

  authURL.searchParams.set("client_id", clientId);
  authURL.searchParams.set("redirect_uri", redirectUri);
  authURL.searchParams.set("response_type", "code");

  authURL.searchParams.set(
    "scope",
    "openid email profile"
  );

  authURL.searchParams.set("access_type", "offline");

  /*
   * TODO:
   * Replace this with a cryptographically random state
   * stored in a session/cookie and verify it in callback.
   */
  authURL.searchParams.set(
    "state",
    "RANDOM_STATE"
  );

  return res.redirect(authURL.toString());
});

/*
 * Step 2:
 * Google redirects the user back here with ?code=...
 */
userRouter.get(
  "/auth/google/callback",
  async (req, res) => {
    try {
      const code = req.query.code;

      if (typeof code !== "string") {
        return res.status(400).json({
          error: "Authorization code is missing",
        });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        return res.status(500).json({
          error: "Google OAuth environment variables are missing",
        });
      }

      /*
       * Exchange Google's authorization code
       * for Google's tokens.
       */
      const params = new URLSearchParams();

      params.set("code", code);
      params.set("client_id", clientId);
      params.set("client_secret", clientSecret);
      params.set("redirect_uri", redirectUri);
      params.set("grant_type", "authorization_code");

      const googleTokenResponse = await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );

      if (!googleTokenResponse.ok) {
        const errorData =
          await googleTokenResponse.json();

        console.error(
          "Google token exchange failed:",
          errorData
        );

        return res.status(401).json({
          error: "Failed to authenticate with Google",
        });
      }

      const googleTokens =
        (await googleTokenResponse.json()) as GoogleTokenResponse;

      if (!googleTokens.access_token) {
        return res.status(401).json({
          error: "Google access token was not received",
        });
      }

      /*
       * Get user information from Google.
       */
      const googleUserResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${ googleTokens.access_token } `,
          },
        }
      );

      if (!googleUserResponse.ok) {
        return res.status(401).json({
          error: "Failed to retrieve Google user information",
        });
      }

      const googleUser =
        (await googleUserResponse.json()) as GoogleUserResponse;

      if (!googleUser.email) {
        return res.status(401).json({
          error: "Google account email was not received",
        });
      }

      /*
       * Find the existing user or create a new user.
       */
      const user = await prisma.user.upsert({
        where: {
          email: googleUser.email,
        },

        update: {
          name: googleUser.name ?? "",
          googleId: googleUser.id,
          profilePicture: googleUser.picture ?? null,
        },

        create: {
          name: googleUser.name ?? "",
          email: googleUser.email,
          googleId: googleUser.id,
          profilePicture: googleUser.picture ?? null,
        },
      });

      /*
       * Generate YOUR application's tokens.
       */
      const accessToken = generateAccessToken(
        user.id,
        user.email,
        process.env.ACCESS_TOKEN_SECRET!
      );

      const refreshToken = generateRefreshToken(
        user.id,
        user.email,
        process.env.REFRESH_TOKEN_SECRET!
      );


      console.log("\n refreshToken and accesToken are respectively",refreshToken,"\n",accessToken);
      console.log("\n\n");

      /*
       * Store refresh token in an HttpOnly cookie.
       */
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge:
          7 * 24 * 60 * 60 * 1000,
      });

      /*
       * Return the access token to the frontend.
       */
      return res.status(200).json({
        message: "Login successful",

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
        },

        accessToken,
      });
    } catch (error) {
      console.error(
        "Google authentication error:",
        error
      );

      return res.status(500).json({
        error: "Authentication failed",
      });
    }
  }
);


userRouter.post("/auth/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: "Refresh token is missing",
      });
    }

    const secret = process.env.REFRESH_TOKEN_SECRET;

    if (!secret) {
      return res.status(500).json({
        error: "Refresh token secret is not configured",
      });
    }

    const payload = verifyToken(
      refreshToken,
      secret,
      "refresh"
    );

    if (!payload) {
      return res.status(401).json({
        error: "Invalid or expired refresh token",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "User no longer exists",
      });
    }

    const accessToken = generateAccessToken(
      user.id,
      user.email,
      process.env.ACCESS_TOKEN_SECRET!
    );

    return res.status(200).json({
      accessToken,
    });
  } catch (error) {
    console.error(
      "Refresh token error:",
      error
    );

    return res.status(500).json({
      error: "Failed to refresh access token",
    });
  }
});


export default userRouter;
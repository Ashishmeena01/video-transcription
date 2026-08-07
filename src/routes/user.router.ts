import express from "express";


const userRouter = express.Router();


userRouter.get("/login-google", (req: express.Request, res: express.Response) => {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!redirectUri) {
        return res.status(500).json({
            error: "Google redirect URI is not defined in environment variables",
        });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({
            error: "Google client ID is not defined in environment variables",
        });
    }

    const authURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&state=RANDOM_STATE&access_type=offline`;

    console.log("Google OAuth URL: ", authURL);

    res.redirect(authURL);
})

userRouter.get("/auth/google/callback", async (req: express.Request, res: express.Response) => {
    const code = req.query.code as string;
    if (!code) {
        return res.status(400).json({
            error: "Authorization code is missing in the callback request",
        });
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        return res.status(500).json({
            error: "Google client ID, client secret, or redirect URI is not defined in environment variables",
        });
    }


    const tokenUrl = "https://oauth2.googleapis.com/token";

    const params = new URLSearchParams();
    params.append("code", code);
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("redirect_uri", redirectUri);
    params.append("grant_type", "authorization_code");
    params.append("scope", "https://www.googleapis.com/auth/drive.file");
    params.append("access_type", "offline");
    params.append("prompt", "consent");
    params.append("include_granted_scopes", "true");

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
    })

    const data:any = await response.json();
    const token = data.access_token;

    const userData = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });
    const userInfo = await userData.json();
    console.log("Google OAuth user info: ", userInfo);


    res.end("Google OAuth callback received. Check server logs for details.");
})

export default userRouter;
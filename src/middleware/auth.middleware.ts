import type { Request, Response, NextFunction } from "express";
import {
  verifyToken,
  generateAccessToken,
} from "../utils/jwt.js";

const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        message: "Authorization header is missing",
      });
    }

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Invalid authorization format",
      });
    }

    const accessToken = authorization.split(" ")[1];

    if (!accessToken) {
      return res.status(401).json({
        message: "Access token is missing",
      });
    }

    const accessSecret = process.env.ACCESS_TOKEN_SECRET;

    if (!accessSecret) {
      console.error("ACCESS_TOKEN_SECRET is not configured");

      return res.status(500).json({
        message: "Internal server error",
      });
    }

    // -----------------------------
    // 1. Verify access token
    // -----------------------------

    const accessPayload = verifyToken(
      accessToken,
      accessSecret,
      "access"
    );

    if (accessPayload) {
      req.user = accessPayload;
      return next();
    }

    // -----------------------------
    // 2. Access token invalid/expired
    // -----------------------------

    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token is missing",
      });
    }

    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

    if (!refreshSecret) {
      console.error("REFRESH_TOKEN_SECRET is not configured");

      return res.status(500).json({
        message: "Internal server error",
      });
    }

    // -----------------------------
    // 3. Verify refresh token
    // -----------------------------

    const refreshPayload = verifyToken(
      refreshToken,
      refreshSecret,
      "refresh"
    );

    if (!refreshPayload) {
      return res.status(401).json({
        message: "Invalid or expired refresh token",
      });
    }

    // -----------------------------
    // 4. Generate new access token
    // -----------------------------

    const newAccessToken = generateAccessToken(
       refreshPayload.userId,
       refreshPayload.email,
       accessSecret
    );

    // -----------------------------
    // 5. Put new token in response
    // -----------------------------

    res.setHeader(
      "X-Access-Token",
      newAccessToken
    );

    // -----------------------------
    // 6. Continue request
    // -----------------------------

    req.user = refreshPayload;

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      message: "Authentication failed",
    });
  }
};

export default authMiddleware;
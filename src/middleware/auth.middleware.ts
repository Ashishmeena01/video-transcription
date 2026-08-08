import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorization = await req.headers.authorization;


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

    const secret = process.env.ACCESS_TOKEN_SECRET;

    if (!secret) {
      console.error("ACCESS_TOKEN_SECRET is not configured");

      return res.status(500).json({
        message: "Internal server error",
      });
    }

    const payload = verifyToken(
      accessToken,
      secret,
      "access"
    );

    if (!payload) {
      return res.status(401).json({
        message: "Invalid or expired access token",
      });
    }

    req.user = payload;

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      message: "Authentication failed",
    });
  }
};

export default authMiddleware;

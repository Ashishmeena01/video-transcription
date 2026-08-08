
import jwt, { type JwtPayload } from "jsonwebtoken";

type TokenType = "access" | "refresh";

interface TokenPayload extends JwtPayload {
  userId: number;
  email: string;
  type: TokenType;
}

export function generateToken(
  userId: number,
  email: string,
  secret: string,
  type: TokenType
): string {
  const expiresIn = type === "access" ? "15m" : "7d";

  return jwt.sign(
    {
      userId,
      email,
      type,
    },
    secret,
    {
      expiresIn,
    }
  );
}

export function generateAccessToken(
  userId: number,
  email: string,
  secret: string
): string {
  return generateToken(userId, email, secret, "access");
}

export function generateRefreshToken(
  userId: number,
  email: string,
  secret: string
): string {
  return generateToken(userId, email, secret, "refresh");
}

export function verifyToken(
  token: string,
  secret: string,
  expectedType: TokenType
): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string") {
      return null;
    }

    if (
      typeof decoded.userId !== "number" ||
      typeof decoded.email !== "string" ||
      decoded.type !== expectedType
    ) {
      return null;
    }

    return decoded as TokenPayload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}
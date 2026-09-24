import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./user.router.js";
import aiRouter from "./ai.router.js";
import prisma from "../lib/db.js";
import { generateAccessToken, verifyToken } from "../utils/jwt.js";
import authMiddleware from "../middleware/auth.middleware.js";
import uploadMediaRouter from "./upload-media.router.js";

const app = express();
const protectedRouter = express.Router();
const publicRouter = express.Router();

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
    cors({
        origin: frontendUrl,
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

publicRouter.post("/auth/refresh", async (req, res) => {
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

publicRouter.get("/", async (req: express.Request, res: express.Response) => {
    res.send("Hello, Guys This is a Small project which comes from my <3!");
});


publicRouter.get("/health", (req: express.Request, res: express.Response) => {
    res.send("Server is healthy!");
});






protectedRouter.use(
    authMiddleware
)



app.use("/", publicRouter);
app.use("/", protectedRouter);
publicRouter.use("/api/user", userRouter);
protectedRouter.use("/api/ai", aiRouter);
protectedRouter.use("/api",uploadMediaRouter);


protectedRouter.use("/check", (req: express.Request, res: express.Response) => {
    res.status(201).end("Auth is smooth working well are you ready guys");
})



export default app;
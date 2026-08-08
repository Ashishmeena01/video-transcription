import express from "express";
import userRouter from "./user.router.js";
import aiRouter from "./ai.router.js";
import prisma from "../lib/db.js";
import { verifyToken } from "../utils/jwt.js";
import authMiddleware from "../middleware/auth.middleware.js";


const app = express();
const protectedRouter = express.Router();
const publicRouter = express.Router();


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


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

protectedRouter.use("/check", (req: express.Request, res: express.Response) => {
    res.status(201).end("Auth is smooth working well");
})



export default app;
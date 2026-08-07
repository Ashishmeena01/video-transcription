import express from "express";
import userRouter from "./user.router.js";
import aiRouter from "./ai.router.js";
import prisma from "../lib/db.js";


const app = express();
const protectedRouter = express.Router();
const publicRouter = express.Router();


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

publicRouter.get("/", async (req: express.Request, res: express.Response) => {

    const users = await (await prisma).user.findMany();
    console.log("Users: ", users);
    res.send("Hello, World!");
});


publicRouter.get("/health", (req: express.Request, res: express.Response) => {
    res.send("Server is healthy!");
});

protectedRouter.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Unauthorized. Missing or invalid Authorization header.",
        });
    }
    next();
})

app.use("/", publicRouter);
app.use("/", protectedRouter);
publicRouter.use("/api/user", userRouter);
protectedRouter.use("/api/ai", aiRouter);



export default app;
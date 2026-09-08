import express from "express";
import cloudinary from "../utils/cloudinary.js";

const uploadMediaRouter = express.Router();

uploadMediaRouter.get("/signature", (req: express.Request, res: express.Response) => {
    try {
        const timestamp = Math.round(Date.now() / 1000);
        console.log(req.user);
        const folder = `users/${req.user.userId}/uploads`;

        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp,
                folder,
            },
            process.env.CLOUDINARY_API_SECRET!
        );

        const rsp = {
            timestamp,
            signature,
            folder,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
        };
        
        console.log("rsp is :" ,rsp);

        res.json(rsp);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not generate upload signature",
        });
    }
})

export default uploadMediaRouter;
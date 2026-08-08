import express from "express";
import {upload,ai} from "../utils/index.js";


const aiRouter = express.Router();


aiRouter.post("/transcribe", upload.single("video"), async (req: express.Request, res: express.Response) => {
    try {

        if (!req.file) {
            return res.status(400).json({
                error: "No video file uploaded",
            });
        }

        const videoPath = await req.file.path;
        const file = await ai.files.upload({
            file: videoPath,
            config: {
                mimeType: req.file.mimetype,
            },
        });

        let processedFile = await ai.files.get({
            name: file.name!,
        });

        while (processedFile.state === "PROCESSING") {
            await new Promise(resolve => setTimeout(resolve, 5000));

            processedFile = await ai.files.get({
                name: file.name!,
            });
        }

        if (processedFile.state === "FAILED") {
            throw new Error("Gemini video processing failed");
        }

        // Ask Gemini to transcribe in English
        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: [
                {
                    fileData: {
                        fileUri: processedFile.uri!,
                        mimeType: processedFile.mimeType!,
                    },
                },
                {
                    text: `
                        Transcribe all spoken content in this video.

                        Requirements:
                        - Return the transcript in English.
                        - If the speakers are speaking another language,
                        translate their speech into English.
                        - Do not summarize.
                        - Preserve the meaning of the original speech.
                        - Add punctuation.
                        - Separate speakers when you can identify them.
                    `,
                },
            ],
        });

        res.json({
            transcript: response.text,
        });

    } catch (error) {
        res.end((error as Error).message);
    }
});


aiRouter.post("/chat", async (req: express.Request, res: express.Response) => {
    try {

        const bd = await req.body;

        if (!bd || typeof bd !== "object") {
            return res.status(400).json({
                error: "Invalid request body",
            });
        }

        const Message = bd.message;

        if (!Message || typeof Message !== "string") {
            return res.status(400).json({
                error: "Invalid message format",
            });
        }

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: Message,
        });

        res.json({
            response: response.text,
        });
    } catch (error) {
        res.status(500).json({
            error: "Gemini request failed",
        });
    }
});


export default aiRouter;
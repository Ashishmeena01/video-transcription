import express from "express";
import {upload,ai} from "../utils/index.js";


const aiRouter = express.Router();


aiRouter.post("/transcribe", async (req: express.Request, res: express.Response) => {
    try {
        const bd = await req.body;
        if (!bd.transcribeUrl || typeof bd.transcribeUrl !== "string") {
            return res.status(400).json({
                error: "Invalid video URL",
            });
        }

        // Ask Gemini to transcribe in English
        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: [
                {
                    fileData: {
                        fileUri: bd.transcribeUrl,
                        mimeType: "video/mp4",
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
    }finally{
        console.log("Transcription request completed.");
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
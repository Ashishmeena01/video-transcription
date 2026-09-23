import express from "express";
import { ai } from "../utils/index.js";
import downloadVideoFromCloudinary from "../utils/video-downloader.js";
import path from "path";
import fs from "fs/promises";

const   aiRouter = express.Router();

const downloadPath =
    "C:/Users/ashis/OneDrive/Desktop/video-transcription/backend/downloads";

aiRouter.post(
    "/transcribe",
    async (req: express.Request, res: express.Response) => {
        let localVideoPath: string | null = null;

        try {
            const { transcribeUrl } = req.body;

            if (!transcribeUrl || typeof transcribeUrl !== "string") {
                return res.status(400).json({
                    error: "Invalid video URL",
                });
            }

            // --------------------------------
            // 1. Get filename from Cloudinary URL
            // --------------------------------

            const url = new URL(transcribeUrl);

            let filename = path.basename(url.pathname);

            // Remove extension if it already exists
            filename = filename.replace(/\.[^/.]+$/, "");

            filename += ".mp4";

            // --------------------------------
            // 2. Create download directory
            // --------------------------------

            await fs.mkdir(downloadPath, {
                recursive: true,
            });

            localVideoPath = path.join(
                downloadPath,
                filename
            );

            // --------------------------------
            // 3. Download video from Cloudinary
            // --------------------------------

            await downloadVideoFromCloudinary(
                transcribeUrl,
            );

            console.log(
                "Video downloaded:",
                localVideoPath
            );

            // --------------------------------
            // 4. Upload video to Gemini
            // --------------------------------

            const uploadedFile = await ai.files.upload({
                file: localVideoPath,
                config: {
                    mimeType: "video/mp4",
                },
            });

            console.log(
                "Uploaded to Gemini:",
                uploadedFile.uri
            );

            // --------------------------------
            // 5. Generate transcript
            // --------------------------------

            const response =
                await ai.models.generateContent({
                    model: "gemini-3.6-flash",

                    contents: [
                        {
                            fileData: {
                                fileUri: uploadedFile.uri,
                                mimeType:
                                    uploadedFile.mimeType ??
                                    "video/mp4",
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

            // --------------------------------
            // 6. Return transcript
            // --------------------------------
            console.log(response);
            return res.json({
                transcript: response.text,
            });
        } catch (error) {
            console.error(
                "Transcription failed:",
                error
            );

            return res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "Transcription failed",
            });
        } finally {
            // --------------------------------
            // 7. Delete local video
            // --------------------------------

            if (localVideoPath) {
                try {
                    await fs.unlink(localVideoPath);

                    console.log(
                        "Local video deleted:",
                        localVideoPath
                    );
                } catch (error) {
                    console.error(
                        "Failed to delete local video:",
                        error
                    );
                }
            }

            console.log(
                "Transcription request completed."
            );
        }
    }
);

aiRouter.post('/chat',async (req: express.Request, res: express.Response) => {
    try{
        const { message } = await req.body;


        if(!message){
            return res.end("no message there").status(400);
        }

        console.log(message);
        const result = await ai.models.generateContent({
            model: "gemini-3.6-flash",

            contents: [
                {
                    text:message,
                },
                {
                    text: `
                    your are a chatbot you just need to response to the message of user. response wisely

              `,
                },
            ],
        })
        console.log(result.text);

        return res.json({
            response:result.text,
        });
    }catch(error){
        return  res.status(404).json({error});
    }
})

export default aiRouter;
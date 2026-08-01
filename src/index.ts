import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import {  GoogleGenAI } from "@google/genai";
dotenv.config({
    path: "./.env"
});

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
}
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

console.log("Gemini API Key: ", process.env.GEMINI_API_KEY);

const storage = multer.diskStorage({
  destination: function (req: express.Request, file: any, cb: (error: Error | null, destination: string) => void) {
    cb(null, 'uploads/');
    },
    filename: function (req: express.Request, file: any, cb: (error: Error | null, filename: string) => void) {
        cb(null, file.originalname);
    }
}); 

const upload = multer({ storage: storage });



const app = express();
const port = process.env.PORT || 5000;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Hello, World!");
});

app.post("/transcribe", upload.single("video"), async (req: express.Request, res: express.Response) => {
    try{

        const {title} = await req.body;
        console.log("Title: ", title);

        const videoFile = await req.file;

        console.log("Video File: ", videoFile);

        res.json({
            message: "Video uploaded successfully",
        });
    }catch (error) {
        res.end((error as Error).message);
    }
});


app.post("/chat", async (req: express.Request, res: express.Response) => {
    try {

        const bd = await req.body;

        if(!bd || typeof bd !== "object") {
            return res.status(400).json({
                error: "Invalid request body",
            });
        }

        console.log("req body: ", bd);

        const Message = bd.message;

        if(!Message || typeof Message !== "string") {
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


app.get("/health", (req: express.Request, res: express.Response) => {
  res.send("Server is healthy!");
});



app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
})
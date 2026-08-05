import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import { profile } from "console";


dotenv.config({
    path: "./.env"
});

if (!process.env.GEMINI_API_KEY) {
    throw new Error("One or more required environment variables are not defined. or ffmpeg path is not defined");
}


const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
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


app.post("/chat", async (req: express.Request, res: express.Response) => {
    try {

        const bd = await req.body;

        if (!bd || typeof bd !== "object") {
            return res.status(400).json({
                error: "Invalid request body",
            });
        }

        console.log("req body: ", bd);

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


app.get("/health", (req: express.Request, res: express.Response) => {
    res.send("Server is healthy!");
});

app.get("/login-google", (req: express.Request, res: express.Response) => {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!redirectUri) {
        return res.status(500).json({
            error: "Google redirect URI is not defined in environment variables",
        });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({
            error: "Google client ID is not defined in environment variables",
        });
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/drive.file`;


    const urlg = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&state=RANDOM_STATE&access_type=offline`;

    console.log("Google OAuth URL: ", urlg);

    res.redirect(urlg);
})

app.get("/auth/google/callback", async (req: express.Request, res: express.Response) => {
    const code = req.query.code as string;
    if (!code) {
        return res.status(400).json({
            error: "Authorization code is missing in the callback request",
        });
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        return res.status(500).json({
            error: "Google client ID, client secret, or redirect URI is not defined in environment variables",
        });
    }


    const tokenUrl = "https://oauth2.googleapis.com/token";

    const params = new URLSearchParams();
    params.append("code", code);
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("redirect_uri", redirectUri);
    params.append("grant_type", "authorization_code");
    params.append("scope", "https://www.googleapis.com/auth/drive.file");
    params.append("access_type", "offline");
    params.append("prompt", "consent");
    params.append("include_granted_scopes", "true");

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
    })

    const data = await response.json();
    const token = data.access_token;

    const userData = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });
    const userInfo = await userData.json();
    console.log("Google OAuth user info: ", userInfo);


    
    res.end("Google OAuth callback received. Check server logs for details.");
})



app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
})
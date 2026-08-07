import express from "express";
import dotenv from "dotenv";
import "dotenv/config";
import app from "./routes/index.js";


dotenv.config({
    path: "./.env"
});

if (!process.env.GEMINI_API_KEY) {
    throw new Error("One or more required environment variables are not defined. or ffmpeg path is not defined");
}





console.log("Gemini API Key: ", process.env.GEMINI_API_KEY);




const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
})
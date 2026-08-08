import express from "express";
import dotenv from "dotenv";
import "dotenv/config";
import app from "./routes/index.js";
import prisma from "./lib/db.js";
import { mainFnValidateEnvVariables } from "./utils/process-env-variable.js";


dotenv.config({
    path: "./.env"
});


new Promise<void>(async (resolve, reject) => {
    try {
        await mainFnValidateEnvVariables();
        await (await prisma).$connect();
        console.log("Connected to the database successfully.");
        resolve();
    }
    catch (error) {
        console.error("Error validating environment variables: ", error);
        console.error("Error connecting to the database: ", error);

        reject(error);
    }
}).then(() => {
    const PORT = process.env.PORT || process.env.STATE === "development" ? 3000 : 8080;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error("Failed to connect to the database. Exiting...");
    process.exit(1);
});






const mainFnValidateEnvVariables = () => {
    const requiredEnvVariables:Array<string> = ["PORT",
        "GEMINI_API_KEY",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_REDIRECT_URI",
        "DATABASE_URL",
        "STATE",
        "ACCESS_TOKEN_SECRET",
        "REFRESH_TOKEN_SECRET"
    ];

    requiredEnvVariables.forEach((envVar) => {
        if (!process.env[envVar]) {
            throw new Error(`Environment variable ${envVar} is not defined`);
        }
    });
}


export { mainFnValidateEnvVariables };
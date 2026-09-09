import axios from "axios";
import fs from "fs";
import path from "path";


const downloadPath = 'C:/Users/ashis/OneDrive/Desktop/video-transcription/backend/downloads'

async function downloadVideoFromCloudinary(videoUrl:string) {
    const response = await axios({
        method: "GET",
        url: videoUrl,
        responseType: "stream",
    });

    const videoId = new URL(videoUrl).pathname.split("/").pop();
    const outputPath = path.join(downloadPath, `${videoId}`);

    const writer = fs.createWriteStream(outputPath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
}

export default downloadVideoFromCloudinary;
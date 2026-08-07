import multer from 'multer';
import express from 'express';


const storage = multer.diskStorage({
    destination: function (req: express.Request, file: any, cb: (error: Error | null, destination: string) => void) {
        cb(null, 'uploads/');
    },
    filename: function (req: express.Request, file: any, cb: (error: Error | null, filename: string) => void) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

export default upload;
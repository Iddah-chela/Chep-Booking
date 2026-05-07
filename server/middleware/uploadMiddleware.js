import multer from "multer";
import path from "path";

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file

const upload = multer({
    storage: multer.diskStorage({}),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype) || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WebP, GIF images, PDF files, and video files are allowed'), false);
        }
    },
});

export default upload;
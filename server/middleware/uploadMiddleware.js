import multer from "multer";
import path from "path";

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB per file

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

// Helper to wrap multer.single and return friendly JSON errors for uploads
export const singleFile = (fieldName = 'file') => {
    const single = upload.single(fieldName);
    return (req, res, next) => {
        single(req, res, (err) => {
            if (err) {
                console.error('[UploadMiddleware] multer error', err?.code || err?.message || err);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ success: false, message: `File too large. Maximum allowed size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB.` });
                }
                return res.status(400).json({ success: false, message: err.message || 'Invalid file upload' });
            }
            next();
        });
    };
};
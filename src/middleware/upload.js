const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Uploads land outside the served source tree and are git/docker-ignored.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
]);

const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        // Never trust the client-supplied name; generate our own and keep the
        // original only as metadata.
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ALLOWED_EXT.has(ext) ? ext : '.bin';
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${safeExt}`);
    }
});

function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
        return cb(new Error('Only PDF, JPG, PNG or WEBP files are allowed'));
    }
    cb(null, true);
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB per file
        files: 5                    // at most 5 files per request
    }
});

/**
 * Wraps multer so its own errors (bad type, oversize, too many files) become
 * 400s. Without this they fall through to the generic handler as 500s.
 */
function uploadDocumentsField(field = 'documents', maxCount = 5) {
    const handler = upload.array(field, maxCount);
    return (req, res, next) => {
        handler(req, res, (err) => {
            if (!err) return next();
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? `Each file must be under ${Math.round(upload.limits.fileSize / (1024 * 1024))} MB`
                : err.code === 'LIMIT_FILE_COUNT'
                    ? `You can upload at most ${maxCount} files at a time`
                    : err.message || 'Upload rejected';
            return res.status(400).json({ error: message });
        });
    };
}

module.exports = { upload, uploadDocumentsField, UPLOAD_DIR, ALLOWED_MIME, ALLOWED_EXT };

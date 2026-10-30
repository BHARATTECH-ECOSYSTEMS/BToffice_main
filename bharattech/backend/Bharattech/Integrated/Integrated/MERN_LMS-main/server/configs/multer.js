import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";

// Course covers wait in their own folder between the upload and the course being saved; the add-course handler
// removes each one, saved or refused.
export const UPLOAD_DIR = path.join(os.tmpdir(), "bharattech-lms-uploads");
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({ destination: UPLOAD_DIR });

// a bigger file is cut off while it arrives (multer removes the part already written)
const upload = multer({ storage, limits: { fileSize: COVER_MAX_BYTES, files: 1 } });

export default upload;

import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedMimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === "application/pdf";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    return {
      folder: "ocp-dashboard-uploads",
      resource_type: isPdf ? "raw" : "image",
      // Pour les fichiers "raw" (PDF), Cloudinary n'ajoute PAS l'extension
      // automatiquement à l'URL : il faut l'inclure nous-mêmes dans le public_id,
      // sinon le navigateur/l'OS ne reconnaît pas le type de fichier au clic.
      public_id: isPdf ? `${uniqueSuffix}.pdf` : uniqueSuffix,
      allowed_formats: ["pdf", "png", "jpg", "jpeg", "webp"],
    };
  },
});

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Seuls les fichiers PDF, PNG, JPG et WEBP sont acceptés"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default upload;
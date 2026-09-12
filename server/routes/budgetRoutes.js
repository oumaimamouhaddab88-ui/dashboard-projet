import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  listBacs,
  createBac,
  listPostesForBac,
  getPoste,
  createPoste,
  updatePoste,
  deletePoste,
  createAttachement,
  updateAttachement,
  deleteAttachement,
  getAttachementBatch,
  saveAttachementBatch,
  deleteAttachementBatch,
} from "../controllers/budgetController.js";
import { getBudgetData } from "../controllers/budgetDataController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "budget"));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

router.use(authMiddleware);

router.get("/data", getBudgetData); // GET /api/budget/data?projectId=...&bacId=...

router.get("/bacs", listBacs); // GET /api/budget/bacs?projectId=...
router.post("/bacs", createBac); // POST /api/budget/bacs  { projectId, nom }  ← AJOUTÉ
router.get("/bacs/:bacId/postes", listPostesForBac);
router.post("/bacs/:bacId/postes", createPoste);
router.get("/postes/:posteId", getPoste);
router.put("/postes/:posteId", updatePoste);
router.delete("/postes/:posteId", deletePoste);

router.get("/bacs/:bacId/attachements/:numero", getAttachementBatch);
router.post("/bacs/:bacId/attachements/:numero", saveAttachementBatch);
router.delete("/bacs/:bacId/attachements/:numero", deleteAttachementBatch);

router.post(
  "/postes/:posteId/attachements",
  upload.fields([{ name: "document", maxCount: 1 }, { name: "photos", maxCount: 10 }]),
  createAttachement
);
router.put(
  "/attachements/:id",
  upload.fields([{ name: "document", maxCount: 1 }, { name: "photos", maxCount: 10 }]),
  updateAttachement
);
router.delete("/attachements/:id", deleteAttachement);

export default router;

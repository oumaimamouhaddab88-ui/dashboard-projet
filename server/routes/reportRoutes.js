import express from "express";
import { v2 as cloudinary } from "cloudinary";
import Report from "../models/Report.js";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// GET /api/reports?projectId=...
// ⚠️ MIGRATION : filtré par projectId, requis.
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ message: "projectId requis" });
    }
    const rapports = await Report.find({ projectId }).sort({ date: -1 });
    res.status(200).json(rapports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/reports — projectId requis dans le body (form-data)
router.post("/", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { projectId, description, date } = req.body;

    if (!projectId) {
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: req.file.mimetype === "application/pdf" ? "raw" : "image",
        });
      }
      return res.status(400).json({ message: "projectId requis" });
    }

    if (!description || !date) {
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: req.file.mimetype === "application/pdf" ? "raw" : "image",
        });
      }
      return res.status(400).json({ message: "La description et la date sont requises" });
    }

    const reportData = { projectId, description, date };

    if (req.file) {
      reportData.file = {
        filename: req.file.filename, // public_id Cloudinary (nécessaire pour la suppression)
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        path: req.file.path, // URL Cloudinary complète
      };
    }

    const newReport = await Report.create(reportData);

    res.status(201).json(newReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Rapport introuvable" });
    }

    if (report.file?.filename) {
      await cloudinary.uploader.destroy(report.file.filename, {
        resource_type: report.file.mimetype === "application/pdf" ? "raw" : "image",
      });
    }

    await Report.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Rapport supprimé avec succès", id: req.params.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
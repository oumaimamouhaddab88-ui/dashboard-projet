import express from "express";
import { v2 as cloudinary } from "cloudinary";
import Task from "../models/Task.js";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

const EDITABLE_FIELDS = [
  "rubrique",
  "task",
  "responsable",
  "dateDebut",
  "dateFin",
  "dureeV0",
  "dureeReel",
  "dateFinReelle",
  "ponderation",
  "progress",
];

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "projectId requis" });
    }

    const tasks = await Task.find({ projectId }).sort({ dateDebut: 1 });
    res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { projectId, rubrique, task, responsable, dateDebut, dateFin, ponderation } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "projectId requis" });
    }

    if (!rubrique || !task) {
      return res.status(400).json({ message: "La rubrique et le nom de la tâche sont requis" });
    }

    const newTask = await Task.create({
      projectId,
      rubrique,
      task,
      responsable: responsable || undefined,
      dateDebut: dateDebut || undefined,
      dateFin: dateFin || undefined,
      ponderation: ponderation !== undefined && ponderation !== '' ? Number(ponderation) : undefined,
      progress: 0,
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tâche introuvable" });
    }
    res.status(200).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const updates = {};
    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updated = await Task.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Tâche introuvable" });
    }
    res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Upload d'un document sur une tâche (stockage Cloudinary)
router.post("/:id/documents", authMiddleware, upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier reçu" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      // Le fichier a déjà été envoyé sur Cloudinary : on le supprime pour ne pas laisser d'orphelin
      await cloudinary.uploader.destroy(req.file.filename, {
        resource_type: req.file.mimetype === "application/pdf" ? "raw" : "image",
      });
      return res.status(404).json({ message: "Tâche introuvable" });
    }

    task.documents.push({
      filename: req.file.filename, // public_id Cloudinary (nécessaire pour la suppression)
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      path: req.file.path, // URL Cloudinary complète, utilisable directement par le frontend
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Erreur serveur" });
  }
});

// Suppression d'un document (Cloudinary)
router.delete("/:id/documents/:docId", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tâche introuvable" });
    }

    const doc = task.documents.id(req.params.docId);
    if (!doc) {
      return res.status(404).json({ message: "Document introuvable" });
    }

    await cloudinary.uploader.destroy(doc.filename, {
      resource_type: doc.mimetype === "application/pdf" ? "raw" : "image",
    });

    doc.deleteOne();
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tâche introuvable" });
    }

    await Promise.all(
      (task.documents || []).map((doc) =>
        cloudinary.uploader.destroy(doc.filename, {
          resource_type: doc.mimetype === "application/pdf" ? "raw" : "image",
        })
      )
    );

    await Task.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Tâche supprimée avec succès", id: req.params.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
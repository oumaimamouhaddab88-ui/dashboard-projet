import mongoose from "mongoose";
import dotenv from "dotenv";
import Task from "../models/Task.js";
import tasksSeedDataIR03 from "../data/tasksSeedDataIR03.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connecté");

    await Task.deleteMany({});
    console.log("🗑️  Anciennes tâches supprimées");

    const tasksToInsert = tasksSeedDataIR03.map((t) => ({
      ...t,
      responsable: t.responsable || undefined,
      dateDebut: t.dateDebut ? new Date(t.dateDebut) : undefined,
      dateFin: t.dateFin ? new Date(t.dateFin) : undefined,
      dateFinReelle: t.dateFinReelle ? new Date(t.dateFinReelle) : undefined,
    }));

    await Task.insertMany(tasksToInsert);
    console.log(`✅ ${tasksToInsert.length} tâches importées avec succès (planning IR03)`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors de l'import :", error.message);
    process.exit(1);
  }
};

run();

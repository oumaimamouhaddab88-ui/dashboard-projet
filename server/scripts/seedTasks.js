import mongoose from "mongoose";
import dotenv from "dotenv";
import Task from "../models/Task.js";
import tasksSeedData from "../data/tasksSeedData.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connecté");

    await Task.deleteMany({});
    console.log("🗑️  Anciennes tâches supprimées");

    const tasksToInsert = tasksSeedData.map((t) => ({
      ...t,
      dateDebut: t.dateDebut ? new Date(t.dateDebut) : undefined,
      dateFin: t.dateFin ? new Date(t.dateFin) : undefined,
      dateFinReelle: t.dateFinReelle ? new Date(t.dateFinReelle) : undefined,
    }));

    await Task.insertMany(tasksToInsert);
    console.log(`✅ ${tasksToInsert.length} tâches importées avec succès`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors de l'import :", error.message);
    process.exit(1);
  }
};

run();

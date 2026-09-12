// backend/seed/clearBac3.js
// Supprime tous les Postes (et leurs Attachements) rattachés à "Bac 3", pour repartir
// avec un Bac 3 complètement vide en attendant les vraies données.
// Le Bac 10 n'est pas touché.
//
// Utilisation : depuis le dossier backend/  →  node seed/clearBac3.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Bac from "../models/Bac.js";
import Poste from "../models/Poste.js";
import Attachement from "../models/Attachement.js";

dotenv.config();

async function clearBac3() {
  await connectDB();

  const bac3 = await Bac.findOne({ nom: "Bac 3" });
  if (!bac3) {
    console.log("ℹ️ Aucun Bac 3 trouvé — rien à supprimer.");
    await mongoose.disconnect();
    process.exit(0);
  }

  const postes = await Poste.find({ bacId: bac3._id });
  const posteIds = postes.map((p) => p._id);

  const { deletedCount: attSupprimes } = await Attachement.deleteMany({ posteId: { $in: posteIds } });
  const { deletedCount: postesSupprimes } = await Poste.deleteMany({ bacId: bac3._id });

  console.log(`✅ Bac 3 vidé : ${postesSupprimes} poste(s) et ${attSupprimes} attachement(s) supprimés.`);
  console.log("   Le Bac 3 lui-même est conservé (juste vide), prêt à recevoir les vraies données plus tard.");

  await mongoose.disconnect();
  process.exit(0);
}

clearBac3().catch((err) => {
  console.error("❌ Erreur lors du nettoyage du Bac 3:", err);
  process.exit(1);
});

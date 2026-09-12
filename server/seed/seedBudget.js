// backend/seed/seedBudget.js
// Remplit Bac / Poste / Attachement avec les vraies données du fichier
// SUIVI_BUDGET_U51.xlsx (Bac 10, 20 postes, 7 attachements par poste).
//
// Utilisation : depuis le dossier backend/  →  node seed/seedBudget.js
// (adapte le chemin d'import de connectDB si besoin)

import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Bac from "../models/Bac.js";
import Poste from "../models/Poste.js";
import Attachement from "../models/Attachement.js";

dotenv.config();

// Dates réelles des 7 attachements (colonnes "Date" de l'Excel)
const ATTACHEMENT_DATES = [
  "2025-04-21",
  "2025-06-30",
  "2025-09-25",
  "2025-11-11",
  "2026-01-16",
  "2026-04-23",
  "2026-06-12",
];

// [numero, designation, rubrique, unite, quantite, prixUnitaire, [pct1..pct7]]
const POSTES = [
  [1, "Fourniture, fabrication et changement de la porte visite avec support selon modèle existant", "Équipement", "F", 2, 65000, [0.25, 0, 0, 0, 0.5, 0.25, 0.25]],
  [2, "Remplacement des tôles de fond du bac à l'unité 51 (démontage, fourniture et montage)", "Tôlerie", "F", 2, 1750000, [0.25, 0, 0.25, 0.3, 0.25, 0.2, 0.25]],
  [3, "Remplacement des tôles marginales du bac à l'unité 51 (démontage, fourniture et montage)", "Tôlerie", "F", 2, 500000, [0, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25]],
  [4, "Reconstitution du lit de sable compacté du bac à l'unité 51 (dégagement, fourniture et reconstitution)", "Préparation", "F", 2, 650000, [0, 0.25, 0.75, 0, 0.25, 0, 0.25]],
  [5, "Reconstitution de la couche de sable bitumineux du bac à l'unité 51 (dégagement, fourniture et reconstitution)", "Préparation", "F", 2, 300000, [0, 0.25, 0.75, 0, 0.25, 0, 0.25]],
  [6, "Remplacement des piquages de vidange avec doublure de renfort du bac à l'unité 51", "Tuyauterie", "F", 2, 80000, [0, 0.25, 0, 0, 0.25, 0.5, 0.25]],
  [7, "Remplacement du bas de la 1ère virole du bac à l'unité 51 sur une hauteur de 1,5 (démontage, fourniture et montage)", "Tôlerie", "F", 2, 1500000, [0, 0.25, 0.25, 0.3, 0.25, 0, 0]],
  [8, "Remplacement des tôles de la 2éme virole du bac à l'unité 51 (démontage, fourniture et montage)", "Tôlerie", "M²", 60, 8000, [0, 0, 0, 0, 0, 0, 0]],
  [9, "Remplacement des tôles de la 3éme virole du bac à l'unité 51 (démontage, fourniture et montage)", "Tôlerie", "M²", 60, 8000, [0, 0, 0, 0, 0, 0, 0]],
  [10, "Remplacement des tôles de la 4éme virole du bac à l'unité 51 (démontage, fourniture et montage)", "Tôlerie", "M²", 100, 7500, [0, 0, 0, 0, 0, 0, 0]],
  [11, "Remplacement de la totalité de la tôle de la 5ème virole (avec piquages trop-plein) du bac à l'unité 51", "Tôlerie", "F", 2, 1150000, [0, 0.25, 0, 0.25, 0, 0.5, 0]],
  [12, "Changement du toit du bac à l'unité 51 (tubulures, renforts, chevrons, chapeau chinois)", "Toiture", "F", 2, 5000000, [0.25, 0, 0, 0.15, 0.25, 0.35, 0.2]],
  [13, "Fourniture et changement des collecteurs vapeur, retour condensat et circuit d'étouffement du bac à l'unité 51", "Tuyauterie", "F", 2, 150000, [0, 0.25, 0, 0, 0, 0.25, 1]],
  [14, "Assemblage, soudure et montage des réchauffeurs du bac à l'unité 51 (27 réchauffeurs)", "Tuyauterie", "F", 2, 300000, [0.25, 0, 0, 0, 0.25, 0, 1]],
  [15, "Remplacement de l'ensemble des passerelles du bac de l'unité 51", "Structure", "F", 2, 500000, [0.25, 0, 0, 0, 0, 0.35, 0.4]],
  [16, "Fourniture et changement de conduite de production du bac de l'unité 51", "Tuyauterie", "F", 2, 60000, [0.25, 0, 0, 0, 0.25, 0, 0.5]],
  [17, "Fourniture et changement de conduite de recyclage du bac de l'unité 51", "Tuyauterie", "F", 2, 120000, [0.25, 0, 0, 0, 0.25, 0, 0.5]],
  [18, "Fourniture et changement des conduites de trop plein du bac de l'unité 51", "Tuyauterie", "F", 4, 166000, [0, 0.25, 0, 0, 0, 0, 1.75]],
  [19, "Sablage et peinture des bacs (complexe THT) au niveau des zones d'intervention du bac à l'unité 51", "Peinture", "F", 2, 500000, [0, 0, 0, 0, 0, 0, 0.5]],
  [20, "Calorifugeage des zones d'interventions du bac et conduites à l'unité 51", "Calorifuge", "F", 2, 650000, [0, 0.25, 0, 0, 0.25, 0, 0.25]],
];

async function seed() {
  await connectDB();

  // 1) Bacs — Bac 10 (données réelles), Bac 3 (vide, à compléter plus tard)
  let bac10 = await Bac.findOne({ nom: "Bac 10" });
  if (!bac10) bac10 = await Bac.create({ nom: "Bac 10" });

  let bac3 = await Bac.findOne({ nom: "Bac 3" });
  if (!bac3) bac3 = await Bac.create({ nom: "Bac 3" });

  // 2) Nettoyage des anciennes données du Bac 10 pour repartir propre
  const oldPostes = await Poste.find({ bacId: bac10._id });
  const oldPosteIds = oldPostes.map((p) => p._id);
  await Attachement.deleteMany({ posteId: { $in: oldPosteIds } });
  await Poste.deleteMany({ bacId: bac10._id });

  // 3) Création des 20 postes + leurs 7 attachements
  for (const [numero, designation, rubrique, unite, quantite, prixUnitaire, pcts] of POSTES) {
    const poste = await Poste.create({
      bacId: bac10._id,
      numero,
      designation,
      rubrique,
      unite,
      quantite,
      prixUnitaire,
    });

    for (let i = 0; i < pcts.length; i++) {
      if (pcts[i] === 0) continue; // pas d'attachement créé si pourcentage nul (== pas encore réalisé)
      await Attachement.create({
        posteId: poste._id,
        numero: i + 1,
        pourcentage: pcts[i] * 100, // le modèle stocke 0..100
        date: ATTACHEMENT_DATES[i],
        statut: "realise",
      });
    }
  }

  console.log(`✅ Seed terminé : Bac 10 avec ${POSTES.length} postes créés.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Erreur seed budget:", err);
  process.exit(1);
});

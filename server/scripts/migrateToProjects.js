/**
 * scripts/migrateToProjects.js
 *
 * Migration UNIQUE, NON DESTRUCTIVE, IDEMPOTENTE vers le système multi-projets.
 *
 * Ce script ne fait QUE :
 *   1. S'assurer qu'un Projet "Bac" (isDefault: true) existe.
 *   2. Rattacher à ce projet (projectId = BAC_ID) tous les documents Task, Bac,
 *      Team et Report qui n'ont PAS encore de projectId.
 *
 * Il ne modifie AUCUNE autre valeur (budget, avancement, dates, etc.), ne
 * supprime rien, et peut être relancé sans risque (les documents déjà
 * migrés — projectId existant — sont ignorés).
 *
 * Usage :
 *   node scripts/migrateToProjects.js
 *
 * À exécuter UNE FOIS après le déploiement des nouveaux modèles
 * (Bac.js, Team.js, Report.js, Project.js, Task.js) et AVANT de mettre les
 * nouvelles routes/contrôleurs en production.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Bac from "../models/Bac.js";
import Team from "../models/Team.js";
import Report from "../models/Report.js";

dotenv.config();

async function run() {
  await connectDB();

  console.log("🔎 Vérification / création du projet par défaut « Bac »...");

  let bacProject = await Project.findOne({ isDefault: true });
  if (!bacProject) {
    bacProject = await Project.create({
      name: "Bac",
      description: "Projet par défaut regroupant les données existantes",
      isDefault: true,
      status: "actif",
    });
    console.log(`✅ Projet « Bac » créé (id=${bacProject._id})`);
  } else {
    console.log(`ℹ️  Projet « Bac » déjà existant (id=${bacProject._id}) — non modifié`);
  }

  const BAC_ID = bacProject._id;

  const migrations = [
    { label: "Task", Model: Task },
    { label: "Bac (budget)", Model: Bac },
    { label: "Team", Model: Team },
    { label: "Report", Model: Report },
  ];

  for (const { label, Model } of migrations) {
    // On ne touche QUE les documents qui n'ont pas encore de projectId.
    // Toutes les autres valeurs du document restent strictement inchangées.
    const filter = {
      $or: [{ projectId: { $exists: false } }, { projectId: null }],
    };

    const countBefore = await Model.countDocuments(filter);

    if (countBefore === 0) {
      console.log(`✅ ${label} : aucun document à migrer (déjà fait, ou collection vide).`);
      continue;
    }

    const result = await Model.updateMany(filter, { $set: { projectId: BAC_ID } });

    console.log(
      `✅ ${label} : ${result.modifiedCount ?? result.nModified} document(s) rattaché(s) au projet « Bac » (sur ${countBefore} concerné(s)).`
    );
  }

  console.log("\n🎉 Migration terminée. Aucune donnée existante n'a été supprimée ou modifiée hors du champ projectId.");

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Erreur pendant la migration :", err);
  process.exit(1);
});

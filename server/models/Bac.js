import mongoose from "mongoose";

// Un Bac (ex: "Bac 3", "Bac 10", ou simplement "Bac") regroupe plusieurs postes
// budgétaires. Il appartient désormais à un Projet.
//
// ⚠️ MIGRATION : le champ `projectId` a été ajouté. `nom` n'est plus unique
// globalement (deux projets différents peuvent chacun avoir un "Bac" nommé
// pareil) — l'unicité est désormais garantie par la paire (projectId, nom).
const bacSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    nom: { type: String, required: true, trim: true }, // "Bac 3" | "Bac 10" | "Bac"
  },
  { timestamps: true }
);

// Unicité du nom à l'intérieur d'un même projet uniquement.
bacSchema.index({ projectId: 1, nom: 1 }, { unique: true });

const Bac = mongoose.model("Bac", bacSchema);
export default Bac;

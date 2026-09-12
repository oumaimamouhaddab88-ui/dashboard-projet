import mongoose from "mongoose";

// ⚠️ MIGRATION : ajout de `projectId`. Un membre d'équipe appartient désormais
// à un projet précis (l'équipe BAC reste distincte de l'équipe d'un futur
// projet JPH, etc).
const teamSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    poste: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    telephone: {
      type: String,
      trim: true,
      default: "",
    },
    dateEntree: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Team", teamSchema);

import mongoose from "mongoose";

// Un poste appartient à un Bac. Le budget total n'est JAMAIS stocké : il est toujours
// recalculé côté serveur (quantite * prixUnitaire) pour éviter toute incohérence si
// quantite ou prixUnitaire changent plus tard.
const posteSchema = new mongoose.Schema(
  {
bacId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Bac",
  required: true,
},    numero: { type: Number, required: true }, // ordre d'affichage (1..20)
    designation: { type: String, required: true },
    rubrique: { type: String, default: "" },
    unite: { type: String, required: true }, // "F", "M²", ...
    quantite: { type: Number, required: true },
    prixUnitaire: { type: Number, required: true },
  },
  { timestamps: true }
);
posteSchema.index({ bacId: 1, numero: 1 });
const Poste = mongoose.model("Poste", posteSchema);
export default Poste;

import mongoose from "mongoose";

// Un attachement représente une situation de paiement pour un poste.
// IMPORTANT : montantHT / tva / montantTTC ne sont PAS stockés — ils sont recalculés à la
// volée (voir utils/budgetCalculations.js) à partir du budget du poste + pourcentage
// (ou montantHTManuel). Cela garantit qu'ils restent toujours exacts, même si le prix
// unitaire ou la quantité du poste changent après coup.
const attachementSchema = new mongoose.Schema(
  {
posteId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Poste",
  required: true,
},    numero: { type: Number, required: true },
    pourcentage: { type: Number, default: null }, // 0..100, prioritaire sur montantHTManuel
    montantHTManuel: { type: Number, default: null }, // saisie alternative si % non utilisé
    date: { type: Date, required: true },
    statut: { type: String, enum: ["realise", "en_attente"], default: "realise" },
    observation: { type: String, default: "" },
    document: { type: String, default: "" }, // chemin/URL du PDF uploadé
    photos: [{ type: String }], // chemins/URLs des photos uploadées
  },
  { timestamps: true }
);
attachementSchema.index({ posteId: 1, numero: 1, date: 1 });
const Attachement = mongoose.model("Attachement", attachementSchema);
export default Attachement;

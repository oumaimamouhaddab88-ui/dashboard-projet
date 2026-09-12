// server/utils/budgetCalculations.js
// Utilisé par controllers/budgetController.js (listPostesForBac, getPoste,
// createAttachement, updateAttachement).
//
// Formule : montant d'un attachement = pourcentage × budget total du poste
// (budgetHT = quantite × prixUnitaire). L'avancement = somme des pourcentages
// (plafonnée à 100%).

export function computePosteBudget(poste) {
  return (poste.quantite || 0) * (poste.prixUnitaire || 0);
}

// Calcule montantHT / tva / montantTTC pour UN attachement d'UN poste.
export function computeAttachementAmounts(poste, attachement) {
  const budgetHT = computePosteBudget(poste);
  let montantHT = 0;

  if (attachement?.pourcentage != null) {
    montantHT = (attachement.pourcentage / 100) * budgetHT;
  } else if (attachement?.montantHTManuel != null) {
    montantHT = attachement.montantHTManuel;
  }

  const tva = montantHT * 0.2;
  const montantTTC = montantHT + tva;

  return { montantHT, tva, montantTTC };
}

// Résumé consolidé d'un poste à partir de la liste de ses attachements.
export function computePosteSummary(poste, attachements = []) {
  const budgetHT = computePosteBudget(poste);
  const totalHT = attachements.reduce((sum, a) => sum + computeAttachementAmounts(poste, a).montantHT, 0);
  const resteHT = Math.max(budgetHT - totalHT, 0);
  const avancement = budgetHT > 0 ? Math.min(totalHT / budgetHT, 1) : 0;
  return { budgetHT, totalHT, resteHT, avancement };
}

export function computePosteAlerts(poste, attachements = []) {
  const summary = computePosteSummary(poste, attachements);
  const alerts = [];
  if (summary.avancement >= 1) alerts.push({ label: "Terminé", level: "success" });
  else if (summary.avancement === 0) alerts.push({ label: "Non démarré", level: "default" });
  if (!poste.prixUnitaire) alerts.push({ label: "PU manquant", level: "danger" });
  return alerts;
}

export function getProgressLevel(avancement) {
  if (avancement >= 1) return "done";
  if (avancement >= 0.4) return "overdue";
  return "todo";
}
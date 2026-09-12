// utils/budgetCalculations.js
// Modèle : chaque poste (item) porte directement ses pourcentages par attachement
// dans item.percentages[attachmentId]. Plus de collection "Attachement" séparée côté front.
//
// Formule : montant d'un attachement = pourcentage × budget total du poste
// (budgetHT = quantité × PU). Donc l'avancement du poste = somme des pourcentages
// (plafonnée à 100%).

export function computeItemBudget(item) {
  return (item.quantity || 0) * (item.unitCost || 0)
}

// Détail par attachement pour UN item (poste). `realise` (case cochée) détermine si le
// montant compte dans l'avancement — un pourcentage saisi mais pas encore "réalisé" ne
// compte pas encore dans le total consommé.
export function computeItemAttachements(item, attachments) {
  const budgetHT = computeItemBudget(item)
  return attachments.map((att) => {
    const pourcentage = item.percentages?.[att.id] || 0
    const realise = item.realise?.[att.id] || false
    const montantPotentiel = pourcentage * budgetHT
    return {
      ...att,
      pourcentage,
      realise,
      montantHT: realise ? montantPotentiel : 0,
      montantPotentiel,
    }
  })
}

// Totaux pour UN item (poste)
export function computeItemSummary(item, attachments) {
  const budgetHT = computeItemBudget(item)
  const rows = computeItemAttachements(item, attachments)
  const totalHT = rows.reduce((sum, r) => sum + r.montantHT, 0)
  const resteHT = Math.max(budgetHT - totalHT, 0)
  const avancement = budgetHT > 0 ? Math.min(totalHT / budgetHT, 1) : 0
  return { budgetHT, totalHT, resteHT, avancement, rows }
}

export function getProgressLevel(avancement) {
  if (avancement >= 1) return 'done'
  if (avancement >= 0.4) return 'overdue'
  return 'todo'
}

export function computeItemAlerts(item, summary) {
  const alerts = []
  if (summary.avancement >= 1) alerts.push({ label: 'Terminé', level: 'success' })
  else if (summary.avancement === 0) alerts.push({ label: 'Non démarré', level: 'default' })
  if (!item.unitCost) alerts.push({ label: 'PU manquant', level: 'danger' })
  return alerts
}

// Totaux globaux (pour les graphiques)
export function computeGlobalStats(items, attachments) {
  let budgetTotal = 0
  let consomme = 0
  items.forEach((item) => {
    const summary = computeItemSummary(item, attachments)
    budgetTotal += summary.budgetHT
    consomme += summary.totalHT
  })
  const restant = Math.max(budgetTotal - consomme, 0)
  const avancementGlobal = budgetTotal > 0 ? consomme / budgetTotal : 0
  return {
    budgetTotal,
    consomme,
    restant,
    avancementGlobal,
    nbItems: items.length,
    nbAttachements: attachments.length,
  }
}

// Montant HT total (tous items confondus) pour chaque attachement — pour le line chart
// Ne compte que les montants des attachements marqués "réalisé".
export function computeAttachementTotals(items, attachments) {
  return attachments.map((att) => {
    const total = items.reduce((sum, item) => {
      const budgetHT = computeItemBudget(item)
      const pourcentage = item.percentages?.[att.id] || 0
      const realise = item.realise?.[att.id] || false
      return sum + (realise ? pourcentage * budgetHT : 0)
    }, 0)
    return { ...att, montantHT: total }
  })
}

export function groupByRubrique(items) {
  const groups = {}
  items.forEach((item) => {
    const key = item.rubrique || 'Autre'
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  return groups
}
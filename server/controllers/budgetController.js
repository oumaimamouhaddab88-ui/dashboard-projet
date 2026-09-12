import Bac from "../models/Bac.js";
import Poste from "../models/Poste.js";
import Attachement from "../models/Attachement.js";
import { computePosteSummary, computeAttachementAmounts } from "../utils/budgetCalculations.js";

// GET /api/budget/bacs?projectId=...
// ⚠️ MIGRATION : filtré par projectId. Sans projectId, renvoie un tableau vide
// plutôt que TOUS les Bacs de TOUS les projets (comportement précédent).
export async function listBacs(req, res) {
  const { projectId } = req.query;
  if (!projectId) {
    return res.status(400).json({ message: "projectId requis" });
  }
  const bacs = await Bac.find({ projectId }).sort({ nom: 1 });
  res.json(bacs);
}

// POST /api/budget/bacs — création d'un Bac pour un projet donné
// Body attendu : { projectId, nom }
// Utilisé automatiquement à la création d'un nouveau projet (voir
// projectController.createProject) pour que le module Budget fonctionne
// immédiatement, comme pour le projet Bac historique.
export async function createBac(req, res) {
  const { projectId, nom } = req.body;
  if (!projectId) {
    return res.status(400).json({ message: "projectId requis" });
  }
  if (!nom || !nom.trim()) {
    return res.status(400).json({ message: "Le nom du Bac est requis" });
  }

  const bac = await Bac.create({ projectId, nom: nom.trim() });
  res.status(201).json(bac);
}

// Utilitaire interne (pas de route dédiée) : crée un Bac "Bac" par défaut pour
// un projet fraîchement créé, avec 0 poste — appelé depuis projectController.
export async function ensureDefaultBacForProject(projectId, nom = "Bac") {
  let bac = await Bac.findOne({ projectId });
  if (!bac) {
    bac = await Bac.create({ projectId, nom });
  }
  return bac;
}

// GET /api/budget/bacs/:bacId/postes?withAttachements=true
export async function listPostesForBac(req, res) {
  const { bacId } = req.params;
  const postes = await Poste.find({ bacId }).sort({ numero: 1 });

  if (req.query.withAttachements !== "true") {
    return res.json({ postes });
  }

  const posteIds = postes.map((p) => p._id);
  const attachements = await Attachement.find({ posteId: { $in: posteIds } }).sort({ numero: 1 });

  const attachementsByPoste = {};
  attachements.forEach((a) => {
    const key = a.posteId.toString();
    if (!attachementsByPoste[key]) attachementsByPoste[key] = [];
    attachementsByPoste[key].push(a);
  });

  res.json({ postes, attachementsByPoste });
}

// GET /api/budget/postes/:posteId
export async function getPoste(req, res) {
  const poste = await Poste.findById(req.params.posteId);
  if (!poste) return res.status(404).json({ message: "Poste introuvable" });

  const attachements = await Attachement.find({ posteId: poste._id }).sort({ numero: 1 });
  const summary = computePosteSummary(poste, attachements);

  res.json({ poste, attachements, summary });
}

// POST /api/budget/bacs/:bacId/postes — création d'un nouveau poste dans un Bac
export async function createPoste(req, res) {
  const { bacId } = req.params;
  const bac = await Bac.findById(bacId);
  if (!bac) return res.status(404).json({ message: "Bac introuvable" });

  const { designation, rubrique, unite, quantite, prixUnitaire } = req.body;

  if (!designation || !unite || quantite == null || prixUnitaire == null) {
    return res.status(400).json({ message: "Désignation, unité, quantité et PU sont requis" });
  }

  const lastPoste = await Poste.findOne({ bacId }).sort({ numero: -1 });
  const numero = lastPoste ? lastPoste.numero + 1 : 1;

  const poste = await Poste.create({
    bacId,
    numero,
    designation,
    rubrique: rubrique || "",
    unite,
    quantite: Number(quantite),
    prixUnitaire: Number(prixUnitaire),
  });

  res.status(201).json(poste);
}

// PUT /api/budget/postes/:posteId  — édition des infos de base d'un poste
export async function updatePoste(req, res) {
  const poste = await Poste.findById(req.params.posteId);
  if (!poste) return res.status(404).json({ message: "Poste introuvable" });

  const { designation, rubrique, unite, quantite, prixUnitaire } = req.body;

  if (designation != null) poste.designation = designation;
  if (rubrique != null) poste.rubrique = rubrique;
  if (unite != null) poste.unite = unite;
  if (quantite != null && quantite !== "") poste.quantite = Number(quantite);
  if (prixUnitaire != null && prixUnitaire !== "") poste.prixUnitaire = Number(prixUnitaire);

  await poste.save();
  res.json(poste);
}

// DELETE /api/budget/postes/:posteId — supprime le poste et tous ses attachements
export async function deletePoste(req, res) {
  const poste = await Poste.findByIdAndDelete(req.params.posteId);
  if (!poste) return res.status(404).json({ message: "Poste introuvable" });

  await Attachement.deleteMany({ posteId: poste._id });

  res.json({ message: "Poste supprimé" });
}

// ------------------------------------------------------------------------------------
// FLUX "PAR ATTACHEMENT" (inchangé) : un Attachement = une situation qui couvre TOUS les
// postes du Bac en une seule saisie. Ces routes prennent déjà un bacId dans l'URL, donc
// elles héritent naturellement du scope projet via le Bac (pas de changement nécessaire
// au-delà de ce que fait déjà listPostesForBac / getBudgetData en amont).
// ------------------------------------------------------------------------------------

export async function getAttachementBatch(req, res) {
  const { bacId, numero } = req.params;

  const bac = await Bac.findById(bacId);
  if (!bac) return res.status(404).json({ message: "Bac introuvable" });

  const postes = await Poste.find({ bacId }).sort({ numero: 1 });
  const posteIds = postes.map((p) => p._id);
  const attachements = await Attachement.find({
    posteId: { $in: posteIds },
    numero: Number(numero),
  });

  const byPoste = {};
  attachements.forEach((a) => {
    byPoste[a.posteId.toString()] = a;
  });

  const rows = postes.map((p) => {
    const a = byPoste[p._id.toString()];
    return {
      posteId: p._id,
      designation: p.designation,
      rubrique: p.rubrique,
      budgetHT: (p.quantite || 0) * (p.prixUnitaire || 0),
      pourcentage: a?.pourcentage ?? null,
      montantHTManuel: a?.montantHTManuel ?? null,
      statut: a?.statut || "en_attente",
      attachementId: a?._id ?? null,
    };
  });

  const sample = attachements[0];

  res.json({
    numero: Number(numero),
    date: sample?.date || null,
    observation: sample?.observation || "",
    rows,
  });
}

export async function saveAttachementBatch(req, res) {
  const { bacId, numero } = req.params;
  const { date, observation, rows } = req.body;

  if (!date || !Array.isArray(rows)) {
    return res.status(400).json({ message: "Date et lignes (rows) sont requis" });
  }

  const postes = await Poste.find({ bacId }, "_id");
  const validPosteIds = new Set(postes.map((p) => p._id.toString()));

  const saved = [];
  for (const row of rows) {
    if (!validPosteIds.has(String(row.posteId))) continue;

    const pourcentage = row.pourcentage != null && row.pourcentage !== "" ? Number(row.pourcentage) : null;
    const montantHTManuel =
      row.montantHTManuel != null && row.montantHTManuel !== "" ? Number(row.montantHTManuel) : null;

    const attachement = await Attachement.findOneAndUpdate(
      { posteId: row.posteId, numero: Number(numero) },
      {
        posteId: row.posteId,
        numero: Number(numero),
        pourcentage,
        montantHTManuel,
        date,
        statut: row.statut === "realise" ? "realise" : "en_attente",
        observation: observation || "",
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    saved.push(attachement);
  }

  res.json({ numero: Number(numero), count: saved.length, attachements: saved });
}

export async function deleteAttachementBatch(req, res) {
  const { bacId, numero } = req.params;
  const postes = await Poste.find({ bacId }, "_id");
  const posteIds = postes.map((p) => p._id);

  await Attachement.deleteMany({ posteId: { $in: posteIds }, numero: Number(numero) });
  res.json({ message: `Attachement ${numero} supprimé pour tous les postes` });
}

// ------------------------------------------------------------------------------------
// Anciens endpoints "par poste" — conservés uniquement pour l'édition fine d'une ligne
// précise (ex : joindre un document/photo à un poste donné dans un attachement existant).
// ------------------------------------------------------------------------------------

export async function createAttachement(req, res) {
  const { posteId } = req.params;
  const poste = await Poste.findById(posteId);
  if (!poste) return res.status(404).json({ message: "Poste introuvable" });

  const { numero, pourcentage, montantHTManuel, date, statut, observation } = req.body;

  const attachement = await Attachement.create({
    posteId,
    numero,
    pourcentage: pourcentage != null && pourcentage !== "" ? Number(pourcentage) : null,
    montantHTManuel: montantHTManuel != null && montantHTManuel !== "" ? Number(montantHTManuel) : null,
    date,
    statut: statut || "realise",
    observation: observation || "",
    document: req.files?.document?.[0] ? `/uploads/budget/${req.files.document[0].filename}` : "",
    photos: req.files?.photos ? req.files.photos.map((f) => `/uploads/budget/${f.filename}`) : [],
  });

  const amounts = computeAttachementAmounts(poste, attachement);
  res.status(201).json({ ...attachement.toObject(), ...amounts });
}

export async function updateAttachement(req, res) {
  const attachement = await Attachement.findById(req.params.id);
  if (!attachement) return res.status(404).json({ message: "Attachement introuvable" });

  const { pourcentage, montantHTManuel, date, statut, observation } = req.body;

  if (pourcentage != null) attachement.pourcentage = pourcentage !== "" ? Number(pourcentage) : null;
  if (montantHTManuel != null) attachement.montantHTManuel = montantHTManuel !== "" ? Number(montantHTManuel) : null;
  if (date) attachement.date = date;
  if (statut) attachement.statut = statut;
  if (observation != null) attachement.observation = observation;
  if (req.files?.document?.[0]) attachement.document = `/uploads/budget/${req.files.document[0].filename}`;

  await attachement.save();

  const poste = await Poste.findById(attachement.posteId);
  const amounts = computeAttachementAmounts(poste, attachement);
  res.json({ ...attachement.toObject(), ...amounts });
}

export async function deleteAttachement(req, res) {
  const attachement = await Attachement.findByIdAndDelete(req.params.id);
  if (!attachement) return res.status(404).json({ message: "Attachement introuvable" });
  res.json({ message: "Attachement supprimé" });
}

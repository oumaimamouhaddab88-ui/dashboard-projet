import Team from "../models/Team.js";

// GET /api/team?projectId=...
// ⚠️ MIGRATION : filtré par projectId, requis.
export const getTeamMembers = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ message: "projectId requis" });
    }
    const members = await Team.find({ projectId }).sort({ nom: 1 });
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du chargement de l'équipe", error: error.message });
  }
};

// POST /api/team — projectId requis dans le body
export const createTeamMember = async (req, res) => {
  try {
    const { projectId, nom, poste, email, telephone, dateEntree } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "projectId requis" });
    }

    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: "Le nom est obligatoire" });
    }

    const member = new Team({
      projectId,
      nom,
      poste,
      email,
      telephone,
      dateEntree: dateEntree || null,
    });

    const saved = await member.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du membre", error: error.message });
  }
};

// PUT /api/team/:id — projectId volontairement non modifiable ici (on ne
// déplace jamais un membre d'un projet à un autre par cette route).
export const updateTeamMember = async (req, res) => {
  try {
    const { nom, poste, email, telephone, dateEntree } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: "Le nom est obligatoire" });
    }

    const updated = await Team.findByIdAndUpdate(
      req.params.id,
      { nom, poste, email, telephone, dateEntree: dateEntree || null },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Membre introuvable" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du membre", error: error.message });
  }
};

// DELETE /api/team/:id
export const deleteTeamMember = async (req, res) => {
  try {
    const deleted = await Team.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Membre introuvable" });
    }

    res.json({ message: "Membre supprimé", _id: deleted._id });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression du membre", error: error.message });
  }
};

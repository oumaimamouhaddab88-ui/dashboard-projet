import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import Report from '../models/Report.js';
import Bac from '../models/Bac.js';
import Poste from '../models/Poste.js';
import Attachement from '../models/Attachement.js';
import { ensureDefaultBacForProject } from './budgetController.js';

// GET /api/projects
// Retourne tous les projets, le projet "Bac" (isDefault) en premier
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ isDefault: -1, createdAt: 1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des projets', error: err.message });
  }
};

// GET /api/projects/:id
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// POST /api/projects
// Crée un nouveau projet VIDE (aucune Task/Team/Report liée -> reset à 0 par
// construction, puisque tous les modules filtrent par projectId), et crée
// automatiquement un Bac par défaut pour que le module Budget soit
// immédiatement utilisable (même comportement que le projet "Bac" historique).
export const createProject = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Le nom du projet est requis' });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description || '',
      color: color || '#00954a',
      isDefault: false,
      status: 'actif',
    });

    // Le nouveau projet démarre avec un Bac vide (0 poste), sans copier quoi
    // que ce soit du projet BAC historique.
    await ensureDefaultBacForProject(project._id, 'Bac');

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la création du projet', error: err.message });
  }
};

// PUT /api/projects/:id
export const updateProject = async (req, res) => {
  try {
    const { name, description, color, status } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (color !== undefined) project.color = color;
    if (status !== undefined) project.status = status;

    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du projet', error: err.message });
  }
};

// DELETE /api/projects/:id
// Le projet "Bac" (isDefault) ne peut jamais être supprimé.
// ⚠️ Suppression EN CASCADE : toutes les données rattachées à ce projet
// (Tasks, Team, Reports, Bacs + leurs Postes + leurs Attachements) sont
// supprimées avec lui. Ne touche à AUCUNE donnée d'un autre projet — chaque
// requête est filtrée par projectId, et les Postes/Attachements ne sont
// supprimés que via les bacId qui appartiennent à CE projet précisément.
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });

    if (project.isDefault) {
      return res.status(403).json({ message: 'Le projet Bac ne peut pas être supprimé' });
    }

    const projectId = project._id;

    const bacs = await Bac.find({ projectId }, '_id');
    const bacIds = bacs.map((b) => b._id);

    const postes = await Poste.find({ bacId: { $in: bacIds } }, '_id');
    const posteIds = postes.map((p) => p._id);

    await Attachement.deleteMany({ posteId: { $in: posteIds } });
    await Poste.deleteMany({ bacId: { $in: bacIds } });
    await Bac.deleteMany({ projectId });
    await Task.deleteMany({ projectId });
    await Team.deleteMany({ projectId });
    await Report.deleteMany({ projectId });

    await project.deleteOne();
    res.json({ message: 'Projet et toutes ses données supprimés' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression du projet', error: err.message });
  }
};

// GET /api/projects/ensure-default
// Vérifie qu'un projet "Bac" existe, le crée sinon.
// ⚠️ En usage normal, ce projet doit déjà exister grâce à
// scripts/migrateToProjects.js exécuté une fois avant déploiement — cette
// route reste une sécurité au cas où (ex : nouvel environnement).
export const ensureDefaultProject = async (req, res) => {
  try {
    let bacProject = await Project.findOne({ isDefault: true });

    if (!bacProject) {
      bacProject = await Project.create({
        name: 'Bac',
        description: 'Projet par défaut regroupant les données existantes',
        isDefault: true,
        status: 'actif',
      });
    }

    if (res) return res.json(bacProject);
    return bacProject;
  } catch (err) {
    if (res) return res.status(500).json({ message: 'Erreur serveur', error: err.message });
    throw err;
  }
};

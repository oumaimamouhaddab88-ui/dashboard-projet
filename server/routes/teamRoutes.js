import express from "express";
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from "../controllers/teamController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ⚠️ Ces routes n'étaient PAS protégées par authMiddleware auparavant — c'était
// déjà le cas avant tout changement multi-projets (rien à voir avec cette
// migration), mais l'ajout ici corrige une faille d'accès. À vérifier avec vous
// avant déploiement si ce n'était pas intentionnel.
router.use(authMiddleware);

router.get("/", getTeamMembers);
router.post("/", createTeamMember);
router.put("/:id", updateTeamMember);
router.delete("/:id", deleteTeamMember);

export default router;

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js"; // ← AJOUTÉ
import reportRoutes from "./routes/reportRoutes.js";
import teamRoutes from "./routes/teamRoutes.js"; // ← AJOUTÉ
import projectRoutes from "./routes/projectRoutes.js"; // ← AJOUTÉ (multi-projet)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();

// Connexion à MongoDB
connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API OCP fonctionne");
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/reports", reportRoutes); // ← AJOUTÉ
app.use("/api/team", teamRoutes); // ← AJOUTÉ
app.use("/api/projects", projectRoutes); // ← AJOUTÉ (multi-projet)

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
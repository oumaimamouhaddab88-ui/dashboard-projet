import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    path: { type: String, required: true },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    rubrique: { type: String, required: true, trim: true },
    task: { type: String, required: true, trim: true },
    responsable: { type: String, trim: true },
    dateDebut: { type: Date },
    dateFin: { type: Date },
    dureeV0: { type: Number },
    dureeReel: { type: Number },
    dateFinReelle: { type: Date },
    ponderation: { type: Number },
    progress: { type: Number, enum: [0, 1], default: 0 },
    documents: { type: [documentSchema], default: [] },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);

export default Task;
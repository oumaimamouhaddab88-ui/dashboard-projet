import mongoose from "mongoose";

// ⚠️ MIGRATION : ajout de `projectId`. Un rapport appartient désormais à un
// projet précis.
const reportSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    file: {
      filename: String,
      originalName: String,
      mimetype: String,
      path: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);

import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // true uniquement pour le projet "Bac" qui contient les données historiques
    isDefault: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['actif', 'termine', 'suspendu'],
      default: 'actif',
    },
    color: {
      type: String,
      default: '#00954a',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const Project = mongoose.model('Project', projectSchema);

export default Project;
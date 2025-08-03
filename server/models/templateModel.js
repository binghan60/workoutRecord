import mongoose from 'mongoose'

const setInTemplateSchema = new mongoose.Schema(
  {
    reps: { type: Number, required: true },
    weight: { type: Number, required: true },
  },
  { _id: false },
)

const exerciseInTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sets: [setInTemplateSchema],
    restTime: { type: Number, default: 60 },
  },
  { _id: false },
)

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  exercises: [exerciseInTemplateSchema],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  autoSync: {
    type: Boolean,
    default: false,
  },
})

// Prevent a user from having two templates with the same name
templateSchema.index({ name: 1, user: 1 }, { unique: true })

const Template = mongoose.model('Template', templateSchema)
export default Template

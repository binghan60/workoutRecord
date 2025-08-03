import mongoose from 'mongoose'

const setSchema = new mongoose.Schema(
  {
    reps: { type: Number, required: true },
    weight: { type: Number, required: true },
    isCompleted: { type: Boolean, default: true },
    actualRestTime: { type: Number },
  },
  { _id: false },
)

const exerciseInWorkoutSchema = new mongoose.Schema(
  {
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    name: { type: String, required: true },
    restTime: { type: Number },
    sets: [setSchema],
  },
  { _id: false },
)

const workoutSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: false,
    },
    exercises: [exerciseInWorkoutSchema],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

const Workout = mongoose.model('Workout', workoutSchema)
export default Workout

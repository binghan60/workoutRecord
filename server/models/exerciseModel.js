import mongoose from 'mongoose'

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  muscleGroup: {
    type: String,
    required: true,
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Not required for default exercises
  },
})

// Compound index to prevent a user from creating a custom exercise with a name that already exists for them
exerciseSchema.index({ name: 1, user: 1 }, { unique: true, partialFilterExpression: { isCustom: true } })

// Middleware to clean up templates when a custom exercise is deleted
exerciseSchema.pre('findOneAndDelete', async function (next) {
  try {
    const docToDelete = await this.model.findOne(this.getFilter())
    if (docToDelete && docToDelete.isCustom) {
      const Template = mongoose.model('Template')
      const templatesToUpdate = await Template.find({
        user: docToDelete.user,
        'exercises.name': docToDelete.name,
      })

      for (const template of templatesToUpdate) {
        template.exercises = template.exercises.filter((ex) => ex.name !== docToDelete.name)
        if (template.exercises.length === 0) {
          await Template.findByIdAndDelete(template._id)
        } else {
          await template.save()
        }
      }
    }
    next()
  } catch (error) {
    next(error)
  }
})

const Exercise = mongoose.model('Exercise', exerciseSchema)
export default Exercise

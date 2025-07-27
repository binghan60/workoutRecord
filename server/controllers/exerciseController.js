import Exercise from '../models/exerciseModel.js'

// Get all exercises (both default and user-created)
export const getAllExercises = async (req, res) => {
  try {
    const exercises = await Exercise.find({
      $or: [{ isCustom: false }, { user: req.user.id }],
    })
    res.status(200).json(exercises)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Add a new custom exercise for the logged-in user
export const addExercise = async (req, res) => {
  try {
    const { name, muscleGroup } = req.body
    const newExercise = new Exercise({
      name,
      muscleGroup,
      isCustom: true,
      user: req.user.id,
    })
    await newExercise.save()
    res.status(201).json(newExercise)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Delete a custom exercise, ensuring it belongs to the logged-in user
export const deleteExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
      isCustom: true,
    })

    if (!exercise) {
      return res.status(404).json({ message: 'Custom exercise not found or you do not have permission to delete it.' })
    }

    res.status(200).json({ message: 'Exercise deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

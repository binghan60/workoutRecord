import Workout from '../models/workoutModel.js'

// Get all workouts for the logged-in user (for chart data)
export const getAllWorkouts = async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user.id }).sort({ createdAt: -1 })
    res.status(200).json(workouts)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Get paginated workouts for the logged-in user (for history view)
export const getPaginatedWorkouts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skip = (page - 1) * limit

    const workouts = await Workout.find({ user: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit)
    const totalWorkouts = await Workout.countDocuments({ user: req.user.id })

    res.status(200).json({
      data: workouts,
      currentPage: page,
      totalPages: Math.ceil(totalWorkouts / limit),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Add a new workout for the logged-in user
export const addWorkout = async (req, res) => {
  try {
    const newWorkout = new Workout({
      ...req.body,
      user: req.user.id,
    })
    await newWorkout.save()
    res.status(201).json(newWorkout)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Delete a workout, ensuring it belongs to the logged-in user
export const deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found or user not authorized' })
    }
    res.status(200).json({ message: 'Workout deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

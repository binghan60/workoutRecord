import Workout from '../models/workoutModel.js'
import Template from '../models/templateModel.js'

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

    // --- Auto-sync logic starts here ---
    const { templateId, exercises: workoutExercises } = newWorkout
    if (templateId) {
      try {
        const template = await Template.findById(templateId)

        if (template && template.autoSync) {
          // Create a map of the last set for each exercise in the workout
          const workoutExerciseMap = new Map()
          workoutExercises.forEach((workoutExercise) => {
            // We only care about sets that were actually completed
            const completedSets = workoutExercise.sets.filter(s => s.isCompleted)
            if (completedSets.length > 0) {
              workoutExerciseMap.set(workoutExercise.name, completedSets.map(s => ({ reps: s.reps, weight: s.weight })))
            }
          })

          // Update template exercises with the latest workout data
          let isUpdated = false
          template.exercises.forEach((templateExercise) => {
            if (workoutExerciseMap.has(templateExercise.name)) {
              const newSets = workoutExerciseMap.get(templateExercise.name)
              // A simple JSON.stringify is a decent way to check for deep equality of the sets array.
              if (JSON.stringify(templateExercise.sets) !== JSON.stringify(newSets)) {
                templateExercise.sets = newSets
                isUpdated = true
              }
            }
          })

          if (isUpdated) {
            await template.save()
          }
        }
      } catch (syncError) {
        // Log the error but don't fail the main workout creation response
        console.error('Error during template auto-sync:', syncError)
      }
    }
    // --- Auto-sync logic ends here ---

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

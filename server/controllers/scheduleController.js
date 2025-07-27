import Schedule from '../models/scheduleModel.js'

// Get the schedule for the logged-in user
export const getSchedule = async (req, res) => {
  try {
    let schedule = await Schedule.findOne({ user: req.user.id }).populate('monday tuesday wednesday thursday friday saturday sunday')
    if (!schedule) {
      // If no schedule, create a default one for the user
      schedule = await Schedule.create({ user: req.user.id })
    }
    res.status(200).json(schedule)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Update the schedule for the logged-in user
export const updateSchedule = async (req, res) => {
  try {
    // Explicitly build the update object to ensure only valid fields are set
    const updateData = {}
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

    daysOfWeek.forEach((day) => {
      // Only include days that are present in the request body
      if (req.body[day] !== undefined) {
        updateData[day] = req.body[day]
      }
    })

    const schedule = await Schedule.findOneAndUpdate({ user: req.user.id }, { $set: updateData }, { new: true, upsert: true }).populate('monday tuesday wednesday thursday friday saturday sunday')

    res.status(200).json(schedule)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

import BodyMetric from '../models/bodyMetricModel.js'

// Get all records for the logged-in user
export const getAllRecords = async (req, res) => {
  try {
    const records = await BodyMetric.find({ user: req.user.id }).sort({ date: -1 })
    res.status(200).json(records)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Add or update a record for a specific date for the logged-in user
export const addOrUpdateRecord = async (req, res) => {
  try {
    const { date, ...metrics } = req.body
    const userId = req.user.id

    // Find a record for the given date and user
    let record = await BodyMetric.findOne({ date: new Date(date).setHours(0, 0, 0, 0), user: userId })

    if (record) {
      // If record exists, update it with new non-null values
      Object.keys(metrics).forEach((key) => {
        if (metrics[key] !== null && metrics[key] !== undefined) {
          record[key] = metrics[key]
        }
      })
      await record.save()
      res.status(200).json(record)
    } else {
      // If record doesn't exist, create a new one
      const newRecord = new BodyMetric({
        ...metrics,
        date,
        user: userId,
      })
      await newRecord.save()
      res.status(201).json(newRecord)
    }
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Delete a record by its ID, ensuring it belongs to the logged-in user
export const deleteRecord = async (req, res) => {
  try {
    const record = await BodyMetric.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!record) {
      return res.status(404).json({ message: 'Record not found or user not authorized' })
    }
    res.status(200).json({ message: 'Record deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

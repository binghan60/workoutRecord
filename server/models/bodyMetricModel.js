import mongoose from 'mongoose'

const bodyMetricSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  weight: { type: Number },
  bodyFat: { type: Number },
  chest: { type: Number },
  waist: { type: Number },
  shoulder: { type: Number },
  arm: { type: Number },
  thigh: { type: Number },
})

// Create a compound index to ensure a user can only have one record per day
bodyMetricSchema.index({ user: 1, date: 1 }, { unique: true })

const BodyMetric = mongoose.model('BodyMetric', bodyMetricSchema)
export default BodyMetric

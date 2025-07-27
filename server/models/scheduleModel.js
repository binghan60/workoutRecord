import mongoose from 'mongoose'

const scheduleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  monday: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
  tuesday: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
  wednesday: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
  thursday: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
  friday: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
  saturday: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
  sunday: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
})

const Schedule = mongoose.model('Schedule', scheduleSchema)
export default Schedule

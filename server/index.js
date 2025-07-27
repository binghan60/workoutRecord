import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'

// Import Routes
import exerciseRoutes from './routes/exerciseRoutes.js'
import templateRoutes from './routes/templateRoutes.js'
import workoutRoutes from './routes/workoutRoutes.js'
import bodyMetricRoutes from './routes/bodyMetricRoutes.js'
import scheduleRoutes from './routes/scheduleRoutes.js'
import userRoutes from './routes/userRoutes.js'

// Import Models for seeding
import Exercise from './models/exerciseModel.js'

const app = express()

// Middlewares
app.use(cors())
app.use(express.json()) // To parse JSON bodies

// API Routes
app.use('/api/exercises', exerciseRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/workouts', workoutRoutes)
app.use('/api/body-metrics', bodyMetricRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/users', userRoutes)

// Default Route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Workout API!' })
})

// --- Database Connection and Server Start ---
const port = process.env.PORT || 3000

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ 資料庫連線成功')
    app.listen(port, () => {
      console.log(`✅ Node Server running at http://localhost:${port}`)
      seedDatabase() // Seed database after connection is successful
    })
  })
  .catch((err) => {
    console.error('❌ 資料庫連線失敗', err)
  })

// --- Data Seeding ---
const seedDatabase = async () => {
  try {
    const exerciseCount = await Exercise.countDocuments()
    if (exerciseCount === 0) {
      console.log('No exercises found, seeding default exercises...')
      const defaultExercises = [
        { name: '臥推 (Bench Press)', muscleGroup: '胸部', isCustom: false },
        { name: '深蹲 (Squat)', muscleGroup: '腿部', isCustom: false },
        { name: '硬舉 (Deadlift)', muscleGroup: '背部', isCustom: false },
        { name: '肩推 (Overhead Press)', muscleGroup: '肩部', isCustom: false },
        { name: '引體向上 (Pull-up)', muscleGroup: '背部', isCustom: false },
        { name: '划船 (Row)', muscleGroup: '背部', isCustom: false },
        { name: '二頭彎舉 (Bicep Curl)', muscleGroup: '手臂', isCustom: false },
        { name: '三頭下壓 (Tricep Pushdown)', muscleGroup: '手臂', isCustom: false },
      ]
      await Exercise.insertMany(defaultExercises)
      console.log('🌱 Default exercises seeded successfully.')
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error)
  }
}

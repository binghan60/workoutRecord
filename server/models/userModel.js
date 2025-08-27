import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
  },
  displayName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    minlength: 6,
    select: false, // Do not show password on query by default
    required: function () {
      // 密碼僅在本地帳號或同時支援本地與 Google 時必填
      return this.provider === 'local' || this.provider === 'both'
    },
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'both'],
    default: 'local',
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  picture: {
    type: String,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
})

// Hash password before saving（若存在且被修改）
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

const User = mongoose.model('User', userSchema)

export default User

import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
}

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id)

  // Remove password from output
  user.password = undefined

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  })
}

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Please provide username, email, and password' })
    }

    const newUser = await User.create({
      username,
      email,
      password,
    })

    createSendToken(newUser, 201, res)
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Please provide email and password' })
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password')

    if (!user || !(await user.comparePassword(password, user.password))) {
      return res.status(401).json({ status: 'fail', message: 'Incorrect email or password' })
    }

    // 3) If everything ok, send token to client
    createSendToken(user, 200, res)
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message })
  }
}

export const getMe = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  })
}

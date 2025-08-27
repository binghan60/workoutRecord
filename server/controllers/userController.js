import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'
import { OAuth2Client } from 'google-auth-library'

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
      displayName: username,
      email,
      password,
      provider: 'local',
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

export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body
    if (!idToken) return res.status(400).json({ status: 'fail', message: 'Missing Google id_token' })

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()

    const { sub: googleId, email, email_verified: emailVerified, name, picture } = payload || {}

    if (!email || !googleId) {
      return res.status(400).json({ status: 'fail', message: 'Invalid Google token payload' })
    }
    if (!emailVerified) {
      return res.status(401).json({ status: 'fail', message: 'Google email is not verified' })
    }

    // Find by googleId first
    let user = await User.findOne({ googleId })

    if (!user) {
      // If not found, try by email (allow auto-linking)
      user = await User.findOne({ email })
      if (user) {
        // Auto-bind Google to existing account
        if (!user.googleId) user.googleId = googleId
        // Upgrade provider
        user.provider = user.provider === 'local' ? 'both' : 'google'
        if (!user.username) user.username = generateUsernameFromEmail(email)
        if (!user.displayName) user.displayName = name || user.username
        if (!user.picture && picture) user.picture = picture
        user.emailVerified = true
        await user.save()
      } else {
        // Create new user (Google-only)
        const username = await generateUniqueUsername(name || email)
        user = await User.create({
          username,
          displayName: name || username,
          email,
          provider: 'google',
          googleId,
          picture,
          emailVerified: true,
        })
      }
    }

    createSendToken(user, 200, res)
  } catch (error) {
    console.error('Google login error:', error)
    res.status(401).json({ status: 'fail', message: 'Google authentication failed' })
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

// Helpers
function normalizeUsername(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
}

function generateUsernameFromEmail(email) {
  const local = (email || '').split('@')[0]
  return normalizeUsername(local)
}

async function generateUniqueUsername(seed) {
  let base = normalizeUsername(seed)
  if (!base) base = 'user'
  let candidate = base
  let suffix = 0
  // try until unique
  while (await User.exists({ username: candidate })) {
    suffix += 1
    candidate = `${base}-${suffix}`
  }
  return candidate
}

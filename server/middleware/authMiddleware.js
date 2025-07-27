import jwt from 'jsonwebtoken'
import { promisify } from 'util'
import User from '../models/userModel.js'

const authMiddleware = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({ status: 'fail', message: 'You are not logged in! Please log in to get access.' })
    }

    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id)
    if (!currentUser) {
      return res.status(401).json({ status: 'fail', message: 'The user belonging to this token does no longer exist.' })
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser
    next()
  } catch (error) {
    res.status(401).json({ status: 'fail', message: 'Invalid token. Please log in again.' })
  }
}

export default authMiddleware

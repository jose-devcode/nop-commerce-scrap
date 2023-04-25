const User = require('../models/User')
const jwt = require('jsonwebtoken')
const { StatusCodes } = require('http-status-codes')
const { UnauthenticatedError } = require('../errors')

const authenticateUser = async (req, res, next) => {
  // check header
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer')) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: 'Error, Invalid credentials' })
    return
  }
  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    // attach the user to the job routes

    const user = await User.findOne({ _id: payload.userId })

    const isTokenCorrect = await user.compareToken(token)
    if (!isTokenCorrect) {
      res.status(StatusCodes.UNAUTHORIZED).json({ msg: 'Error, expired token' })
      return
    }

    req.user = { userId: payload.userId }
    next()
  } catch (error) {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: 'Error, Invalid credentials' })
    return
  }
}

module.exports = { authenticateUser }

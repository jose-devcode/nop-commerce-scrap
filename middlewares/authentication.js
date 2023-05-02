const User = require('../models/User')
const jwt = require('jsonwebtoken')
const { StatusCodes } = require('http-status-codes')
const CustomAPIError = require('../errors')

const authenticateUser = async (req, res, next) => {
  // check header
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer')) {
    throw new CustomAPIError.UnauthenticatedError('Authentication Invalid')
  }
  const token = authHeader.split(' ')[1]

  const payload = jwt.verify(token, process.env.JWT_SECRET)
  // attach the user to the job routes

  const user = await User.findOne({ _id: payload.userId })

  const isTokenCorrect = await user.compareToken(token)
  if (!isTokenCorrect) {
    throw new CustomAPIError.UnauthenticatedError('Authentication Invalid')
  }
  const isVerified = user.isVerified
  if (!isVerified) {
    throw new CustomAPIError.UnauthenticatedError('Account not verified')
  }

  req.user = { userId: payload.userId }
  next()
}

module.exports = { authenticateUser }

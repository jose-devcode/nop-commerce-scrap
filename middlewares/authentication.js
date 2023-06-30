const { isTokenValid, attachCookiesToResponse } = require('../utils/jwt')
const CustomError = require('../errors')
const Token = require('../models/Token')

// const User = require('../models/User')
// const jwt = require('jsonwebtoken')
// const { StatusCodes } = require('http-status-codes')

// const authenticateUser = async (req, res, next) => {
//   // check header
//   const authHeader = req.headers.authorization
//   if (!authHeader || !authHeader.startsWith('Bearer')) {
//     throw new CustomAPIError.UnauthenticatedError('Authentication Invalid')
//   }
//   const token = authHeader.split(' ')[1]

//   const payload = jwt.verify(token, process.env.JWT_SECRET)
//   // attach the user to the job routes

//   const user = await User.findOne({ _id: payload.userId })

//   const isTokenCorrect = await user.compareToken(token)
//   if (!isTokenCorrect) {
//     throw new CustomAPIError.UnauthenticatedError('Authentication Invalid')
//   }
//   const isVerified = user.isVerified
//   if (!isVerified) {
//     throw new CustomAPIError.UnauthenticatedError('Account not verified')
//   }

//   req.user = { userId: payload.userId }
//   next()
// }

const authenticateUser = async (req, res, next) => {
  const { refreshToken, accessToken } = req.signedCookies
  // console.log({ msj: 'signed cookies', cookies: req.signedCookies })
  try {
    if (accessToken) {
      // console.log('here')
      const payload = isTokenValid(accessToken)
      req.user = payload.user
      return next()
    }

    const payload = isTokenValid(refreshToken)

    const existingToken = await Token.findOne({
      user: payload.user.userId,
      refreshToken: payload.refreshToken,
    })

    if (!existingToken || !existingToken?.isValid) {
      throw new CustomError.UnauthenticatedError('Authentication Invalid')
    }

    attachCookiesToResponse({
      res,
      user: payload.user,
      refreshToken: existingToken.refreshToken,
    })

    req.user = payload.user
    next()
  } catch (error) {
    throw new CustomError.UnauthenticatedError('Authentication Invalid')
  }
}

module.exports = { authenticateUser }

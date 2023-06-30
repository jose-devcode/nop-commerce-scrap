// const User = require('../models/User')
// const { StatusCodes } = require('http-status-codes')
// const {
//   BadRequestError,
//   UnauthenticatedError,
//   CustomAPIError,
// } = require('../errors')

// const register = async (req, res) => {
//   const { name, email, password } = req.body
//   if (!email || !password || !name) {
//     res
//       .status(StatusCodes.BAD_REQUEST)
//       .json({ msg: 'Error, Please provide all values' })
//   }

//   const emailAlreadyExists = await User.findOne({ email })
//   if (emailAlreadyExists) {
//     res.status(StatusCodes.BAD_REQUEST).json({
//       user: 'Error, email already exist',
//     })
//     return
//   }

//   const user = await User.create({ ...req.body })
//   const token = user.createJWT()
//   res.status(StatusCodes.CREATED).json({
//     user: {
//       name: user.name,
//       email: user.email,
//       token,
//     },
//   })
// }

// const login = async (req, res) => {
//   const { email, password } = req.body

//   if (!email || !password) {
//     res
//       .status(StatusCodes.BAD_REQUEST)
//       .json({ msg: 'Error, Please provide both email and password' })
//   }

//   const user = await User.findOne({ email })
//   if (!user) {
//     res
//       .status(StatusCodes.UNAUTHORIZED)
//       .json({ msg: 'Error, Invalid credentials' })
//   }
//   // compare password
//   const isPasswordCorrect = await user.comparePassword(password)
//   if (!isPasswordCorrect) {
//     res
//       .status(StatusCodes.UNAUTHORIZED)
//       .json({ msg: 'Error, Invalid credentials' })
//   }
//   const isVerified = await user.isVerified
//   if (!isVerified) {
//     res.status(StatusCodes.UNAUTHORIZED).json({ msg: 'Please verify account' })
//   }
//   const token = user.createJWT()
//   res.status(StatusCodes.OK).json({
//     user: {
//       name: user.name,
//       email: user.email,
//       token,
//     },
//   })
// }

// const updateUser = async (req, res) => {
//   const { email, name } = req.body
//   if (!email || !name) {
//     throw new BadRequest('Please provide all values')
//   }
//   const user = await User.findOne({ _id: req.user.userId })

//   user.email = email
//   user.name = name

//   await user.save()
//   const token = user.createJWT()
//   res.status(StatusCodes.OK).json({
//     user: {
//       email: user.email,
//       name: user.name,
//       token,
//     },
//   })
// }

// module.exports = {
//   register,
//   login,
//   updateUser,
// }

const User = require('../models/User')
const Token = require('../models/Token')
const axios = require('axios')
const { StatusCodes } = require('http-status-codes')
const CustomError = require('../errors')
const {
  attachCookiesToResponse,
  createTokenUser,

  createHash,
} = require('../utils')
const crypto = require('crypto')
// const { OAuth2Client } = require('google-auth-library')
const https = require('https')
const { log } = require('console')

// // ---------------------------
// // ------- REGISTER ----------
// // ---------------------------

// const register = async (req, res) => {
//   const { email, name, password } = req.body

//   const emailAlreadyExists = await User.findOne({ email })
//   if (emailAlreadyExists) {
//     throw new CustomError.BadRequestError('Email already exists')
//   }

//   // FIRST REGISTRATION WILL BE ADMIN
//   // IF NOT THEN ONLY USER
//   const isFirstAccount = (await User.countDocuments({})) === 0
//   const role = isFirstAccount ? 'admin' : 'user'

//   const verificationToken = crypto.randomBytes(40).toString('hex')
//   const user = await User.create({
//     name,
//     email,
//     password,
//     role,
//     verificationToken,
//   })

//   const origin =
//     process.env.NODE_ENV === 'production'
//       ? 'https://melibster-api.onrender.com'
//       : `http://localhost:3000`

//   await sendVerificationEmail({
//     name: user.name,
//     email: user.email,
//     verificationToken: user.verificationToken,
//     origin,
//   })

//   res.status(StatusCodes.CREATED).json({
//     msg: 'Success! Please check your email to verify account',
//     // SEND BACK VERIFICATION TOKEN ONLY WHILE TESTING IN POSTMAN!!!
//     // verificationToken: user.verificationToken,
//   })
// }

// ---------------------------
// ------ LOGIN  -------------
// ---------------------------

const login = async (req, res) => {
  const { email, password, recaptchaToken } = req.body

  // if (!recaptchaToken) {
  //   throw new CustomError.BadRequestError('Please provide CAPTCHA')
  // }

  const secretKey = process.env.RECAP_SEC_KEY
  const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`

  try {
    const response = await axios.post(verificationUrl)
    const { success } = response.data

    // if (success) {
    if (!email || !password) {
      throw new CustomError.BadRequestError('Please provide email and password')
    }

    const user = await User.findOne({ email })
    if (!user) {
      throw new CustomError.UnauthenticatedError('Invalid Credentials')
    }

    const isPasswordCorrect = await user.comparePassword(password)
    if (!isPasswordCorrect) {
      throw new CustomError.UnauthenticatedError('Invalid Credentials')
    }
    // reCAPTCHA verification succeeded
    // Proceed with username and password verification
    // ...
    const tokenUser = createTokenUser(user)

    //create refresh token
    let refreshToken = ''
    //check for existing token
    const existingToken = await Token.findOne({ user: user._id })

    if (existingToken) {
      const { isValid } = existingToken
      if (!isValid) {
        throw new CustomError.UnauthenticatedError('Invalid Credentials')
      }
      refreshToken = existingToken.refreshToken
      attachCookiesToResponse({ res, user: tokenUser, refreshToken })
      res.status(StatusCodes.OK).json({ user: tokenUser })
      return
    }

    refreshToken = crypto.randomBytes(40).toString('hex')
    const userAgent = req.headers['user-agent']
    const ip = req.ip
    const userToken = { refreshToken, ip, userAgent, user: user._id }
    await Token.create(userToken)

    attachCookiesToResponse({ res, user: tokenUser, userToken })
    res.status(StatusCodes.OK).json({ user: tokenUser })
    // } else {
    //   // reCAPTCHA verification failed
    //   throw new CustomError.BadRequestError('Error: CAPTCHA failure')
    // }
  } catch (error) {
    throw new CustomError.BadRequestError('Error: CAPTCHA failure')
    // Handle error
  }

  // if (!user.isVerified) {
  //   throw new CustomError.UnauthenticatedError('Please verify your e-mail')
  // }

  // const hasSeller = await Seller.findOne({ user: user._id })

  // const sellerData = {}
  // if (hasSeller) {
  //   sellerData.mlUserId = hasSeller.mlUserId
  //   const mlAuthValid = await verifyMlAccessToken(hasSeller)
  //   sellerData.mlAuthValid = mlAuthValid ? true : false
  // }

  // const tokenUser = createTokenUser(user, sellerData)
}

// ---------------------------
// ------- LOGOUT ------------
// ---------------------------

const logout = async (req, res) => {
  await Token.findOneAndDelete({ user: req.user.userId })

  res.cookie('accessToken', 'logout', {
    httpOnly: true,
    expires: new Date(Date.now()),
  })
  res.cookie('refreshToken', 'logout', {
    httpOnly: true,
    expires: new Date(Date.now()),
  })
  res.status(StatusCodes.OK).json({ msg: 'user logged out!' })
}

// ---------------------------
// ------- VERIFY EMAIL ------
// ---------------------------

// const verifyEmail = async (req, res) => {
//   const { verificationToken, email } = req.body
//   const user = await User.findOne({ email })
//   if (!user) {
//     throw new CustomError.UnauthenticatedError('Verification Failed')
//   }
//   if (user.verificationToken !== verificationToken) {
//     throw new CustomError.UnauthenticatedError('Verification Failed')
//   }

//   ;(user.isVerified = true), (user.verified = Date.now())
//   user.verificationToken = ''

//   await user.save()

//   res.status(StatusCodes.OK).json({ msg: 'e-mail verified' })
// }

// ---------------------------
// ------- RESET PASSWORD-----
// ---------------------------

// const forgotPassword = async (req, res) => {
//   const { email } = req.body
//   if (!email) {
//     throw new CustomError.BadRequestError('Please provide valid email')
//   }

//   const user = await User.findOne({ email })
//   if (user) {
//     const passwordToken = crypto.randomBytes(70).toString('hex')
//     // send email
//     const origin =
//       process.env.NODE_ENV === 'production'
//         ? 'https://melibster-api.onrender.com'
//         : `https://localhost:3000`

//     await sendResetPasswordEmail({
//       name: user.name,
//       email: user.email,
//       token: passwordToken,
//       origin,
//     })

//     const tenMinutes = 1000 * 60 * 10
//     const passwordTokenExpirationDate = new Date(Date.now() + tenMinutes)
//     user.passwordToken = createHash(passwordToken)
//     user.passwordTokenExpirationDate = passwordTokenExpirationDate
//     await user.save()
//   }

//   res
//     .status(StatusCodes.OK)
//     .json({ msg: 'Please check your email for reset password link' })
// }

// const resetPassword = async (req, res) => {
//   const { token, email, password } = req.body

//   const emailAlreadyExists = await User.findOne({ email })
//   if (!token || !email || !password) {
//     throw new CustomError.BadRequestError('Please provide all values')
//   }

//   const user = await User.findOne({ email })
//   if (user) {
//     const currentDate = new Date()
//     if (
//       user.passwordToken === createHash(token) &&
//       user.passwordTokenExpirationDate > currentDate
//     ) {
//       user.password = password
//       user.passwordToken = null
//       user.passwordTokenExpirationDate = null
//       await user.save()
//     }
//   }

//   res.send('reset password')
// }
// ---------------------------
// ---- GOOGLE SIGN-IN -------
// ---------------------------

// const googleSignIn = async (req, res) => {
//   const { credential: token } = req.body
//   // console.log('google sign in start')

//   if (!token) {
//     throw new CustomError.UnauthenticatedError(
//       'Invalid Credentials -> no google token'
//     )
//   }

//   const verify = async (token) => {
//     const client = new OAuth2Client(
//       '1005945916265-60lfnoee7gemh1rmokc65janf10emjgk.apps.googleusercontent.com'
//     )
//     try {
//       const ticket = await client.verifyIdToken({
//         idToken: token,
//         audience:
//           '1005945916265-60lfnoee7gemh1rmokc65janf10emjgk.apps.googleusercontent.com', // Specify the CLIENT_ID of the app that accesses the backend
//         // Or, if multiple clients access the backend:
//         //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
//       })

//       const payload = ticket.getPayload()
//       return payload
//     } catch (error) {
//       console.log(error)
//       throw new CustomError.UnauthenticatedError(`Google verification error 2`)
//     }
//     // const userid = payload['sub']

//     // const data = { payload: ticket.getPayload(), userid: payload['sub'] }
//     // If request specified a G Suite domain:
//     // const domain = payload['hd'];
//   }

//   const data = await verify(token)

//   if (!data) {
//     throw new CustomError.UnauthenticatedError(`Google verification error3`)
//   }

//   const emailAlreadyExists = await User.findOne({ email: data.email })
//   const subAlreadyExists = await User.findOne({ googleID: data.sub })
//   if (!emailAlreadyExists && !subAlreadyExists) {
//     const password = crypto.randomBytes(32).toString('ascii')
//     const googUser = await User.create({
//       name: data.given_name,
//       email: data.email,
//       password: password,
//       googleID: data.sub,
//       role: 'user',
//       verificationToken: '',
//       isVerified: data.email_verified,
//     })
//     await googUser.save()
//   }

//   if (emailAlreadyExists && !subAlreadyExists) {
//     emailAlreadyExists.googleID = data.sub
//     await emailAlreadyExists.save()
//   }
//   if (subAlreadyExists && !emailAlreadyExists) {
//     subAlreadyExists.email = data.email
//     await subAlreadyExists.save()
//   }

//   const user = await User.findOne({ email: data.email })
//   // console.log(name, userId, role)
//   const hasSeller = await Seller.findOne({ user: user._id })
//   const sellerData = {}
//   if (hasSeller) {
//     sellerData.mlUserId = hasSeller.mlUserId
//     const mlAuthValid = await verifyMlAccessToken(hasSeller)
//     sellerData.mlAuthValid = mlAuthValid ? true : false
//   }

//   const tokenUser = createTokenUser(user, sellerData)
//   let refreshToken = ''
//   const existingToken = await Token.findOne({ user: user._id })

//   if (existingToken) {
//     const { isValid } = existingToken
//     if (!isValid) {
//       throw new CustomError.UnauthenticatedError('Invalid Credentials 4')
//     }
//     refreshToken = existingToken.refreshToken

//     attachCookiesToResponse({ res, user: tokenUser, refreshToken })
//     // console.log(tokenUser, refreshToken)
//     res.status(StatusCodes.OK).json({ user: tokenUser })
//     return
//   }

//   refreshToken = crypto.randomBytes(40).toString('hex')
//   const userAgent = req.headers['user-agent']
//   const ip = req.ip
//   const userToken = { refreshToken, ip, userAgent, user: user._id }
//   await Token.create(userToken)

//   attachCookiesToResponse({ res, user: tokenUser, refreshToken })
//   // console.log(tokenUser, refreshToken)
//   res.status(StatusCodes.OK).json({ user: tokenUser })
// }

// ---------------------------
// ------- EXPORTS -----------
// ---------------------------

module.exports = {
  // register,
  login,
  logout,
  // verifyEmail,
  // forgotPassword,
  // resetPassword,
  // googleSignIn,
}

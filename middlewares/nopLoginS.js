const User = require('../models/User')
const { launchSBrowser } = require('../browser/browserS')
const { StatusCodes } = require('http-status-codes')
const CustomError = require('../errors')

// Middleware to pass the login info to the request object
const nopLoginS = async (req, res, next) => {
  // const user = await User.findOne({ _id: req.user.userId })
  // console.log('hello ' + user.name)

  // const { targetUrl, targetUser, targetPassword } = user
  const targetUrl = 'https://dimm.com.uy/Admin'
  const targetUser = 'dimmclientes@gmail.com'
  const targetPassword = 'j//gb4'
  try {
    await launchSBrowser({ targetUrl, targetUser, targetPassword })
    console.log('browser launched')
  } catch (error) {
    console.log(error)
    throw new CustomError.UnauthenticatedError('Target init failed')
  }

  // console.log('hello midd')
  next()
}

module.exports = { nopLoginS }

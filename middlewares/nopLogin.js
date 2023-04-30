const User = require('../models/User')
const { launchBrowser } = require('../browser/browser')

// Middleware to pass the login info to the request object
const nopLogin = async (req, res, next) => {
  const user = await User.findOne({ _id: req.user.userId })
  // console.log('hello ' + user.name)

  const { targetUrl, targetUser, targetPassword } = user
  try {
    await launchBrowser({ targetUrl, targetUser, targetPassword })
  } catch (error) {
    console.log(error)
  }

  // console.log('hello midd')
  next()
}

module.exports = { nopLogin }

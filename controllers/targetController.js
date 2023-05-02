const User = require('../models/User')
const { StatusCodes } = require('http-status-codes')

const setTarget = async (req, res) => {
  const { loginUser, password } = req.body
  // const { loginUrl, loginUser, password } = req.body
  if (!loginUser || !password) {
    throw new CustomError.BadRequestError('Please provide all values')
  }
  const user = await User.findOne({ _id: req.user.userId })

  // user.targetUrl = loginUrl
  user.targetUser = loginUser
  user.targetPassword = password

  await user.save()

  res.status(StatusCodes.OK).json({ msg: 'Account successfully added' })
}

module.exports = { setTarget }

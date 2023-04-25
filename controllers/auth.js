const User = require('../models/User')
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, UnauthenticatedError } = require('../errors')

const register = async (req, res) => {
  const { name, email, password } = req.body
  if (!email || !password || !name) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: 'Error, Please provide all values' })
  }

  const user = await User.create({ ...req.body })
  const token = user.createJWT()
  res.status(StatusCodes.CREATED).json({
    user: {
      name: user.name,
      email: user.email,
      token,
    },
  })
}

const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: 'Error, Please provide both email and password' })
  }

  const user = await User.findOne({ email })
  if (!user) {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: 'Error, Invalid credentials' })
  }
  // compare password
  const isPasswordCorrect = await user.comparePassword(password)
  if (!isPasswordCorrect) {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: 'Error, Invalid credentials' })
  }
  const token = user.createJWT()
  res.status(StatusCodes.OK).json({
    user: {
      name: user.name,
      email: user.email,
      token,
    },
  })
}

const updateUser = async (req, res) => {
  const { email, name } = req.body
  if (!email || !name) {
    throw new BadRequest('Please provide all values')
  }
  const user = await User.findOne({ _id: req.user.userId })

  user.email = email
  user.name = name

  await user.save()
  const token = user.createJWT()
  res.status(StatusCodes.OK).json({
    user: {
      email: user.email,
      name: user.name,
      token,
    },
  })
}

module.exports = {
  register,
  login,
  updateUser,
}

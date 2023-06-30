const express = require('express')
const router = express.Router()
const { authenticateUser } = require('../middlewares/authentication')

const rateLimiter = require('express-rate-limit')

const apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    msg: 'Too many requests from this IP, please try again after 15 minutes',
  },
})

const { showCurrentUser } = require('../controllers/userController')
const { setTarget } = require('../controllers/targetController')
const { login, logout, register } = require('../controllers/auth')

// router.post('/register', apiLimiter, register)
router.post('/login', login)
router.delete('/logout', authenticateUser, logout)
// router.patch('/updateUser', apiLimiter, authenticateUser, updateUser)
router.post('/settarget', apiLimiter, authenticateUser, setTarget)
router.route('/showMe').get(authenticateUser, showCurrentUser)

module.exports = router

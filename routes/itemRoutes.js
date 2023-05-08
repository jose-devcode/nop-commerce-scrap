const express = require('express')
const router = express.Router()

// AUTHTENTICATION
// TODO LATER

const { authenticateUser } = require('../middlewares/authentication')
const { nopLogin } = require('../middlewares/nopLogin')

const {
  getItemMluBySku,
  getItemSkuByMlu,
  getItemOveralls,
  getItemOverallsInverse,
} = require('../controllers/itemController')

// router.route('/:id').get(authenticateUser, nopLogin, getItemOveralls)
router.route('/:id/mlu').get(authenticateUser, nopLogin, getItemMluBySku)
router.route('/:id/sku').get(authenticateUser, nopLogin, getItemSkuByMlu)
router.route('/overall').get(authenticateUser, nopLogin, getItemOveralls)
router
  .route('/setrealstock')
  .get(authenticateUser, nopLogin, getItemOverallsInverse)

module.exports = router

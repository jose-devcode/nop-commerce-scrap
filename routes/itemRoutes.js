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
} = require('../controllers/itemController')

router.route('/:id').get(authenticateUser, getItemOveralls)
router.route('/:id/mlu').get(authenticateUser, nopLogin, getItemMluBySku)
router.route('/:id/sku').get(authenticateUser, nopLogin, getItemSkuByMlu)
router.route('/:id/overall').get(authenticateUser, nopLogin, getItemOveralls)

module.exports = router

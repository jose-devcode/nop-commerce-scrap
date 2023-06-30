const express = require('express')
const router = express.Router()

// AUTHTENTICATION
// TODO LATER

const { authenticateUser } = require('../middlewares/authentication')
const { nopLogin } = require('../middlewares/nopLogin')
const { nopLoginS } = require('../middlewares/nopLoginS')

const {
  getItemMluBySku,
  getItemSkuByMlu,
  getItemOveralls,
  getItemOverallsInverse,
  setMasiveCategory,
} = require('../controllers/itemController')

const {
  getItemList,
  getPicturesFromProducts,
  fetchText,
  fetchOrders,
  fetchSingleOrder,
} = require('../controllers/exportsController')

// router.route('/:id').get(authenticateUser, nopLogin, getItemOveralls)
router.route('/:id/mlu').get(authenticateUser, nopLogin, getItemMluBySku)
router.route('/:id/sku').get(authenticateUser, nopLogin, getItemSkuByMlu)
router.route('/overall').get(authenticateUser, nopLogin, getItemOveralls)
router.route('/setcategory').get(authenticateUser, nopLogin, setMasiveCategory)
router.route('/fetchlist').get(authenticateUser, nopLogin, getItemList)
router
  .route('/fetchimages')
  .get(authenticateUser, nopLogin, getPicturesFromProducts)
router.route('/fetchtext').get(authenticateUser, nopLogin, fetchText)
router
  .route('/setrealstock')
  .get(authenticateUser, nopLogin, getItemOverallsInverse)
router.route('/orders').post(authenticateUser, fetchOrders)
router.route('/singleorder/:id').post(authenticateUser, fetchSingleOrder)

module.exports = router

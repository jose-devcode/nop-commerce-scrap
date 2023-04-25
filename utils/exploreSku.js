const { StatusCodes } = require('http-status-codes')
const puppeteer = require('puppeteer')

const exploreSku = async (skuCode) => {
  const browser = await puppeteer.launch({ headless: true })
  const exploreSkuPage = await browser.newPage()
  await exploreSkuPage.setRequestInterception(true)
  const skuData = { skuCode: skuCode, data: [] }

  exploreSkuPage.on('request', (request) => {
    if (
      (!request.url().endsWith('.js') &&
        !request.url().match(/(\badmin\b)/i) &&
        !request.url().match(/(\blib\b)(\bjquery\b)/i) &&
        !request.url().match(/(\blogin\b)/i)) ||
      request.url().match(/(\bplugin\b)/i) ||
      request.url().match(/(\bstyles.css\b)/i) ||
      // request.url().match(/(\bdatatables\b)/i) ||
      request.url().match(/(\bkendo\b)/i) ||
      request.url().match(/(\bglobalize\b)/i) ||
      request.url().match(/(\btinymce\b)/i) ||
      request.url().match(/(\bOrder\b)/i) ||
      request.url().match(/(\bfineuploader\b)/i) ||
      request.url().match(/(\btageditor\b)/i) ||
      request.url().match(/(\bcustomer\b)/i) ||
      request.url().match(/(\bgoogle\b)/i) ||
      request.url().match(/(\bfacebook\b)/i) ||
      request.url().match(/(\badminLTE\b)/i) ||
      request.url().match(/(\bFoxNetSoft.GoogleAnalytics4\b)/i) ||
      request.url().match(/(\bFoxNetSoft.GoogleEnhancedEcommerce\b)/i) ||
      request.url().match(/(\bPopularSearchTermsReport\b)/i) ||
      request.url().match(/(\bjquery-validate\b)/i) ||
      request.url().match(/(\bjquery-ui\b)/i) ||
      request.url().match(/(\bjquery-migrate\b)/i) ||
      request.url().match(/(\bbootstrap\b)/i) ||
      request.url().match(/(\bchartjs\b)/i) ||
      request.url().match(/(\bcldr\b)/i) ||
      request.url().match(/(\b.gif\b)/i)
    )
      // Cooperative Intercept Mode: votes to abort at priority 0.
      // console.log(request.url().match(/(\badmin\b)/i))
      request.abort('failed', 2)
  })

  exploreSkuPage.on('request', async (request) => {
    if (
      request.method() === 'POST' &&
      request.url() === 'https://dimm.com.uy/Admin/Product/ProductList'
    ) {
      const startRegex = /start=([^&]*)/
      const lengthRegex = /length=([^&]*)/
      const nameRegex = /SearchProductName=([^&]*)/
      const skip = 0
      const limit = 500
      // console.log('all post ' + request.url())
      const postData = request.postData()
      const url = request.url()

      const newPostData = postData
        .replace(startRegex, `start=${skip}`)
        .replace(lengthRegex, `length=${limit}`)
        .replace(nameRegex, `SearchProductName=${skuCode}`)
        .toString()

      // console.log(request.headers())
      const fetchMeliData = await fetch(url, {
        method: 'POST',
        headers: request.headers(),
        body: newPostData,
      })

      exploResult = await fetchMeliData.json()

      skuData.data = exploResult.Data.filter(
        (item) => item.Sku === skuCode
      ).map((item) => {
        // console.log(item)
        return {
          title: item.Name,
          sku: item.Sku,
        }
      })

      // meliData.data = [...result.Data]

      // console.log(meliData)

      // // console.log(superData)

      // // modify the response as needed
      if (request.isInterceptResolutionHandled()) return
      request.continue({}, 1)
    } else {
      if (request.isInterceptResolutionHandled()) return
      request.continue({}, 1)
    }
  })

  await exploreSkuPage.goto('https://dimm.com.uy/admin')
  await exploreSkuPage.type('#Email', 'dimmclientes@gmail.com')
  await exploreSkuPage.type('#Password', 'j//gb4')
  await exploreSkuPage.click('input[type="submit"]')

  await exploreSkuPage.waitForNavigation()
  console.log('connected ok')

  await exploreSkuPage.goto('https://dimm.com.uy/Admin/Product/List', {
    waitUntil: 'networkidle0',
  })

  await exploreSkuPage.type('#SearchProductName', `${skuCode}`)
  await exploreSkuPage.click('#search-products')

  const elementExists = await exploreSkuPage.evaluate(() => {
    // Check if an element with ID 'my-element' exists on the page2
    return Boolean(document.getElementById('product-meli'))
  })

  if (elementExists) {
    console.log('The element exists on the page')
  } else {
    console.log('The element does not exist on the page')
  }

  await browser.close()
  console.log(skuData)
  return skuData
}

module.exports = exploreSku

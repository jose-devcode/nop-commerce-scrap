const { StatusCodes } = require('http-status-codes')
const puppeteer = require('puppeteer')
const { getCookies, getBrowser, getPage } = require('../browser/browser')

const exploreSku = async (skuCode) => {
  console.log(skuCode)
  const browser = await getBrowser()
  const page = await getPage()
  const skuData = { skuCode: skuCode, data: [] }

  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled()) return
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

  await page.goto('https://dimm.com.uy/Admin/Product/List', {
    waitUntil: 'networkidle0',
  })

  await page.type('#SearchProductName', `${skuCode}`)
  await page.click('#search-products')

  // const elementExists = await exploreSkuPage.evaluate(() => {
  //   // Check if an element with ID 'my-element' exists on the page2
  //   return Boolean(document.getElementById('product-meli'))
  // })

  // if (elementExists) {
  //   console.log('The element exists on the page')
  // } else {
  //   console.log('The element does not exist on the page')
  // }

  await browser.close()
  // console.log(skuData)
  return skuData
}

module.exports = exploreSku

const { StatusCodes } = require('http-status-codes')
const puppeteer = require('puppeteer')
const exploreSku = require('../utils/exploreSku')

const getItemMluBySku = async (req, res) => {
  const { id: skuCode } = req.params

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setRequestInterception(true)
  const meliData = { skuCode: skuCode, data: [] }

  page.on('request', (request) => {
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

  page.on('request', async (request) => {
    // if (
    //   request.url().endsWith('.png') ||
    //   request.url().endsWith('.jpg') ||
    //   request.url().endsWith('.css') ||
    //   request.url().endsWith('.jpeg')
    // )
    //   request.abort('aborted', 2)

    if (
      request.method() === 'POST' &&
      request.url() ===
        'https://dimm.com.uy/Admin/ProductMeli/WidgetMeliProduct'
    ) {
      // console.log('all post ' + request.url())
      const postData = request.postData()
      const url = request.url()

      // console.log(request.headers())
      const fetchMeliData = await fetch(url, {
        method: 'POST',
        headers: request.headers(),
        body: postData,
      })

      result = await fetchMeliData.json()

      meliData.data = result.Data.map((item) => {
        // console.log(item)
        return {
          mlu: item.ItemId,
          title: item.Title,
          url: item.Permalink,
          catalog: item.IsCatalog,
        }
      })

      // meliData.data = [...result.Data]

      // console.log(meliData)
      res.status(StatusCodes.OK).json({
        reqSku: skuCode,
        mluCount: meliData.data.length,
        data: meliData.data,
      })
      if (request.isInterceptResolutionHandled()) return
      request.continue({}, 1)
      return
      // // console.log(superData)

      // // modify the response as needed
    } else {
      if (request.isInterceptResolutionHandled()) return
      request.continue({}, 1)
    }
  })

  page.on('request', (request) => {
    // { action: InterceptResolutionAction.AlreadyHandled }, because continue in Legacy Mode was called
    console.log(request.interceptResolutionState(), request.url())
  })

  await page.goto('https://dimm.com.uy/Admin')
  await page.type('#Email', 'dimmclientes@gmail.com')
  await page.type('#Password', 'j//gb4')
  await page.click('input[type="submit"]')

  await page.waitForNavigation()

  console.log('connected ok')

  await page.goto('https://dimm.com.uy/Admin/Product/List', {
    waitUntil: 'networkidle0',
  })

  await page.type('#GoDirectlyToSku', `${skuCode}`)
  await page.click('#go-to-product-by-sku')
  await page.waitForNavigation()

  const elementExists = await page.evaluate(() => {
    // Check if an element with ID 'my-element' exists on the page
    return Boolean(document.getElementById('product-meli'))
  })

  if (elementExists) {
    console.log('The element exists on the page')
  } else {
    console.log('The element does not exist on the page')
  }

  await browser.close()

  return
}
const getItemSkuByMlu = async (req, res) => {
  const { id: mluCode } = req.params

  // if (mluCode.length < 8) {
  //   console.log('invalid mlu')
  //   res.status(StatusCodes.BAD_REQUEST).json({
  //     msg: `Invalid MLU code | reading ${mluCode}`,
  //   })
  //   return
  // }
  const mluDigits = /\d{9}/

  const match = mluCode.match(mluDigits)

  if (!match || mluCode.length < 8) {
    console.log('Invalid MLU provided, readed ' + mluCode)
    res.status(StatusCodes.BAD_REQUEST).json({
      msg: `Invalid MLU code | reading ${mluCode}`,
    })
    return
  }
  const reqMlu = `MLU${match[0]}`
  console.log(reqMlu)

  const browser = await puppeteer.launch({ headless: true })
  const skuPage = await browser.newPage()
  await skuPage.setRequestInterception(true)
  const nopData = { mluCode: mluCode, data: [] }

  skuPage.on('request', (request) => {
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

  skuPage.on('request', async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.url().endsWith('.png') ||
      request.url().endsWith('.jpg') ||
      request.url().endsWith('.css') ||
      request.url().endsWith('.jpeg')
    )
      request.abort()
    if (
      request.method() === 'POST' &&
      request.url() === 'https://dimm.com.uy/Admin/ProductMeli/ProductList'
    ) {
      // console.log('all post ' + request.url())
      const postData = request.postData()
      const url = request.url()
      const startRegex = /SearchItemId=([^&]*)/
      const tokenRegex = /__RequestVerificationToken=([^&]*)/
      const token = postData.match(tokenRegex)
      // console.log(token[0])
      const newPostData = postData
        .replace(startRegex, `SearchItemId=${reqMlu}`)
        .toString()

      const fetchData = await fetch(url, {
        method: 'POST',
        headers: request.headers(),
        body: newPostData,
      })

      if (fetchData) {
        result = await fetchData.json()

        nopData.data = result.Data.map((item) => {
          return {
            sku: item.NopProductSku,
          }
        })

        if (result.Data.length > 0) {
          const explorer = await exploreSku(result.Data[0].NopProductSku)
          res.status(StatusCodes.OK).json({
            reqMlu,
            skuCount: nopData.data.length,
            data: explorer,
          })
          if (request.isInterceptResolutionHandled()) return
          request.continue({}, 1)
          return
        }
        if (request.isInterceptResolutionHandled()) return
        request.continue({}, 1)
      }
    } else {
      if (request.isInterceptResolutionHandled()) return
      request.continue({}, 1)
    }
  })

  await skuPage.goto('https://dimm.com.uy/admin')
  await skuPage.type('#Email', 'dimmclientes@gmail.com')
  await skuPage.type('#Password', 'j//gb4')
  await skuPage.click('input[type="submit"]')

  await skuPage.waitForNavigation()
  console.log('connected ok')

  await skuPage.goto('https://dimm.com.uy/Admin/ProductMeli/List', {
    waitUntil: 'networkidle0',
  })

  // const elementExists = await page.evaluate(() => {
  //   // Check if an element with ID 'my-element' exists on the page
  //   return Boolean(document.getElementById('product-meli'))
  // })

  // if (elementExists) {
  //   console.log('The element exists on the page')
  // } else {
  //   console.log('The element does not exist on the page')
  // }

  await browser.close()

  return
}
const getItemOveralls = async (req, res) => {
  res.send('hello world overalls')
}

module.exports = {
  getItemMluBySku,
  getItemSkuByMlu,
  getItemOveralls,
}

const { StatusCodes } = require('http-status-codes')
const axios = require('axios')
const { getBrowser, getPage } = require('../browser/browser')

const getItemMluBySku = async (req, res) => {
  const { id: skuCode } = req.params
  const browser = await getBrowser()
  const page = await getPage()
  const meliData = { skuCode: skuCode, data: [] }
  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.method() === 'POST' &&
      request.url() ===
        'https://dimm.com.uy/Admin/ProductMeli/WidgetMeliProduct'
    ) {
      const postData = request.postData()
      const url = request.url()
      const headers = request.headers()
      const fetchMeliData = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: postData,
      })
      result = await fetchMeliData.json()
      meliData.data = result.Data.map((item) => {
        return {
          mlu: item.ItemId,
          title: item.Title,
          url: item.Permalink,
          catalog: item.IsCatalog,
        }
      })
      res.status(StatusCodes.OK).json({
        reqSku: skuCode,
        mluCount: meliData.data.length,
        data: meliData.data,
      })
      await browser.close()
    } else {
      if (request.isInterceptResolutionHandled()) return
      request.continue({}, 0)
    }
  })

  await page.goto('https://dimm.com.uy/Admin/Product/List', {
    waitUntil: 'networkidle0',
  })
  await page.type('#GoDirectlyToSku', `${skuCode}`)
  await page.click('#go-to-product-by-sku')
}

const getItemSkuByMlu = async (req, res) => {
  const browser = await getBrowser()
  const page = await getPage()

  const { id: mluCode } = req.params

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

  const globalResult = {
    reqMlu: reqMlu,
    combo: false,
    data: [],
    variants: [],
  }

  const addSkuToGlobal = async (skuData) => {
    globalResult.data.push(skuData)
  }
  const feedGlobalSku = async (skuData, data) => {
    let index = globalResult.data.findIndex((obj) => obj.sku === skuData)
    if (index !== -1) {
      globalResult.data[index] = { ...data }
    }
  }

  const feedItemVariant = async (variants) => {
    globalResult.variants.push(variants)
  }

  const setComboItemType = async () => {
    if (!globalResult.combo) {
      globalResult.combo = true
    }
  }

  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.method() === 'POST' &&
      request.url() === 'https://dimm.com.uy/Admin/ProductMeli/ProductList' &&
      !globalResult.data[0]
    ) {
      // console.log('all post ' + request.url())
      const postData = request.postData()
      const url = request.url()
      const startRegex = /SearchItemId=([^&]*)/
      const tokenRegex = /__RequestVerificationToken=([^&]*)/
      const token = postData.match(tokenRegex)
      console.log(token[0])
      const newPostData = postData
        .replace(startRegex, `SearchItemId=${reqMlu}`)
        .toString()
      let fetchData
      try {
        fetchData = await fetch(url, {
          method: 'POST',
          headers: request.headers(),
          body: newPostData,
        })
      } catch (error) {
        console.log(error)
        res.status(StatusCodes.OK).json({ msg: 'Error fetching data' })
        return
      }

      itemsResult = await fetchData.json()
      // console.log(itemsResult.Data)
      addSkuToGlobal({ sku: itemsResult.Data[0].NopProductSku })
    }

    if (request.isInterceptResolutionHandled()) return
    request.continue({}, 0)
  })

  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.method() === 'POST' &&
      request.url() === 'https://dimm.com.uy/Admin/Product/ProductList' &&
      !globalResult.data[0].name
    ) {
      const startRegex = /start=([^&]*)/
      const lengthRegex = /length=([^&]*)/
      const nameRegex = /SearchProductName=([^&]*)/
      const skip = 0
      const limit = 20
      // console.log('all post ' + request.url())
      const postData = request.postData()
      const url = request.url()

      const newPostData = postData
        .replace(startRegex, `start=${skip}`)
        .replace(lengthRegex, `length=${limit}`)
        .replace(nameRegex, `SearchProductName=${globalResult.data[0].sku}`)
        .toString()

      // console.log(request.headers())
      // const fetchProductListSearch = await fetch(url, {
      //   method: 'POST',
      //   headers: request.headers(),
      //   body: newPostData,
      // })

      let productListSearch
      const headers = request.headers()
      await axios
        .post(url, newPostData, {
          headers,
        })
        // .post('https://dimm.com.uy/Admin/Product/ProductList', postData.data, {
        //   headers: postData.headers,
        // })
        .then((response) => {
          productListSearch = response.data
        })
        .catch((error) => {
          console.error(error)
        })

      // const productListSearch = await fetchProductListSearch.json()

      productListSearch.Data.filter(
        (item) => item.Sku === globalResult.data[0].sku
      ).map((item) => {
        // console.log(item)
        feedGlobalSku(item.Sku, {
          name: item.Name,
          sku: item.Sku,
          nopId: item.Id,
          link: `https://dimm.com.uy/${item.SeName}`,
        })
        return item.Id
      })

      // console.log(exactProductNameMatch)

      //
      // GOTO SEARCH VARIANT
      //

      // addSkuToGlobal(exactProductNameMatch)

      // meliData.data = [...result.Data]

      // console.log(meliData)

      // // console.log(superData)

      // // modify the response as needed
    } else {
      if (request.isInterceptResolutionHandled()) return
      request.continue({}, 1)
    }
  })

  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.method() === 'POST' &&
      request
        .url()
        .includes(
          `https://dimm.com.uy/Admin/Product/ProductAttributeCombinationList?ProductId=`
        )
    ) {
      const postData = request.postData()
      const url = request.url()
      const headers = request.headers()

      await axios
        .post(url, postData, {
          headers,
        })
        // .post('https://dimm.com.uy/Admin/Product/ProductList', postData.data, {
        //   headers: postData.headers,
        // })
        .then((response) => {
          response.data.Data.map((item) => {
            const comboRegex = /\bcombo\b/i
            if (item.AttributesXml.match(comboRegex)) {
              setComboItemType()
              const obj = item.AttributesXml.toLowerCase()
                .split('<br />')
                .reduce((acc, val) => {
                  const field = val.split(':')
                  acc[field[0]] = field[1]
                  return acc
                }, {})
              feedItemVariant(obj)
              return
            }

            feedItemVariant({
              attributes: item.AttributesXml,
              sku: item.Sku,
              nopId: item.Id,
            })
          })
        })
        .catch((error) => {
          console.error(error)
        })

      request.continue({}, 1)
      console.log('combinations here')
    } else {
      request.continue({}, 1)
    }
  })
  //
  // TO DO THE VARIANTS SEARCH
  //
  // page.on('request', async (request) => {
  //   if (request.isInterceptResolutionHandled()) return
  //   if (
  //     request.method() === 'POST' &&
  //     request
  //       .url()
  //       .includes(
  //         'https://dimm.com.uy/Admin/Product/ProductAttributeCombinationList'

  //       )
  //   ) {
  //     console.log('combo color asociated here')
  //   } else {
  //     if (request.isInterceptResolutionHandled()) return
  //     request.continue({}, 1)
  //   }
  // })

  await page.goto('https://dimm.com.uy/Admin/ProductMeli/List', {
    waitUntil: 'networkidle0',
  })

  await page.goto('https://dimm.com.uy/Admin/Product/List', {
    waitUntil: 'networkidle0',
  })
  await page.type('#SearchProductName', `${itemsResult.Data[0].NopProductSku}`)
  await page.click('#search-products')

  await page.goto(
    `https://dimm.com.uy/Admin/Product/Edit/${globalResult.data[0].nopId}`,
    {
      waitUntil: 'networkidle0',
    }
  )

  // const elementExists = await page.evaluate(() => {
  //   // Check if an element with ID 'my-element' exists on the page
  //   return Boolean(document.getElementById('product-meli'))
  // })
  res.status(StatusCodes.OK).json(globalResult)
  // if (elementExists) {
  //   console.log('The element exists on the page')
  // } else {
  //   console.log('The element does not exist on the page')
  // }
}

//////////////////////////
//
//  TESTING ROUTE
//
/////////////////////////

const getItemOveralls = async (req, res) => {
  const { id: skuCode } = req.params
  const browser = getBrowser()
  const page = getPage()
  // const token = await getToken()
  let token
  const cookies = await getCookies()
  // console.log(token)
  // console.log(cookies)

  const stringifyCookies = async (cookies) => {
    return cookies
      .reverse()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ')
  }

  // console.log(stringifyCookies(cookies))

  // console.log(postData)
  const result = await page.evaluate(async (postData) => {
    const response = await fetch('https://www.dimm.com.uy/Admin/Product/List')
    const data = await response
    console.log(data)
  })

  const data = `draw=1&columns%5B0%5D%5Bdata%5D=Id&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=false&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=PictureThumbnailUrl&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=false&columns%5B1%5D%5Borderable%5D=false&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=Name&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=false&columns%5B2%5D%5Borderable%5D=false&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=Sku&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=false&columns%5B3%5D%5Borderable%5D=false&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=Price&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=false&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=StockQuantityStr&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=false&columns%5B5%5D%5Borderable%5D=false&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=ProductTypeName&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=false&columns%5B6%5D%5Borderable%5D=false&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B7%5D%5Bdata%5D=Published&columns%5B7%5D%5Bname%5D=&columns%5B7%5D%5Bsearchable%5D=false&columns%5B7%5D%5Borderable%5D=false&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B8%5D%5Bdata%5D=Id&columns%5B8%5D%5Bname%5D=&columns%5B8%5D%5Bsearchable%5D=false&columns%5B8%5D%5Borderable%5D=false&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false&start=0&length=15&search%5Bvalue%5D=&search%5Bregex%5D=false&SearchProductName=&SearchCategoryId=0&SearchIncludeSubCategories=false&SearchManufacturerId=0&SearchStoreId=0&SearchWarehouseId=0&SearchVendorId=0&SearchProductTypeId=0&SearchPublishedId=0&${token}`

  const headers = {
    'sec-ch-ua': '',
    'sec-ch-ua-mobile': '?0',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/112.0.5614.0 Safari/537.36',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    accept: 'application/json, text/javascript, */*; q=0.01',
    referer: 'https://dimm.com.uy/Admin/Product/List',
    'x-requested-with': 'XMLHttpRequest',
    'sec-ch-ua-platform': '""',
    cookie: await stringifyCookies(cookies),
    origin: 'https://dimm.com.uy',
  }
  const postData = { data, headers }

  // page.on('request', async (request) => {
  //   if (request.isInterceptResolutionHandled()) return
  //   if (
  //     request.method() === 'POST' &&
  //     request.url() === 'https://dimm.com.uy/Admin/Product/ProductList'
  //   ) {
  //     // console.log(request.headers())
  //     // console.log(postData.headers)
  //     // console.log(request.postData())
  //     // console.log(postData.data)
  //     // console.log(postData)
  //     const data = request.postData()

  //     const headers = request.headers()

  //     axios
  //       .post('https://dimm.com.uy/Admin/Product/ProductList', data, {
  //         headers,
  //       })
  //       // .post('https://dimm.com.uy/Admin/Product/ProductList', postData.data, {
  //       //   headers: postData.headers,
  //       // })
  //       .then((response) => {
  //         console.log(response.data)
  //       })
  //       .catch((error) => {
  //         console.error(error)
  //       })

  //     // data = await response.json()
  //     // console.log(response)
  //   }
  // })

  // await page.goto('https://dimm.com.uy/Admin/Product/List')

  // const result = await page.evaluate(async (postData) => {
  //   console.log(postData.data)
  //   console.log(postData.headers)
  //   try {
  //     const result = await fetch(
  //       'https://dimm.com.uy/Admin/Product/ProductList',
  //       {
  //         method: 'POST',
  //         headers: postData.headers,
  //         body: postData.data,
  //       }
  //     )
  //     return result
  //   } catch (error) {
  //     return error
  //   }
  //   // axios
  //   //   .post(
  //   //     'https://dimm.com.uy/Admin/Product/ProductList',
  //   //     postData.data,
  //   //     postData.headers
  //   //   )
  //   //   .then((response) => {
  //   //     // console.log(response.data)
  //   //     return response.data
  //   //   })
  //   //   .catch((error) => {
  //   //     console.error(error)
  //   //   })
  // }, postData)

  res.status(StatusCodes.OK).json({ msg: 'ok' })
}

module.exports = {
  getItemMluBySku,
  getItemSkuByMlu,
  getItemOveralls,
}

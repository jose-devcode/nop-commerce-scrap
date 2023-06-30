const { StatusCodes } = require('http-status-codes')
const axios = require('axios')
const { getBrowser, getPage } = require('../browser/browserS')

const getItemMluBySku = async (req, res) => {
  const browser = await getBrowser()
  const page = await getPage()

  const { id: incomingId } = req.params
  const skuDigits = /(\d{6})/
  const matchSkuCode = incomingId.match(skuDigits)

  // console.log(typeof skuCode)
  if (!matchSkuCode) {
    console.log('Invalid SKU provided, readed ' + incomingId)
    res.status(StatusCodes.BAD_REQUEST).json({
      msg: `Invalid SKU code | reading ${incomingId}`,
    })
    return
  }
  const skuCode = matchSkuCode[0]
  const meliData = { skuCode, data: [] }
  console.log(skuCode)

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

      await axios
        .post(url, postData, {
          headers,
        })
        // .post('https://dimm.com.uy/Admin/Product/ProductList', postData.data, {
        //   headers: postData.headers,
        // })
        .then((response) => {
          meliData.data = response.data.Data.map((item) => {
            return {
              mlu: item.ItemId,
              title: item.Title,
              url: item.Permalink,
              catalog: item.IsCatalog,
            }
          })
        })
        .catch((error) => {
          console.error(error)
        })

      // const fetchMeliData = await fetch(url, {
      //   method: 'POST',
      //   headers: headers,
      //   body: postData,
      // })
      // result = await fetchMeliData.json()
      // meliData.data = result.Data.map((item) => {
      //   return {
      //     mlu: item.ItemId,
      //     title: item.Title,
      //     url: item.Permalink,
      //     catalog: item.IsCatalog,
      //   }
      // })

      res.status(StatusCodes.OK).json({
        reqSku: skuCode,
        mluCount: meliData.data.length,
        data: meliData.data,
      })
      request.continue({}, 0)
      return
    }
  })

  await page.goto('https://dimm.com.uy/Admin/Product/List', {
    waitUntil: 'networkidle0',
  })

  console.log(skuCode)
  await page.type('#GoDirectlyToSku', `${skuCode}`)
  await page.click('#go-to-product-by-sku', {
    waitUntil: 'networkidle0',
  })

  await page.waitForNavigation({ waitUntil: 'networkidle0' })

  const evalUrl = await page.url()
  console.log(evalUrl)
  if (evalUrl === 'https://dimm.com.uy/Admin/Product/List') {
    res
      .status(StatusCodes.OK)
      .json({ msg: `Not found SKU code | reading ${skuCode}` })
    return
  }

  await browser.close()
}

const getItemSkuByMlu = async (req, res) => {
  const browser = await getBrowser()
  const page = await getPage()

  const { id: mluCode } = req.params

  const mluDigits = /(\d{9})/
  const match = mluCode.match(mluDigits)
  if (!match) {
    console.log('Invalid SKU provided, readed ' + mluCode)
    res.status(StatusCodes.BAD_REQUEST).json({
      msg: `Invalid MLU code | reading ${mluCode}`,
    })
    return
  }
  const reqMlu = `MLU${match[0]}`
  console.log(reqMlu)

  let globalResult = {
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
  const setNotFound = async () => {
    globalResult = { msg: `Not found MLU code | reading ${reqMlu}` }
  }

  if (!match) {
    console.log('Invalid MLU provided, readed ' + mluCode)
    await browser.close()
    res.status(StatusCodes.BAD_REQUEST).json({
      msg: `Invalid MLU code | reading ${mluCode}`,
    })
    return
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
      const headers = request.headers()
      const startRegex = /SearchItemId=([^&]*)/

      const newPostData = postData
        .replace(startRegex, `SearchItemId=${reqMlu}`)
        .toString()

      await axios
        .post(url, newPostData, {
          headers,
        })
        .then((response) => {
          console.log(response.data)
          if (response.data.Data.length === 0) {
            setNotFound()
            request.continue({}, 0)
            return
          }
          itemsResult = response.data
          addSkuToGlobal({ sku: itemsResult.Data[0].NopProductSku })
        })
        .catch((error) => {
          console.error(error)
          browser.close()
        })
      request.continue({}, 0)
    }
  })

  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled()) return

    if (globalResult.msg) {
      request.continue({}, 0)
      return
    }

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
      const postData = request.postData()
      const url = request.url()

      const newPostData = postData
        .replace(startRegex, `start=${skip}`)
        .replace(lengthRegex, `length=${limit}`)
        .replace(nameRegex, `SearchProductName=${globalResult.data[0].sku}`)
        .toString()

      let productListSearch
      const headers = request.headers()
      await axios
        .post(url, newPostData, {
          headers,
        })
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
    } else {
      if (request.isInterceptResolutionHandled()) return
      request.continue({}, 0)
    }
  })

  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (globalResult.msg) {
      request.continue({}, 0)
      return
    }
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
          request.continue({}, 1)
          browser.close()
          console.error(error)
        })

      request.continue({}, 1)
      // console.log('combinations here')
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
  if (!globalResult === 'MLU not found') {
    await page.type('#SearchProductName', `${globalResult.data[0].sku}`)
    await page.click('#search-products')

    await page.goto(
      `https://dimm.com.uy/Admin/Product/Edit/${globalResult.data[0].nopId}`,
      {
        waitUntil: 'networkidle0',
      }
    )
  }

  // const elementExists = await page.evaluate(() => {
  //   // Check if an element with ID 'my-element' exists on the page
  //   return Boolean(document.getElementById('product-meli'))
  // })
  await browser.close()
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
  const browser = await getBrowser()
  const page = await getPage()
  const { skuCodes } = req.body
  await page.goto('https://dimm.com.uy/Admin/Product/List')

  // console.log(skuCodes)
  for (let i = 0; i < skuCodes.length; i++) {
    try {
      await page.type('#GoDirectlyToSku', `${skuCodes[i]}`)

      await Promise.all([
        page.click('#go-to-product-by-sku'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ])

      await page.evaluate(() => {
        const element = document.querySelector(
          '#product-inventory > div.panel-container'
        )

        element.style.display = 'block'
      })
      await page.select('#ManageInventoryMethodId', '1')

      const numericInput = await page.$(
        '#pnlStockQuantity > div.col-md-9 > span.k-widget.k-numerictextbox > span > input.k-formatted-value.k-input'
      )

      await numericInput.click({ clickCount: 3 }) // Selects the current value
      await numericInput.type('3') // Types the new value

      // SET VIRTUAL
      await page.select('#ManageInventoryMethodId', '0')
      // SAVE
      const saveButton = await page.$(
        '#product-form > div.content-header.clearfix > div > button:nth-child(2)'
      )

      await Promise.all([
        saveButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ])

      console.log(skuCodes[i] + ' OK')
    } catch (error) {
      // Handle the error
      continue // Skip to the next iteration of the loop
    }
    //GO ITEM
  }

  res.status(StatusCodes.OK).json({ msg: 'ok' })
}

const getItemOverallsInverse = async (req, res) => {
  const browser = await getBrowser()
  const page = await getPage()
  const { skuCodes, listName } = req.body
  await page.goto('https://dimm.com.uy/Admin/Product/List')

  console.log(`Recibidos ${skuCodes.length} codigos en la lista ${listName}.`)

  // console.log(skuCodes)
  for (let i = 0; i < skuCodes.length; i++) {
    try {
      const skuInput = await page.$('#GoDirectlyToSku')
      await skuInput.click({ clickCount: 3 })
      await page.keyboard.press('Home')
      await page.keyboard.down('Shift')
      await page.keyboard.press('End')

      // Release the Shift key
      await page.keyboard.up('Shift')
      await skuInput.type(`${skuCodes[i]}`)

      await Promise.all([
        page.click('#go-to-product-by-sku'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ])

      const url = await page.url()
      if (url === 'https://dimm.com.uy/Admin/Product/List') {
        console.log(`wrong sku ${skuCodes[i]}`)
        continue
      }

      await page.evaluate(() => {
        const element = document.querySelector(
          '#product-inventory > div.panel-container'
        )

        element.style.display = 'block'
      })
      await page.select('#ManageInventoryMethodId', '1')

      const numericInput = await page.$(
        '#pnlStockQuantity > div.col-md-9 > span.k-widget.k-numerictextbox > span > input.k-formatted-value.k-input'
      )

      await numericInput.click({ clickCount: 3 })
      await page.keyboard.press('Home')
      await page.keyboard.down('Shift')
      await page.keyboard.press('End')

      // Release the Shift key
      await page.keyboard.up('Shift')
      await numericInput.type('1') // Types the new value

      // SET VIRTUAL
      // await page.select('#ManageInventoryMethodId', '0')
      // SAVE
      const saveButton = await page.$(
        '#product-form > div.content-header.clearfix > div > button:nth-child(2)'
      )

      await Promise.all([
        saveButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ])

      // console.log(skuCodes[i] + ' OK ==> [ '+ listName + ' ] ==> ' + (i+1)+' / '+skuCodes.length)
      console.log(
        `[${listName}] [${i + 1}/ ${skuCodes.length}] ==> ${skuCodes[i]}[OK]`
      )
    } catch (error) {
      console.log(`[${listName}]${skuCodes[i]}[Error]${error}`)
      break

      // Handle the error
    }
    //GO ITEM
  }

  res.status(StatusCodes.OK).json({ msg: 'ok' })
}
const setMasiveCategory = async (req, res) => {
  const browser = await getBrowser()
  const page = await getPage()

  await page.setDefaultTimeout(120000000)

  let idIndex = []
  let superData = {
    totalItems: 0,
    totalChunks: 0,
    Items: [],
  }

  const dimmReqListener = async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.method() === 'POST' &&
      request.url() === 'https://dimm.com.uy/Admin/Product/ProductList'
    ) {
      let newPostData
      const postData = request.postData()
      const newHeaders = request.headers()
      const url = request.url()
      const startRegex = /start=([^&]*)/
      const lengthRegex = /length=([^&]*)/
      const limit = 500

      const fetchMaxItem = await fetch(url, {
        method: 'POST',
        headers: request.headers(),
        body: postData,
      })
      const maxItem = await fetchMaxItem.json()

      // superData.totalItems = 50
      // superData.totalChunks = Math.ceil(50 / 100)
      superData.totalItems = maxItem.recordsTotal
      superData.totalChunks = Math.ceil(maxItem.recordsTotal / limit)

      for (let i = 1; i <= superData.totalChunks; i++) {
        // if (i === 1) {
        //   console.log(`Chunk No. ${i} from 1 to ${i * limit}`)
        // }
        {
          const skip = (i - 1) * limit
          console.log(
            `Chunk No. ${i}/${superData.totalChunks} | Items from ${
              i === 1 ? '1' : skip + 1
            } to ${i === 1 ? limit : skip + limit} | ${
              Math.floor(100 / superData.totalChunks) * i
            }% completed`
          )

          newPostData = postData
            .replace(startRegex, `start=${skip}`)
            .replace(lengthRegex, `length=${limit}`)
            .toString()

          const response = await fetch(url, {
            method: 'POST',
            headers: newHeaders,
            body: newPostData,
          })

          let chunk = await response.json()
          chunk.Data.map((item) => {
            idIndex.push({ sku: item.Sku, id: item.Id })

            // console.log({ sku: item.Sku, id: item.Id })
          })
          superData.Items = [...superData.Items, ...chunk.Data]

          chunk = ''
        }
      }
    }
  }

  const mappingIdListener = async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.method() === 'POST' &&
      // request
      //         .url()
      //         .includes(
      //           `https://dimm.com.uy/Admin/Product/ProductAttributeCombinationList?ProductId=`
      //         )

      request
        .url()
        .includes(
          `https://dimm.com.uy/Admin/Product/ProductAttributeMappingList?ProductId=`
        )
    ) {
      // function changeLastNumber(url, id) {
      //   var regex = /(=)(\d+)(?=[^=]*$)/
      //   var match = url.match(regex)

      //   if (match) {
      //     var currentValue = match[2]
      //     var newValue = parseInt(currentValue) + 1
      //     var newUrl = url.replace(regex, `=${id}`)
      //     return changeLastNumber(newUrl)
      //   }

      //   return url
      // }

      function changeLastNumber(url, newNumber) {
        var regex = /(=)(\d+)(?=[^=]*$)/
        return url.replace(regex, '$1' + newNumber)
      }

      console.log('mapping id fetch triggered')
      let newPostData
      const postData = request.postData()
      const newHeaders = request.headers()
      const url = request.url()

      // const fetchMaxItem = await fetch(url, {
      //   method: 'POST',
      //   headers: request.headers(),
      //   body: postData,
      // })
      // superData.mappingId = await fetchMaxItem.json()

      for (let i = 0; i < superData.Items.length; i++) {
        const newUrl = changeLastNumber(url, superData.Items[i].Id)
        // console.log(url, newUrl)
        const fetchMaxItem = await fetch(newUrl, {
          method: 'POST',
          headers: request.headers(),
          body: postData,
        })

        const attrs = await fetchMaxItem.json()
        // console.log('found ', fetchMaxItem, ' on ', superData.Items[i].Sku)
        superData.Items[i].attrIds = attrs.Data.map((item) => {
          return { name: item.ProductAttribute, id: item.Id }
        })
      }

      // superData.totalItems = 50
      // superData.totalChunks = Math.ceil(50 / 100)
      // superData.totalItems = maxItem.recordsTotal
      // superData.totalChunks = Math.ceil(maxItem.recordsTotal / limit)

      //   for (let i = 1; i <= superData.totalChunks; i++) {
      //     // if (i === 1) {
      //     //   console.log(`Chunk No. ${i} from 1 to ${i * limit}`)
      //     // }
      //     {
      //       const skip = (i - 1) * limit
      //       console.log(
      //         `Chunk No. ${i}/${superData.totalChunks} | Items from ${
      //           i === 1 ? '1' : skip + 1
      //         } to ${i === 1 ? limit : skip + limit} | ${
      //           Math.floor(100 / superData.totalChunks) * i
      //         }% completed`
      //       )

      //       newPostData = postData
      //         .replace(startRegex, `start=${skip}`)
      //         .replace(lengthRegex, `length=${limit}`)
      //         .toString()

      //       const response = await fetch(url, {
      //         method: 'POST',
      //         headers: newHeaders,
      //         body: newPostData,
      //       })

      //       let chunk = await response.json()
      //       superData.Items = [...superData.Items, ...chunk.Data]

      //       chunk = ''
      //     }
      //   }
    }
  }
  const asociatedSkuListener = async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.method() === 'POST' &&
      request
        .url()
        .includes(
          `https://dimm.com.uy/Admin/Product/ProductAttributeValueList?ProductAttributeMappingId=`
        )
    ) {
      // function changeLastNumber(url, id) {
      //   var regex = /(=)(\d+)(?=[^=]*$)/
      //   var match = url.match(regex)

      //   if (match) {
      //     var currentValue = match[2]
      //     var newValue = parseInt(currentValue) + 1
      //     var newUrl = url.replace(regex, `=${id}`)
      //     return changeLastNumber(newUrl)
      //   }

      //   return url
      // }

      function changeLastNumber(url, newNumber) {
        var regex = /(=)(\d+)(?=[^=]*$)/
        return url.replace(regex, '$1' + newNumber)
      }

      console.log('maping asociated triggered')
      let newPostData
      const postData = request.postData()
      const newHeaders = request.headers()
      const url = request.url()

      // const fetchMaxItem = await fetch(url, {
      //   method: 'POST',
      //   headers: request.headers(),
      //   body: postData,
      // })
      // superData.mappingId = await fetchMaxItem.json()

      for (let i = 0; i < superData.Items.length; i++) {
        superData.Items[i].asociatedProducts = []
        for (let y = 0; y < superData.Items[i].attrIds.length; y++) {
          const newUrl = changeLastNumber(url, superData.Items[i].attrIds[y].id)
          // console.log(url, newUrl)
          const fetchMaxItem = await fetch(newUrl, {
            method: 'POST',
            headers: request.headers(),
            body: postData,
          })

          const asoc = await fetchMaxItem.json()
          // console.log('found ', fetchMaxItem, ' on ', superData.Items[i].Sku)
          superData.Items[i].asociatedProducts.push(
            ...asoc.Data.map((item) => {
              // console.log({
              //   name: item.AssociatedProductName,
              //   id: item.AssociatedProductId,
              // })
              const { AssociatedProductName: name, AssociatedProductId: id } =
                item
              return {
                name,
                id,
                sku: idIndex
                  .filter((item) => id === item.id && id !== 0)
                  .map((item) => item.sku),
              }
            })
          )
        }
      }

      // superData.totalItems = 50
      // superData.totalChunks = Math.ceil(50 / 100)
      // superData.totalItems = maxItem.recordsTotal
      // superData.totalChunks = Math.ceil(maxItem.recordsTotal / limit)

      //   for (let i = 1; i <= superData.totalChunks; i++) {
      //     // if (i === 1) {
      //     //   console.log(`Chunk No. ${i} from 1 to ${i * limit}`)
      //     // }
      //     {
      //       const skip = (i - 1) * limit
      //       console.log(
      //         `Chunk No. ${i}/${superData.totalChunks} | Items from ${
      //           i === 1 ? '1' : skip + 1
      //         } to ${i === 1 ? limit : skip + limit} | ${
      //           Math.floor(100 / superData.totalChunks) * i
      //         }% completed`
      //       )

      //       newPostData = postData
      //         .replace(startRegex, `start=${skip}`)
      //         .replace(lengthRegex, `length=${limit}`)
      //         .toString()

      //       const response = await fetch(url, {
      //         method: 'POST',
      //         headers: newHeaders,
      //         body: newPostData,
      //       })

      //       let chunk = await response.json()
      //       superData.Items = [...superData.Items, ...chunk.Data]

      //       chunk = ''
      //     }
      //   }
    }
  }

  page.on('request', dimmReqListener)

  await page.goto('https://dimm.com.uy/Admin/Product/List', {
    waitUntil: 'networkidle0',
  })

  await page.off('request', dimmReqListener)

  page.on('request', mappingIdListener)
  await page.goto(
    // `https://dimm.com.uy/Admin/Product/Edit/5552`,
    `https://dimm.com.uy/Admin/Product/Edit/${superData.Items[0].Id}`,
    {
      waitUntil: 'networkidle0',
    }
  )

  await page.off('request', mappingIdListener)

  function findFirstNonEmptyId(data) {
    if (Array.isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        var result = findFirstNonEmptyId(data[i])
        if (result) {
          return result
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      if (
        data.hasOwnProperty('attrIds') &&
        Array.isArray(data.attrIds) &&
        data.attrIds.length > 0
      ) {
        var attrIds = data.attrIds
        for (var j = 0; j < attrIds.length; j++) {
          var attrId = attrIds[j]
          if (
            typeof attrId === 'object' &&
            attrId.hasOwnProperty('id') &&
            attrId.id !== ''
          ) {
            return attrId.id
          }
        }
      } else {
        for (var key in data) {
          var result = findFirstNonEmptyId(data[key])
          if (result) {
            return result
          }
        }
      }
    }

    return null
  }

  const firstNonEmptyId = findFirstNonEmptyId(superData.Items)

  page.on('request', asociatedSkuListener)
  await page.goto(
    // `https://dimm.com.uy/Admin/Product/Edit/5552`,
    `https://dimm.com.uy/Admin/Product/ProductAttributeMappingEdit/${firstNonEmptyId}`,
    {
      waitUntil: 'networkidle0',
    }
  )

  await page.off('request', asociatedSkuListener)

  await browser.close()
  console.log('Filtering Data...')
  const filteredData = superData.Items.map((item) => {
    const {
      Id,
      Name,
      Sku,
      Gtin,
      Price,
      ProductCost,
      Published,
      StockQuantity,
      ManageInventoryMethodId,
      VisibleIndividually,
      SeName,
      attrIds,
      asociatedProducts,
    } = item

    let invMode = ''
    switch (ManageInventoryMethodId) {
      case 0:
        invMode = 'Virtual'
        break
      case 1:
        invMode = 'SKU'
        break
      case 2:
        invMode = 'Atributo'
        break
    }

    const visibleInd = VisibleIndividually === true ? 'Si' : 'No'
    const publicado = Published === true ? 'Si' : 'No'

    // const skuCode = Sku.toString()

    const newItem = {
      Titulo: Name,
      Id,
      Sku,
      Gtin,
      USD: Price,
      UYU: ProductCost,
      Publicado: publicado,
      Visible: visibleInd,
      Stock: StockQuantity,
      From: invMode,
      Url: SeName,
      attrIds,
      asociatedProducts,
    }
    return newItem
  })
  // .filter((item) => {
  //   // console.log(item.Sku)
  //   // console.log(item.SeName)
  //   const regex = /^[A-Za-z].*/
  //   const match = item.Sku.match(regex)
  //   if (match) {
  //     return item
  //   }
  // })

  res
    .status(StatusCodes.OK)
    .json({ msg: filteredData.length, mappingId: filteredData })
}

module.exports = {
  getItemMluBySku,
  getItemSkuByMlu,
  getItemOveralls,
  getItemOverallsInverse,
  setMasiveCategory,
}

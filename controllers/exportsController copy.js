const { StatusCodes } = require('http-status-codes')
const axios = require('axios')
const { getBrowser, getPage, getPage2 } = require('../browser/browser')
const ExcelJS = require('exceljs')

const getItemList = async (req, res) => {
  console.log('hello')
  const browser = await getBrowser()
  // const page = await getPage()[0]
  // const page2 = await getPage()[1]
  const [page, page2] = await Promise.all([
    browser.newPage(),
    browser.newPage(),
  ])
  await Promise.all([
    page.setRequestInterception(true),
    page2.setRequestInterception(true),
  ])
  await page.setDefaultTimeout(120000)
  await page2.setDefaultTimeout(120000)

  let meliData = { totalItems: 0, totalChunks: 0, Items: [] }
  let superData = { totalItems: 0, totalChunks: 0, Items: [] }

  page2.on('request', async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.method() === 'POST' &&
      request.url() === 'https://dimm.com.uy/Admin/ProductMeli/ProductList'
    ) {
      const postData = request.postData()
      const url = request.url()

      const fetchMaxItem = await fetch(url, {
        method: 'POST',
        headers: request.headers(),
        body: postData,
      })
      let newHeaders = request.headers()
      newHeaders['accept-encoding'] = 'gzip, deflate, br'
      const maxItem = await fetchMaxItem.json()
      const limit = 500

      console.log(maxItem.recordsTotal)

      // superData.totalItems = 15
      // superData.totalChunks = Math.ceil(15 / 3)
      meliData.totalItems = maxItem.recordsTotal
      meliData.totalChunks = Math.ceil(maxItem.recordsTotal / limit)

      let newPostData
      const startRegex = /start=([^&]*)/
      const lengthRegex = /length=([^&]*)/
      // let fromStart = 3

      // newPostData = postData
      //   .replace(startRegex, `start=6`)
      //   .replace(lengthRegex, `length=6`)
      //   .toString()

      // console.log(newPostData)

      // const response = await fetch(url, {
      //   method: 'POST',
      //   headers: newHeaders,
      //   body: newPostData,
      // })
      // let chunk = await response.json()
      // meliData.Items = [...meliData.Items, ...chunk.Data]
      // console.log(chunk.Data.length)
      // chunk = ''

      for (let i = 1; i <= meliData.totalChunks; i++) {
        if (i === 1) {
          const skip = (i - 1) * limit

          newPostData = postData
            .replace(startRegex, `start=${skip}`)
            .replace(lengthRegex, `length=${limit}`)
            .toString()
          console.log(`Chunk No. ${i} from 1 to ${i * limit}`)
          // console.log(newPostData)
        } else {
          const skip = (i - 1) * limit

          newPostData = postData
            .replace(startRegex, `start=${skip}`)
            .replace(lengthRegex, `length=${limit}`)
            .toString()

          console.log(`Chunk No. ${i} from ${skip + 1} to ${skip + limit}`)
          // console.log(postData)
          // console.log(newPostData)
        }
        const response = await fetch(url, {
          method: 'POST',
          headers: newHeaders,
          body: newPostData,
        })
        let chunk = await response.json()
        meliData.Items = [...meliData.Items, ...chunk.Data]
        console.log(chunk.Data.length)
        chunk = ''

        // console.log(newPostData.match(startRegex))
        console.log(`${Math.floor(100 / meliData.totalChunks) * i}% completed`)
      }

      // make changes to the postData or url as needed

      // responseBodyByRequest = await response.json()
      console.log(meliData.Items.length)
      // console.log(superData)

      request.continue({}, 0)
      // modify the response as needed
    }
  })
  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.method() === 'POST' &&
      request.url() === 'https://dimm.com.uy/Admin/Product/ProductList'
    ) {
      const postData = request.postData()
      const url = request.url()

      const fetchMaxItem = await fetch(url, {
        method: 'POST',
        headers: request.headers(),
        body: postData,
      })
      let newHeaders = request.headers()
      newHeaders['accept-encoding'] = 'gzip, deflate, br'
      const maxItem = await fetchMaxItem.json()
      const limit = 500
      // const limit = 500

      console.log(maxItem.recordsTotal)

      superData.totalItems = 15
      superData.totalChunks = Math.ceil(15 / 3)
      // superData.totalItems = maxItem.recordsTotal
      // superData.totalChunks = Math.ceil(maxItem.recordsTotal / limit)

      let newPostData
      const startRegex = /start=([^&]*)/
      const lengthRegex = /length=([^&]*)/
      // let fromStart = 3

      // newPostData = postData
      //   .replace(startRegex, `start=6`)
      //   .replace(lengthRegex, `length=6`)
      //   .toString()

      // console.log(newPostData)

      // const response = await fetch(url, {
      //   method: 'POST',
      //   headers: newHeaders,
      //   body: newPostData,
      // })
      // let chunk = await response.json()
      // superData.Items = [...superData.Items, ...chunk.Data]
      // console.log(chunk.Data.length)
      // chunk = ''

      for (let i = 1; i <= superData.totalChunks; i++) {
        if (i === 1) {
          const skip = (i - 1) * limit

          newPostData = postData
            .replace(startRegex, `start=${skip}`)
            .replace(lengthRegex, `length=${limit}`)
            .toString()
          console.log(`Chunk No. ${i} from 1 to ${i * limit}`)
          // console.log(newPostData)
        } else {
          const skip = (i - 1) * limit

          newPostData = postData
            .replace(startRegex, `start=${skip}`)
            .replace(lengthRegex, `length=${limit}`)
            .toString()

          console.log(`Chunk No. ${i} from ${skip + 1} to ${skip + limit}`)
          // console.log(postData)
          // console.log(newPostData)
        }
        const response = await fetch(url, {
          method: 'POST',
          headers: newHeaders,
          body: newPostData,
        })
        let chunk = await response.json()
        superData.Items = [...superData.Items, ...chunk.Data]
        console.log(chunk.Data.length)
        chunk = ''

        // console.log(newPostData.match(startRegex))
        console.log(`${Math.floor(100 / superData.totalChunks) * i}% completed`)
      }

      // make changes to the postData or url as needed

      // responseBodyByRequest = await response.json()
      console.log(superData.Items.length)
      // console.log(superData)

      request.continue({}, 0)
      // modify the response as needed
    }
  })

  // await page.goto('https://dimm.com.uy/Admin/Product/List', {
  //   waitUntil: 'networkidle0',
  // })
  // await page2.goto('https://www.dimm.com.uy/Admin/ProductMeli/List', {
  //   waitUntil: 'networkidle0',
  // })

  await page.goto('https://dimm.com.uy/admin')
  await page.type('#Email', targetUser)
  await page.type('#Password', targetPassword)
  await page.click('input[type="submit"]')
  await page.waitForNavigation()

  await Promise.all([
    page.goto('https://dimm.com.uy/Admin/Product/List'),
    page2.goto('https://www.dimm.com.uy/Admin/ProductMeli/List'),
  ])

  await browser.close()

  const filteredData = superData.Items.map((item) => {
    const {
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
    } = item

    let invMode = ''
    switch (ManageInventoryMethodId) {
      case 0:
        invMode = 'Virtual'
        break
      case 1:
        invMode = 'Opus'
        break
      case 2:
        invMode = 'Atributo'
        break
    }

    const visibleInd = VisibleIndividually === true ? 'Si' : 'No'
    const publicado = Published === true ? 'Si' : 'No'

    // const skuCode = Sku.toString()

    const newItem = {
      Name,
      Sku: isNaN(parseInt(Sku)) ? Sku : parseInt(Sku),
      Gtin: isNaN(parseInt(Gtin)) ? Gtin : parseInt(Gtin),
      Price,
      PrecioPesos: ProductCost,
      Published: publicado,
      VisibleInd: visibleInd,
      StockQuantity,
      Seguimiento: invMode,
      SeName,
    }
    return newItem
  }).filter((item) => {
    // console.log(item.SeName)
    const regex = /\bcopiar\b/gi
    const match = item.SeName.match(regex)
    if (match) {
      return item
    }
  })
  const filteredMeliData = meliData.Items.map((item) => {
    const { Title, ItemId, StatusText, Price, Warranty, UserProfileName } = item

    // let invMode = ''
    // switch (ManageInventoryMethodId) {
    //   case 0:
    //     invMode = 'Virtual'
    //     break
    //   case 1:
    //     invMode = 'Opus'
    //     break
    //   case 2:
    //     invMode = 'Atributo'
    //     break
    // }

    // const visibleInd = VisibleIndividually === true ? 'Si' : 'No'
    // const publicado = Published === true ? 'Si' : 'No'

    // const skuCode = Sku.toString()

    const newItem = {
      Title,
      ItemId,
      StatusText,
      Price,
      Warranty,
      UserProfileName,
    }
    return newItem
  })
  // .filter((item) => {
  //   // console.log(item.SeName)
  //   const regex = /\bcopiar\b/gi
  //   const match = item.SeName.match(regex)
  //   if (match) {
  //     return item
  //   }
  // })

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Sheet1')
  const worksheet2 = workbook.addWorksheet('Sheet2')
  worksheet.properties.defaultColWidth = 'auto'
  worksheet.columns = [
    { header: 'Titulo', key: 'Name', width: 46 },
    { header: 'SKU', key: 'Sku' },
    { header: 'EAN', key: 'Gtin', width: 16, style: { numFmt: '0' } },
    { header: 'P. USD', key: 'Price' },
    { header: 'P. UYU', key: 'PrecioPesos' },
    { header: 'Publicado', key: 'Published' },
    { header: 'V. Ind', key: 'VisibleInd' },
    { header: 'Stock', key: 'StockQuantity' },
    { header: 'Seguimiento', key: 'Seguimiento', width: 12 },
    { header: 'URL', key: 'SeName', width: 46 },
  ]
  worksheet2.properties.defaultColWidth = 'auto'
  worksheet2.columns = [
    { header: 'Titulo', key: 'Title', width: 46 },
    { header: 'MLU', key: 'ItemId' },
    { header: 'Estado', key: 'StatusText' },
    { header: 'Precio', key: 'Price' },
    { header: 'Garantia', key: 'Warranty' },
    { header: 'Perfil', key: 'UserProfileName' },
  ]

  worksheet.addRows(filteredData)
  worksheet2.addRows(filteredMeliData)

  // const styleB = { numFmt: '#' }
  // worksheet.getColumn('B').eachCell((cell) => {
  //   const value = parseFloat(cell.value)
  //   cell.value = isNaN(value) ? null : value
  //   cell.style = styleB
  // })
  // worksheet.getColumn('C').eachCell((cell) => {
  //   const value = parseFloat(cell.value)
  //   cell.value = isNaN(value) ? null : value
  //   cell.style = styleB
  // })

  // worksheet.eachRow((row) => {
  //   row.eachCell((cell) => {
  //     cell.style = style
  //   })
  // })

  // res.send({ msg: 'ok' })
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', 'attachment; filename=' + 'example.xlsx')
  workbook.xlsx.write(res).then(function () {
    res.end()
  })
}

module.exports = { getItemList }

// app.get('/', async (req, res) => {
//   try {
//     const browser = await puppeteer.launch({ headless: 'new' })
//     const page = await browser.newPage()

//     //   if (response.url() === 'https://dimm.com.uy/Admin/Product/ProductList') {
//     //     responseBody = await response.json()
//     //     console.log(responseBody.Data.length)
//     //   }
//     // })

//     // await page.setRequestInterception(true)

//     page.on('request', async (request) => {
//       if (request.isInterceptResolutionHandled()) return
//       if (
//         request.method() === 'POST' &&
//         request.url() === 'https://dimm.com.uy/Admin/Product/ProductList'
//       ) {
//         const postData = request.postData()
//         const url = request.url()

//         const fetchMaxItem = await fetch(url, {
//           method: 'POST',
//           headers: request.headers(),
//           body: postData,
//         })
//         let newHeaders = request.headers()
//         newHeaders['accept-encoding'] = 'gzip, deflate, br'
//         const maxItem = await fetchMaxItem.json()
//         const limit = 3

//         console.log(maxItem.recordsTotal)

//         // superData.totalItems = maxItem.recordsTotal
//         superData.totalItems = 15
//         // superData.totalChunks = Math.ceil(maxItem.recordsTotal / limit)
//         superData.totalChunks = Math.ceil(15 / limit)

//         let newPostData
//         const startRegex = /start=([^&]*)/
//         const lengthRegex = /length=([^&]*)/
//         // let fromStart = 3

//         // newPostData = postData
//         //   .replace(startRegex, `start=6`)
//         //   .replace(lengthRegex, `length=6`)
//         //   .toString()

//         // console.log(newPostData)

//         // const response = await fetch(url, {
//         //   method: 'POST',
//         //   headers: newHeaders,
//         //   body: newPostData,
//         // })
//         // let chunk = await response.json()
//         // superData.Items = [...superData.Items, ...chunk.Data]
//         // console.log(chunk.Data.length)
//         // chunk = ''

//         for (let i = 1; i <= superData.totalChunks; i++) {
//           if (i === 1) {
//             const skip = (i - 1) * limit

//             newPostData = postData
//               .replace(startRegex, `start=${skip}`)
//               .replace(lengthRegex, `length=${limit}`)
//               .toString()
//             console.log(
//               `Chunk No. ${i} from ${(i - 1) * limit} to ${i * limit}`
//             )
//             // console.log(newPostData)
//           } else {
//             const skip = (i - 1) * limit

//             newPostData = postData
//               .replace(startRegex, `start=${skip}`)
//               .replace(lengthRegex, `length=${limit}`)
//               .toString()

//             console.log(`Chunk No. ${i} from ${skip} to ${limit}`)
//             // console.log(postData)
//             // console.log(newPostData)
//           }
//           const response = await fetch(url, {
//             method: 'POST',
//             headers: newHeaders,
//             body: newPostData,
//           })
//           let chunk = await response.json()
//           superData.Items = [...superData.Items, ...chunk.Data]
//           console.log(chunk.Data.length)
//           chunk = ''

//           // console.log(newPostData.match(startRegex))
//           console.log(
//             `${Math.floor(100 / superData.totalChunks) * i}% completed`
//           )
//         }

//         // make changes to the postData or url as needed

//         // responseBodyByRequest = await response.json()
//         console.log(superData.Items.length)
//         // console.log(superData)

//         request.continue({}, 0)
//         // modify the response as needed
//       } else {
//         if (request.isInterceptResolutionHandled()) return
//         request.continue({}, 0)
//       }
//     })

//     await page.goto('https://dimm.com.uy/admin')
//     await page.type('#Email', 'dimmclientes@gmail.com')
//     await page.type('#Password', 'j//gb4')
//     await page.click('input[type="submit"]')

//     await page.waitForNavigation()
//     console.log('connected ok')

//     await page.goto('https://dimm.com.uy/Admin/Product/List', {
//       waitUntil: 'networkidle0',
//     })

//     await browser.close()
//     const filteredData = superData.Items.map((item) => {
//       const {
//         Name,
//         Sku,
//         Gtin,
//         Price,
//         ProductCost,
//         Published,
//         StockQuantity,
//         ManageInventoryMethodId,
//         VisibleIndividually,
//       } = item

//       let invMode = ''
//       switch (ManageInventoryMethodId) {
//         case 0:
//           invMode = 'Virtual'
//           break
//         case 1:
//           invMode = 'Opus'
//           break
//         case 2:
//           invMode = 'Atributo'
//           break
//       }

//       const visibleInd = VisibleIndividually === true ? 'Si' : 'No'
//       const publicado = Published === true ? 'Si' : 'No'

//       const newItem = {
//         Name,
//         Sku,
//         Gtin,
//         Price,
//         PrecioPesos: ProductCost,
//         Published: publicado,
//         VisibleInd: visibleInd,
//         StockQuantity,
//         Seguimiento: invMode,
//       }
//       return newItem
//     })

//     const workbook = new ExcelJS.Workbook()
//     const worksheet = workbook.addWorksheet('Sheet1')
//     worksheet.properties.defaultColWidth = 'auto'
//     worksheet.columns = [
//       { header: 'Titulo', key: 'Name', width: 46 },
//       { header: 'SKU', key: 'Sku', style: { numFmt: '#' } },
//       { header: 'EAN', key: 'Gtin', width: 16, style: { numFmt: '#' } },
//       { header: 'P. USD', key: 'Price' },
//       { header: 'P. UYU', key: 'PrecioPesos' },
//       { header: 'Publicado', key: 'Published' },
//       { header: 'V. Ind', key: 'VisibleInd' },
//       { header: 'Stock', key: 'StockQuantity' },
//       { header: 'Seguimiento', key: 'Seguimiento', width: 12 },
//     ]
//     worksheet.addRows(filteredData)
//     // const styleB = { numFmt: '#' }
//     // worksheet.getColumn('B').eachCell((cell) => {
//     //   const value = parseFloat(cell.value)
//     //   cell.value = isNaN(value) ? null : value
//     //   cell.style = styleB
//     // })
//     // worksheet.getColumn('C').eachCell((cell) => {
//     //   const value = parseFloat(cell.value)
//     //   cell.value = isNaN(value) ? null : value
//     //   cell.style = styleB
//     // })

//     // worksheet.eachRow((row) => {
//     //   row.eachCell((cell) => {
//     //     cell.style = style
//     //   })
//     // })

//     res.setHeader(
//       'Content-Type',
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//     )
//     res.setHeader(
//       'Content-Disposition',
//       'attachment; filename=' + 'example.xlsx'
//     )
//     workbook.xlsx.write(res).then(function () {
//       res.end()
//     })
//   } catch (error) {
//     console.error(error)
//     res.status(500).send('An error occurred while scraping the data.')
//   }
// })

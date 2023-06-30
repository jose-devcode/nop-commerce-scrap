const { getBrowser, getPage } = require('../browser/browser')
const { getBrowser2, getPage2 } = require('../browser/browserS')
const ExcelJS = require('exceljs')
const fs = require('fs')
const he = require('he')
const { JSDOM } = require('jsdom')
const axios = require('axios')
const sanitize = require('sanitize-filename')
const { StatusCodes } = require('http-status-codes')
const fakeData = require('../utils/fakeInfo')
const CustomError = require('../errors')
const cheerio = require('cheerio')
const browserProvider = require('../browser/browserProvider')

const getItemList = async (req, res) => {
  const browser = await getBrowser()
  const page = await getPage()
  const page2 = await getPage()
  await page.setDefaultTimeout(120000)
  await page2.setDefaultTimeout(120000)

  let superData = { totalItems: 0, totalChunks: 0, Items: [] }
  let meliData = { totalItems: 0, totalChunks: 0, Items: [] }

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

      // superData.totalItems = 200
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
          superData.Items = [...superData.Items, ...chunk.Data]

          chunk = ''
        }
      }
    }
  }
  const mLReqListener = async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.method() === 'POST' &&
      request.url() === 'https://dimm.com.uy/Admin/ProductMeli/ProductList'
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

      // meliData.totalItems = 200
      // meliData.totalChunks = Math.ceil(50 / 100)
      meliData.totalItems = maxItem.recordsTotal
      meliData.totalChunks = Math.ceil(maxItem.recordsTotal / limit)

      for (let i = 1; i <= meliData.totalChunks; i++) {
        // if (i === 1) {
        //   console.log(`Chunk No. ${i} from 1 to ${i * limit}`)
        // }
        const skip = (i - 1) * limit
        {
          console.log(
            `Chunk No. ${i}/${meliData.totalChunks} | Items from ${
              i === 1 ? '1' : skip + 1
            } to ${i === 1 ? limit : skip + limit} | ${
              Math.floor(100 / meliData.totalChunks) * i
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
          meliData.Items = [...meliData.Items, ...chunk.Data]

          chunk = ''
        }
      }
    }
  }

  page.on('request', dimmReqListener)
  page.on('request', mLReqListener)

  await page.goto('https://dimm.com.uy/Admin/Product/List', {
    waitUntil: 'networkidle0',
  })

  await page.off('request', dimmReqListener)

  await page.goto('https://dimm.com.uy/Admin/ProductMeli/List', {
    waitUntil: 'networkidle0',
  })

  await browser.close()

  console.log('Filtering Data...')
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
      Sku: isNaN(parseInt(Sku)) ? Sku : parseInt(Sku),
      Gtin: isNaN(parseInt(Gtin)) ? Gtin : parseInt(Gtin),
      USD: Price,
      UYU: ProductCost,
      Publicado: publicado,
      Visible: visibleInd,
      Stock: StockQuantity,
      From: invMode,
      Url: SeName,
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

  const filteredMeliData = meliData.Items.map((item) => {
    const {
      Title,
      ItemId,
      StatusText,
      Price,
      Warranty,
      Stock,
      UserProfileName,
      NopProductSku,
      Permalink,
      IsCatalog,
    } = item

    const newItem = {
      IsCatalog: IsCatalog === true ? 'CA' : 'LG',
      Title,
      ItemId,
      NopProductSku: isNaN(parseInt(NopProductSku))
        ? NopProductSku
        : parseInt(NopProductSku),
      StatusText,
      Price,
      Warranty,
      UserProfileName,
      Permalink,
      Stock,
    }

    return newItem
  })

  const matchSkuMlu = async (filteredData, filteredMeliData) => {
    for (let obj1 of filteredData) {
      obj1.matchedArray2 = [] // create a new array in each object of array1
      for (let obj2 of filteredMeliData) {
        // console.log(obj1.Sku, obj2.NopProductSku)
        if (obj1.Sku === obj2.NopProductSku) {
          obj1.matchedArray2.push(obj2) // push matched objects to the new array
        }
      }
    }
  }

  await matchSkuMlu(filteredData, filteredMeliData)

  console.log('Generating Excel file...')

  // const workbook = new ExcelJS.Workbook()
  // const worksheet = workbook.addWorksheet('Sheet1')
  // const worksheet2 = workbook.addWorksheet('Sheet2')
  // worksheet.properties.defaultColWidth = 'auto'
  // worksheet.columns = [
  //   { header: 'Titulo', key: 'Name', width: 46 },
  //   { header: 'SKU', key: 'Sku' },
  //   { header: 'EAN', key: 'Gtin', width: 16, style: { numFmt: '0' } },
  //   { header: 'P. USD', key: 'Price' },
  //   { header: 'P. UYU', key: 'PrecioPesos' },
  //   { header: 'Publicado', key: 'Published' },
  //   { header: 'V. Ind', key: 'VisibleInd' },
  //   { header: 'Stock', key: 'StockQuantity' },
  //   { header: 'Seguimiento', key: 'Seguimiento', width: 12 },
  //   { header: 'URL', key: 'SeName', width: 46 },
  // ]
  // worksheet2.properties.defaultColWidth = 'auto'
  // worksheet2.columns = [
  //   { header: 'Titulo', key: 'Title', width: 46 },
  //   { header: 'MLU', key: 'ItemId' },
  //   { header: 'SKU', key: 'NopProductSku' },
  //   { header: 'Estado', key: 'StatusText' },
  //   { header: 'Precio', key: 'Price' },
  //   { header: 'Garantia', key: 'Warranty' },
  //   { header: 'Perfil', key: 'UserProfileName' },
  // ]

  // worksheet.addRows(filteredData)
  // worksheet2.addRows(filteredMeliData)

  // Create a new workbook and worksheet
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Products')

  // Add headers to the worksheet
  const row = worksheet.addRow([
    'Codigo',
    'Titulo',
    'Stock',
    'USD',
    'UYU',
    'Publicado',
    ' Visible',
    'From',
    'Url',
    'Variant Title',
    'MLU',
    'Variant Price',
    'Variant Warranty',
  ])

  row.height = 42

  row.font = {
    name: 'Arial',
    size: 10,
    bold: true,
  }

  const fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'E23713' }, // Set the fill color using HEX color code
  }
  row.eachCell((cell) => {
    cell.fill = fill
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  const columnC = worksheet.getColumn('C')
  columnC.numFmt = '0'

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  // Iterate over the objects
  const populateTable = async (worksheet, filteredData) => {
    for (const obj of filteredData) {
      const variants = obj.matchedArray2 || [] // Handle case when matchedArray2 is empty

      // Add a row for the parent object
      const row = worksheet.addRow([
        obj.Sku,
        obj.Titulo,
        obj.Stock,
        obj.USD,
        obj.UYU,
        obj.Publicado,
        obj.Visible,
        obj.From,
        obj.Url,
      ])

      for (let i = 1; i <= row.cellCount; i++) {
        row.getCell(i).alignment = {
          vertical: 'middle',
          horizontal: 'middle',
        }
      }

      row.getCell(1).alignment = {
        vertical: 'middle',
        horizontal: 'right',
      }
      row.getCell(2).alignment = {
        vertical: 'middle',
        horizontal: 'left',
      }

      row.height = 24.75
      row.font = {
        name: 'Arial',
        size: 10,
      }

      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'DDDDDD' }, // Red color
      }
      // Iterate over the variants and add rows for each variant
      for (const variant of variants) {
        const row = worksheet.addRow([
          variant.ItemId,
          variant.Title,
          variant.Stock,
          variant.Price,
          variant.Warranty,
        ])

        for (let i = 1; i <= row.cellCount; i++) {
          row.getCell(i).alignment = {
            vertical: 'middle',
            horizontal: 'middle',
          }
        }
        row.getCell(1).alignment = {
          vertical: 'middle',
          horizontal: 'right',
        }
        row.getCell(2).alignment = {
          vertical: 'middle',
          horizontal: 'left',
        }
        row.height = 24.75
        row.font = {
          name: 'Arial',
          size: 10,
        }
        // row.font = { bold: true }
      }
    }
    worksheet.getColumn('A').width = 16
    worksheet.getColumn('B').width = 51
    worksheet.getColumn('C').width = 7
    worksheet.getColumn('D').width = 9
  }

  await populateTable(worksheet, filteredData)
  // Iterate over each column
  worksheet.columns.forEach((column) => {
    // Get the column key
    const columnKey = column.key

    // Initialize the maximum width for the column
    let maxColumnWidth = 0

    // Iterate over each cell in the column
    column.eachCell((cell) => {
      // Calculate the cell value width
      const cellValueWidth = cell.value ? cell.value.toString().length : 0

      // Update the maximum width if the current cell value width is greater
      if (cellValueWidth > maxColumnWidth) {
        maxColumnWidth = cellValueWidth
      }
    })

    // Update the column width based on the maximum cell value width
    column.width = maxColumnWidth + 2 // Add extra padding if needed
  })

  // Save the workbook
  workbook.xlsx
    .writeFile('products.xlsx')
    .then(() => {
      console.log('Excel file generated successfully.')
    })
    .catch((error) => {
      console.log('Error generating Excel file:', error)
    })

  // res.send({ data: filteredData })

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', 'attachment; filename=' + 'example.xlsx')
  workbook.xlsx.write(res).then(function () {
    res.end()
  })
}

const getPicturesFromProducts = async (req, res) => {
  const browser = await getBrowser()
  const page = await getPage()
  const page2 = await getPage()
  await page.setDefaultTimeout(120000000)
  await page2.setDefaultTimeout(120000000)

  let dimmImgs = { totalPictures: 0, pictures: [] }
  let superData = { totalItems: 0, totalChunks: 0, Items: [] }
  let meliData = { totalItems: 0, totalChunks: 0, Items: [] }

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
      // superData.totalChunks = Math.ceil(1)
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
          superData.Items = [...superData.Items, ...chunk.Data]

          chunk = ''
        }
      }
    }
  }

  const dimmImgFetchListener = async (request) => {
    if (request.isInterceptResolutionHandled()) return
    // console.log(request.url())
    if (
      request.method() === 'POST' &&
      request
        .url()
        .includes('dimm.com.uy/Admin/Product/ProductPictureList?ProductId')
    ) {
      // console.log('hello from images')
      //  console.log(superData.Items.length)
      request.continue({}, 1)

      const postData = request.postData()
      const newHeaders = request.headers()
      const url = request.url()

      // console.log({ postData, newHeaders, url })

      const fetchMaxItem = await fetch(url, {
        method: 'POST',
        headers: request.headers(),
        body: postData,
      })
      const maxItem = await fetchMaxItem.json()

      // console.log(maxItem.Data.length)

      for (let i = 0; i < superData.Items.length; i++) {
        const skuImg = {
          name: superData.Items[i].Name,
          sku: superData.Items[i].Sku,
          pics: [],
        }
        const newUrl = url.replace(/=[^=]*$/, `=${superData.Items[i].Id}`)
        const fetchMaxItem = await fetch(newUrl, {
          method: 'POST',
          headers: request.headers(),
          body: postData,
        })
        const maxItem = await fetchMaxItem.json()
        for (let i = 0; i < maxItem.Data.length; i++) {
          const picUrl = `https://dimm.com.uy${maxItem.Data[i].PictureUrl}`
          // console.log(picUrl)
          skuImg.pics.push(picUrl)
        }
        dimmImgs.pictures.push(skuImg)
        // console.log(newUrl)

        //console.log(superData.Items[i].Id)
      }

      // console.log('combinations here')
    }
  }

  page.on('request', dimmImgFetchListener)
  page.on('request', dimmReqListener)

  await page.goto('https://dimm.com.uy/Admin/Product/List', {
    waitUntil: 'networkidle0',
  })

  await page.off('request', dimmReqListener)

  console.log(`first item ${superData.Items[0].Id}`)
  await page.goto(
    `https://dimm.com.uy/Admin/Product/Edit/${superData.Items[0].Id}`,
    {
      waitUntil: 'networkidle0',
    }
  )

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
      Id,
      Titulo: Name,
      Sku: isNaN(parseInt(Sku)) ? Sku : parseInt(Sku),
      Gtin: isNaN(parseInt(Gtin)) ? Gtin : parseInt(Gtin),
      USD: Price,
      UYU: ProductCost,
      Publicado: publicado,
      Visible: visibleInd,
      Stock: StockQuantity,
      From: invMode,
      Url: SeName,
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

  // Function to download an image

  // Function to download an image with retry
  async function downloadImageWithRetry(url, folderPath) {
    const retryAttempts = 3 // Number of retry attempts
    let retryCount = 0

    while (retryCount < retryAttempts) {
      try {
        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'stream',
        })

        const fileName = url.split('/').pop()
        const filePath = `${folderPath}/${fileName}`

        const writer = fs.createWriteStream(filePath)
        response.data.pipe(writer)

        return new Promise((resolve, reject) => {
          writer.on('finish', resolve)
          writer.on('error', reject)
        }).then(() => true)
      } catch (error) {
        console.error(`Error downloading image from ${url}: ${error.message}`)
        retryCount++
        await sleep(2000) // Wait for 2 seconds before retrying
      }
    }

    return false // Retry limit exceeded
  }

  // Function to pause execution for a given time
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Array of objects
  const objectsArray = dimmImgs.pictures

  // Function to create parent folders
  // function createParentFolders() {
  //   const imagesFolderPath = './images'
  //   if (!fs.existsSync(imagesFolderPath)) {
  //     fs.mkdirSync(imagesFolderPath)
  //   }

  //   const subFolders = Math.ceil(objectsArray.length / 50)
  //   for (let i = 1; i <= subFolders; i++) {
  //     const parentFolderPath = `${imagesFolderPath}/parent_${i}`
  //     if (!fs.existsSync(parentFolderPath)) {
  //       fs.mkdirSync(parentFolderPath)
  //     }
  //   }
  // }

  // Function to get the parent folder path for a given object
  // function getParentFolderPath(object) {
  //   const subFolders = Math.ceil(objectsArray.length / 50)
  //   const index = objectsArray.indexOf(object)
  //   const parentIndex = Math.floor(index / 50) + 1
  //   return `./images/parent_${parentIndex}/${sanitize(String(object.sku))}`
  // }

  // Function to check if an image file exists in the folder
  function imageExists(folderPath, imageUrl) {
    const fileName = imageUrl.split('/').pop()
    const filePath = `${folderPath}/${fileName}`
    return fs.existsSync(filePath)
  }

  // Function to download images from an object
  async function downloadImagesFromObject(object) {
    const folderPath = `./images/${sanitize(String(object.sku))}`
    // const folderPath = getParentFolderPath(object)
    const failedObjects = []

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath)
    }

    for (const picUrl of object.pics) {
      if (imageExists(folderPath, picUrl)) {
        // console.log(`Image already downloaded: ${picUrl}`)
        continue
      }
      const success = await downloadImageWithRetry(picUrl, folderPath)
      if (!success) {
        failedObjects.push(object)
        console.error(`Failed to download ${object.Sku} image: ${picUrl}`)
      } else {
        console.log(`Image downloaded: ${picUrl}`)
      }
    }

    return failedObjects
  }

  // Create parent folders
  // createParentFolders()

  // Loop through each object and download images
  const failedDownloads = []

  for (const object of objectsArray) {
    const failedObjects = await downloadImagesFromObject(object)
    failedDownloads.push(...failedObjects)
  }

  // Write failed downloads to a text file
  if (failedDownloads.length > 0) {
    const failedDownloadsFilePath = './failed_downloads.txt'
    const failedDownloadsArray = failedDownloads.map((object) =>
      JSON.stringify(object, null, 2)
    )
    const failedDownloadsContent = failedDownloadsArray.join(',\n\n')
    fs.writeFileSync(failedDownloadsFilePath, `${failedDownloadsContent}`)
    console.log(`Failed downloads written to ${failedDownloadsFilePath}`)
  } else {
    console.log('All downloads completed successfully.')
  }

  res.send('OK')
}

const fetchText = async (req, res) => {
  const browser = await getBrowser()
  const page = await getPage()
  await page.setDefaultTimeout(120000000)

  const downloadTextDescription = async ({ id, sku, headers }) => {
    const url = `http://dimm.com.uy/Admin/Product/Edit/${id}`
    let htmlPage
    await axios
      .get(url, {
        headers,
      })
      .then((response) => {
        htmlPage = response.data
        // console.log(response.data)

        const dom = new JSDOM(htmlPage)
        const document = dom.window.document

        // Find the textarea element by ID
        const textareaElement = document.querySelector('#FullDescription')

        // Extract the HTML content from the textarea
        const htmlContent = textareaElement.innerHTML
        // Decode the HTML entities
        const decodedHtml = he.decode(htmlContent)
        // Remove <p> tags
        const withoutPTags = decodedHtml.replace(/<\/?p>/gi, '')

        // Remove <strong> tags
        const withoutStrongTags = withoutPTags.replace(/<\/?strong>/gi, '')

        // Convert &nbsp; to normal spaces
        const withoutNbsp = withoutStrongTags.replace(/&nbsp;/g, ' ')

        // Replace HTML line breaks with newline characters
        const textContent = withoutNbsp.replace(/<br\s*\/?>/g, '\n')

        // Write the text content to a file
        fs.writeFileSync(`./images/${sku}/Desc_${sku}.txt`, textContent)
        console.log(`Updated ${sku}`)
        return true
      })
      .catch((error) => {
        console.error(error)
        return error
      })
  }

  let superData = { totalItems: 0, totalChunks: 0, Items: [] }
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

      // superData.totalItems = 4
      // superData.totalChunks = Math.ceil(1)
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
          superData.Items = [...superData.Items, ...chunk.Data]

          chunk = ''
        }
      }
    }
  }

  const dimmGetListener = async (request) => {
    if (request.isInterceptResolutionHandled()) return
    const url = request.url()
    // Allow main document request and disable interception for others

    if (
      request.method() === 'GET' &&
      url.includes('dimm.com.uy/Admin/Product/Edit')
    ) {
      const url = request.url()
      const headers = request.headers()
      await page.off('request', dimmGetListener)
      let failedSku = []

      for (let i = 0; i < superData.Items.length; i++) {
        const fetchData = {
          id: superData.Items[i].Id,
          sku: superData.Items[i].Sku,
          headers,
        }
        let htmlPage
        // const success = await downloadTextDescription({ ...fetchData })

        try {
          const response = await axios.get(
            `http://dimm.com.uy/Admin/Product/Edit/${fetchData.id}`,
            {
              headers,
            }
          )

          htmlPage = response.data
          // console.log(response.data)

          const dom = new JSDOM(htmlPage)
          const document = dom.window.document

          // Find the textarea element by ID
          const textareaElement = document.querySelector('#FullDescription')

          // Extract the HTML content from the textarea
          const htmlContent = textareaElement.innerHTML
          // Decode the HTML entities
          const decodedHtml = he.decode(htmlContent)
          // Remove <p> tags
          const withoutPTags = decodedHtml.replace(/<\/?p>/gi, '')

          // Remove <strong> tags
          const withoutStrongTags = withoutPTags.replace(/<\/?strong>/gi, '')

          // Convert &nbsp; to normal spaces
          const withoutNbsp = withoutStrongTags.replace(/&nbsp;/g, ' ')

          // Replace HTML line breaks with newline characters
          const textContent = withoutNbsp.replace(/<br\s*\/?>/g, '\n')

          const sanitizedSku = sanitize(String(superData.Items[i].Sku))
          // Write the text content to a file
          fs.writeFileSync(
            // `./images/${superData.Items[i].Sku}/Desc_${superData.Items[i].Sku}.txt`,
            `./images/${sanitizedSku}/Desc_${sanitizedSku}.txt`,
            textContent
          )
          console.log(`Updated ${superData.Items[i].Sku}`)
        } catch (error) {
          console.error(error)
          failedSku.push(superData.Items[i].Sku)
          continue
        }
      }

      fs.writeFileSync(`./images/failedSku.txt`, failedSku)
      // const fetchData = {
      //   id: 5989,
      //   sku: 900002,
      //   headers,
      // }

      // try {
      //   downloadTextDescription({ ...fetchData })
      // } catch (error) {
      //   request.continue({}, 1)
      //   browser.close()
      // }

      console.log('done')
    }
  }

  page.on('request', dimmReqListener)
  page.on('request', dimmGetListener)

  await page.goto('https://dimm.com.uy/Admin/Product/List', {
    waitUntil: 'networkidle0',
  })

  await page.off('request', dimmReqListener)

  await page.goto('https://dimm.com.uy/Admin/Product/Edit/5989', {
    waitUntil: 'networkidle0',
  }) // Replace with your target URL

  // const frameHandle = await page.$('iframe#FullDescription_ifr')
  // const frame = await frameHandle.contentFrame()
  // const html = await frame.evaluate(() => document.body.innerHTML)
  // console.log(html)

  await browser.close()
  res.send('ok')
}

const fetchOrders = async (req, res) => {
  const { start, size, filters, sorting, globalFilter } = req.query
  // if (!start || !size) {
  //   throw new CustomError.BadRequestError('Please fill all data')
  // }
  const page = await browserProvider.getPage()
  let superData = { meta: { totalRowCount: null }, data: [] }

  const orderReqListener = async (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      request.method() === 'POST' &&
      request.url() === 'https://dimm.com.uy/Admin/Order/OrderList'
    ) {
      const postData = request.postData()
      const headers = request.headers()
      const url = request.url()

      const startRegex = /start=([^&]*)/
      const lengthRegex = /length=([^&]*)/

      let newPostData = postData
        .replace(startRegex, `start=${start}`)
        .replace(lengthRegex, `length=${size}`)
        .toString()

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: newPostData,
      })
      const orders = await response.json()
      superData.meta.totalRowCount = orders.recordsTotal
      superData.data = [...orders.Data]
    }
    request.continue({}, 0)
  }

  page.on('request', orderReqListener)
  await page.goto('https://dimm.com.uy/Admin/Order/List', {
    waitUntil: 'networkidle0',
  })
  page.off('request', orderReqListener)
  await page.close()

  let mappedOrders = superData.data.map((item) => {
    const date = new Date(item.CreatedOn)
    const day = date.getDate()
    const month = date.getMonth() + 1 // Months are zero-based
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const formattedDate = `${day}/${month}/${year}`
    const formattedTime = `${hours}:${minutes}`

    // Combine the date and time components
    const formattedDateTime = `${formattedDate} ${formattedTime}`

    return {
      orderNumber: item.Id,
      orderState: item.OrderStatus,
      paymentState: item.PaymentStatus,
      email: item.CustomerEmail,
      shipmentState: item.ShippingStatus,
      createdAt: formattedDateTime,
      total: item.OrderTotal,
    }

    return
  })

  const parsedColumnFilters = JSON.parse(filters)
  if (parsedColumnFilters?.length) {
    parsedColumnFilters.map((filter) => {
      const { id: columnId, value: filterValue } = filter
      mappedOrders = mappedOrders.filter((row) => {
        return row[columnId]
          ?.toString()
          ?.toLowerCase()
          ?.includes?.(filterValue.toLowerCase())
      })
    })
  }

  if (globalFilter) {
    mappedOrders = mappedOrders.filter((row) =>
      Object.keys(row).some((columnId) =>
        row[columnId]
          ?.toString()
          ?.toLowerCase()
          ?.includes?.(globalFilter.toLowerCase())
      )
    )
  }

  const parsedSorting = JSON.parse(sorting)
  if (parsedSorting?.length) {
    const sort = parsedSorting[0]
    const { id, desc } = sort
    mappedOrders.sort((a, b) => {
      if (desc) {
        return a[id] < b[id] ? 1 : -1
      }
      return a[id] > b[id] ? 1 : -1
    })
  }

  res
    .status(StatusCodes.OK)
    // .json({ orderList: mappedOrders, totalOrders: superData.totalItems })
    .json({
      data: mappedOrders,
      meta: { totalRowCount: superData.meta.totalRowCount },
    })
}

const fetchSingleOrder = async (req, res) => {
  const OrderId = req.params.id

  const page = await browserProvider.getPage()
  let tableHtml

  // console.log(start, size)

  // await page.setDefaultTimeout(120000000)

  let superData = { totalItems: 0, totalChunks: 0, Items: [] }

  const orderReqListener = async (request) => {
    if (request.isInterceptResolutionHandled()) return

    if (
      request.method() === 'GET' &&
      request.url().includes('dimm.com.uy/Admin/Order/Edit')
    ) {
      const headers = request.headers()

      try {
        await axios
          .get(`https://dimm.com.uy/Admin/Order/Edit/${OrderId}`, {
            headers,
          })
          .then((response) => {
            htmlPage = response.data
            const dom = new JSDOM(htmlPage)
            const document = dom.window.document
            const textareaElement = document.querySelector(
              '#order-products > div.panel-container > div > div:nth-child(1) > div > table > tbody'
            )
            tableHtml = `<table><tbody>${textareaElement.innerHTML}</tbody></table>`
          })

        request.continue({}, 0)
      } catch (error) {
        // console.error(error)
        throw new CustomError.BadRequestError('Error fetching details')
      }

      request.continue({}, 0)
    }
    request.continue({}, 0)
  }

  // console.log('before navigate')
  page.on('request', orderReqListener)

  await page.goto('https://dimm.com.uy/Admin/Order/Edit/3915', {
    waitUntil: 'networkidle0',
  })
  try {
    await page.screenshot({
      // Screenshot the website using defined options

      path: './screenshot2.png', // Save the screenshot in current directory

      fullPage: true, // take a fullpage screenshot
    })
    console.log('Screenshot saved successfully.')
  } catch (error) {
    console.error('Failed to save screenshot:', error)
  }

  page.off('request', orderReqListener)

  await page.close()
  const jsonResponse = fakeData()
  console.log(superData)

  const $ = cheerio.load(tableHtml)
  // console.log($.html())

  // Fetch the values using the appropriate selectors
  const imgSrc = $('img')
    .map(function () {
      return $(this).attr('src')
    })
    .get()
  const linkText = $('em > a')
    .map(function () {
      return $(this).text()
    })
    .get()

  const pTagTexts = $('tbody > tr')
    .find('td')
    .eq(1)
    .find('p')
    .map(function () {
      return $(this).text()
    })
    .get()

  const pTagTextsOk = $('tbody > tr')
    .map((index, element) => {
      const pTags = $(element)
        .find('td')
        .eq(1)
        .find('p')
        .map((index, element) => $(element).text())
        .get()

      return [pTags]
    })
    .get()

  const thirdTdText = $('tbody > tr')
    .map((index, element) => {
      const thirdTdText = $(element)
        .find('td')
        .eq(2)
        .contents()
        .filter((index, el) => el.nodeType === 3 && el.nodeValue.trim() !== '')
        .text()
        .trim()

      return thirdTdText
    })
    .get()

  const rawItems = []
  rawItems.push(...rawItems, { imgSrc, linkText, pTagTextsOk, thirdTdText })
  // console.log(items)

  const items = rawItems[0].imgSrc.map((item, index) => {
    console.log(item, index)
    return [
      item,
      rawItems[0].linkText[index],
      rawItems[0].pTagTextsOk[index],
      rawItems[0].thirdTdText[index],
    ]
  })

  res.status(StatusCodes.OK).json(items)
}

module.exports = {
  getItemList,
  getPicturesFromProducts,
  fetchText,
  fetchOrders,
  fetchSingleOrder,
}

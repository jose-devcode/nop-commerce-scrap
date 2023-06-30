const puppeteer = require('puppeteer')
const CustomApiError = require('../errors')
let browser
let cookies
let page
let page2
let token
const launchBrowser = async (credentials) => {
  const { targetUser, targetPassword } = credentials
  browser = await puppeteer.launch()
  const [newPage1, newPage2] = await Promise.all([
    browser.newPage(),
    browser.newPage(),
  ])
  page = newPage1
  page2 = newPage2

  // await page.setRequestInterception(true)
  await Promise.all([
    page.setRequestInterception(true),
    page2.setRequestInterception(true),
  ])

  page.on('request', (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      (!request.url().endsWith('.js') &&
        !request.url().match(/(\badmin\b)/i) &&
        !request.url().match(/(\blib\b)(\bjquery\b)/i) &&
        !request.url().match(/(\blogin\b)/i)) ||
      request.resourceType() == 'stylesheet' ||
      request.resourceType() == 'font' ||
      request.resourceType() == 'image' ||
      request.url().match(/(\bstyles.css\b)/i) ||
      request.url().match(/(\bbootstrap\b)/i) ||
      request.url().match(/(\bFoxNetSoft.GoogleAnalytics4\b)/i) ||
      request.url().match(/(\bFoxNetSoft.GoogleEnhancedEcommerce\b)/i) ||
      request.url().match(/(\bgoogle\b)/i) ||
      request.url().match(/(\bPopularSearchTermsReport\b)/i)
      // request.url().match(/(\bplugin\b)/i) ||
      // // request.url().match(/(\bdatatables\b)/i) ||
      // request.url().match(/(\bkendo\b)/i) ||
      // request.url().match(/(\bglobalize\b)/i) ||
      // request.url().match(/(\btinymce\b)/i) ||
      // request.url().match(/(\bOrder\b)/i) ||
      // request.url().match(/(\bfineuploader\b)/i) ||
      // request.url().match(/(\btageditor\b)/i) ||
      // request.url().match(/(\bcustomer\b)/i) ||
      // request.url().match(/(\bfacebook\b)/i) ||
      // request.url().match(/(\badminLTE\b)/i) ||
      // request.url().match(/(\bjquery-validate\b)/i) ||
      // request.url().match(/(\bjquery-ui\b)/i) ||
      // request.url().match(/(\bjquery-migrate\b)/i) ||
      // request.url().match(/(\bchartjs\b)/i) ||
      // request.url().match(/(\bcldr\b)/i) ||
      // request.url().match(/(\b.gif\b)/i)
    ) {
      // Cooperative Intercept Mode: votes to abort at priority 0.
      // console.log(request.url().match(/(\badmin\b)/i))
      request.abort('failed', 2)
    }
    request.continue({}, 0)

    // if (
    //   request.resourceType() == 'stylesheet' ||
    //   request.resourceType() == 'font' ||
    //   request.resourceType() == 'image'
    // ) {
    //   request.abort()
    // }
  })

  page2.on('request', (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (
      (!request.url().endsWith('.js') &&
        !request.url().match(/(\badmin\b)/i) &&
        !request.url().match(/(\blib\b)(\bjquery\b)/i) &&
        !request.url().match(/(\blogin\b)/i)) ||
      request.resourceType() == 'stylesheet' ||
      request.resourceType() == 'font' ||
      request.resourceType() == 'image' ||
      request.url().match(/(\bstyles.css\b)/i) ||
      request.url().match(/(\bbootstrap\b)/i) ||
      request.url().match(/(\bFoxNetSoft.GoogleAnalytics4\b)/i) ||
      request.url().match(/(\bFoxNetSoft.GoogleEnhancedEcommerce\b)/i) ||
      request.url().match(/(\bgoogle\b)/i) ||
      request.url().match(/(\bPopularSearchTermsReport\b)/i)
      // request.url().match(/(\bplugin\b)/i) ||
      // // request.url().match(/(\bdatatables\b)/i) ||
      // request.url().match(/(\bkendo\b)/i) ||
      // request.url().match(/(\bglobalize\b)/i) ||
      // request.url().match(/(\btinymce\b)/i) ||
      // request.url().match(/(\bOrder\b)/i) ||
      // request.url().match(/(\bfineuploader\b)/i) ||
      // request.url().match(/(\btageditor\b)/i) ||
      // request.url().match(/(\bcustomer\b)/i) ||
      // request.url().match(/(\bfacebook\b)/i) ||
      // request.url().match(/(\badminLTE\b)/i) ||
      // request.url().match(/(\bjquery-validate\b)/i) ||
      // request.url().match(/(\bjquery-ui\b)/i) ||
      // request.url().match(/(\bjquery-migrate\b)/i) ||
      // request.url().match(/(\bchartjs\b)/i) ||
      // request.url().match(/(\bcldr\b)/i) ||
      // request.url().match(/(\b.gif\b)/i)
    ) {
      // Cooperative Intercept Mode: votes to abort at priority 0.
      // console.log(request.url().match(/(\badmin\b)/i))
      request.abort('failed', 2)
    }
  })

  // await Promise.all([
  //   page.goto('http://dimm.com.uy/admin', {
  //     waitUntil: 'networkidle0',
  //   }),
  //   page2.goto('http://dimm.com.uy/admin', {
  //     waitUntil: 'networkidle0',
  //   }),
  // ])
  console.log('here')
  // Login process for page1
  await page.goto('https://dimm.com.uy/admin')
  await page.type('#Email', targetUser)
  await page.type('#Password', targetPassword)
  await page.click('input[type="submit"]')
  await page.waitForNavigation()

  // Login process for page2
  // await page2.goto('https://dimm.com.uy/admin')

  // await Promise.all([
  //   page.goto('http://dimm.com.uy/admin'),
  //   page.waitForNavigation(),
  //   page.type('#Email', targetUser),
  //   page.type('#Password', targetPassword),
  //   page.click('input[type="submit"]'),
  //   page.waitForNavigation(),
  // ])
  // await Promise.all([
  //   page2.goto('http://dimm.com.uy/admin'),
  //   page2.type('#Email', targetUser),
  //   page2.type('#Password', targetPassword),
  //   page2.click('input[type="submit"]'),
  //   page2.waitForNavigation(),
  // ])

  // await Promise.all([page.waitForNavigation(), page2.waitForNavigation()])

  console.log('connected ok')
}

module.exports = {
  launchBrowser,
  getBrowser: () => browser,
  getCookies: () => cookies,
  getPage: () => [page, page2],
  // getPage2: () => page2,
  getToken: () => token,
}

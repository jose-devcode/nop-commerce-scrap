const puppeteer = require('puppeteer')

let browser
let cookies
let page
let token
const launchBrowser = async (credentials) => {
  const { targetUrl, targetUser, targetPassword } = credentials
  browser = await puppeteer.launch({ headless: true })
  page = await browser.newPage()
  await page.setRequestInterception(true)

  const requestToken = {}

  const fillToken = async (tokenData) => {
    token = tokenData
  }
  // page.on('request', (request) => {
  //   if (request.isInterceptResolutionHandled()) return
  //   if (
  //     request.method() === 'POST' &&
  //     request.url() === 'https://dimm.com.uy/login'
  //   ) {
  //     console.log('login')
  //     const a = request.postData()
  //     console.log(a)
  //     request.continue({}, 3)
  //   } else {
  //     request.continue({}, 0)
  //   }
  // })

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
    ) {
      // Cooperative Intercept Mode: votes to abort at priority 0.
      // console.log(request.url().match(/(\badmin\b)/i))
      request.abort('failed', 2)
    } else {
      if (request.isInterceptResolutionHandled()) return
      request.continue({}, 0)
    }
  })
  page.on('request', (request) => {
    if (request.isInterceptResolutionHandled()) return
    if (request.method() === 'POST' && request.url().match(/(\blogin\b)/i)) {
      const a = request.postData().split('&')[2]
      fillToken(a)

      request.continue({}, 3)
    }
  })

  await page.goto(targetUrl)
  await page.type('#Email', targetUser)
  await page.type('#Password', targetPassword)
  await page.click('input[type="submit"]')
  await page.waitForNavigation()
  console.log('connected ok')
  cookies = await page.cookies()
  console.log(cookies.length)
}

module.exports = {
  launchBrowser,
  getBrowser: () => browser,
  getCookies: () => cookies,
  getPage: () => page,
  getToken: () => token,
}

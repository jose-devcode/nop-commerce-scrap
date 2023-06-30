const puppeteer = require('puppeteer')

let browser
let page
// let page
const launchBrowser = async (credentials) => {
  const { targetUser, targetPassword } = credentials

  browser = await puppeteer.launch({
    headless: 'new',
  })

  page = await browser.newPage()

  await page.setRequestInterception(true)

  page.on('request', (request) => {
    if (request.isInterceptResolutionHandled()) {
      return
    }
    // if (request.url().match(/(\blib\b)/i)) {
    //   console.log(request.url())
    // }
    if (
      (!request.url().endsWith('.js') &&
        !request.url().match(/(\badmin\b)/i) &&
        !request.url().match(/(\blib\b)(\bjquery\b)/i) &&
        !request.url().match(/(\blib\b)(\bRoxy_Fileman\b)/i) &&
        !request.url().match(/(\blib\b)(\btiny\b)/i) &&
        !request.url().match(/(\blogin\b)/i)) ||
      request.resourceType() == 'stylesheet' ||
      request.resourceType() == 'font' ||
      //request.resourceType() == 'image' ||
      request.url().match(/(\bbootstrap\b)/i) ||
      request.url().match(/(\bFoxNetSoft.GoogleAnalytics4\b)/i) ||
      request.url().match(/(\bFoxNetSoft.GoogleEnhancedEcommerce\b)/i) ||
      request.url().match(/(\bgoogle\b)/i) ||
      request.url().match(/(\bfacebook\b)/i) ||
      request.url().match(/(\bPopularSearchTermsReport\b)/i)
    ) {
      request.abort('failed', 0)
    } else {
      request.continue({}, 0)
    }
    request.continue({}, 0)
  })

  await page.goto('https://dimm.com.uy/admin')
  await page.type('#Email', 'dimmclientes@gmail.com')
  await page.type('#Password', 'j//gb4')
  await page.click('input[type="submit"]')
  await page.waitForNavigation()
}

const newTab = async () => {}

module.exports = {
  launchBrowser,
  getBrowser: () => browser,
  getPage: () => page,
}

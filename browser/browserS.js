const puppeteer = require('puppeteer')
let browser
let page2
const launchSBrowser = async (credentials) => {
  const { targetUser, targetPassword } = credentials
  browser = await puppeteer.launch({
    headless: true,
  })

  page2 = await browser.newPage()

  await page2.setRequestInterception(true)

  page2.on('request', (request) => {
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

  await page2.goto('https://dimm.com.uy/admin')
  await page2.type('#Email', 'dimmclientes@gmail.com')
  await page2.type('#Password', 'j//gb4')
  await page2.click('input[type="submit"]')
  await page2.waitForNavigation()
}

module.exports = {
  launchSBrowser,
  getBrowser2: () => browser,
  getPage2: () => page2,
}

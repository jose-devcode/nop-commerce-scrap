const puppeteer = require('puppeteer')
let browser = null
let cookies = null

async function login() {
  browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  // Navigate to the login page and enter credentials
  await page.goto('https://dimm.com.uy/admin')
  await page.type('#Email', 'dimmclientes@gmail.com')
  await page.type('#Password', 'j//gb4')
  await page.click('input[type="submit"]')
  await page.waitForNavigation()

  // Get the cookies and store them in memory or cache
  cookies = await page.cookies()
}

async function refreshCookies() {
  // Check if cookies are expired and refresh them if needed
  const expirationTime = new Date(cookies[0].expires * 1000)
  const now = new Date()
  const timeDiff = expirationTime.getTime() - now.getTime()
  const minutesDiff = timeDiff / 60000

  if (minutesDiff < 30) {
    console.log('Cookies expired, refreshing...')
    await login()
  }
}

module.exports = { login, refreshCookies }

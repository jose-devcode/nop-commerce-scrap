const puppeteer = require('puppeteer')

// Middleware to pass the login info to the request object
async function nopLogin(req, res, next) {
  try {
    // const { username, password } = req.body

    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setRequestInterception(true)
    console.log(page)
    // Check for valid cookies
    const cookies = await page.cookies()
    console.log(cookies)
    console.log('fetch cookies')
    if (cookies.length === 0 || (await isExpired(cookies))) {
      await page.goto('https://dimm.com.uy/admin')
      await page.type('#Email', 'dimmclientes@gmail.com')
      await page.type('#Password', 'j//gb4')
      await page.click('input[type="submit"]')

      await page.waitForNavigation()
      console.log('connected ok')

      // Get cookies and set them in the page
      const cookies = await page.cookies()
      await page.setCookie(...cookies)
    }

    req.browser = browser
    req.page = page

    next()
  } catch (error) {
    console.error(error)
    res.status(500).send('Error logging in')
  }
}

// Function to login to the page
const login = async (page) => {
  console.log(page)
  console.log('inside login')
  await page.goto('https://dimm.com.uy/login')
  console.log('goto')
  await page.type('#Email', 'dimmclientes@gmail.com')
  console.log('email')
  await page.type('#Password', 'j//gb4')
  console.log('password')
  await page.click('input[type="submit"]')
  console.log('submit')

  await page.waitForNavigation()
  console.log('connected ok')

  // Get cookies and set them in the page
  const cookies = await page.cookies()
  await page.setCookie(...cookies)
}

// Function to check if the cookies have expired
async function isExpired(cookies) {
  console.log('check cookies')
  const cookie = cookies.find((c) => c.name === '.Nop.Authentication')
  console.log(cookie)
  if (!cookie || !cookie.expires) return true

  const expires = new Date(cookie.expires * 1000)
  const now = new Date()
  return now > expires
}
module.exports = { nopLogin }

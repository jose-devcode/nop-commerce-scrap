const puppeteer = require('puppeteer')

class BrowserProvider {
  constructor() {
    this.browser = null
  }

  async launchBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
      })
      this.page = await this.browser.newPage()
      await this.page.goto('https://dimm.com.uy/admin')
      await this.page.type('#Email', 'dimmclientes@gmail.com')
      await this.page.type('#Password', 'j//gb4')
      await this.page.click('input[type="submit"]')
      await this.page.waitForNavigation()

      // Get the login cookies
      this.cookies = await this.page.cookies()

      // Store the cookies for later usage
      this.browserContextCookies = this.cookies

      // Close the login page
      await this.page.close()
    }
  }

  async getPage() {
    if (!this.browser) {
      throw new Error(
        'Browser has not been launched. Call launchBrowser() first.'
      )
    }

    const page = await this.browser.newPage()
    await page.setCookie(...this.browserContextCookies)
    await page.setRequestInterception(true)
    // await page.setRequestInterception(true)
    // Configure the page if needed
    // e.g., set cookies, modify headers, etc.

    return page
  }
}
// Create a singleton instance of the browser provider
const browserProvider = new BrowserProvider()

module.exports = browserProvider

require('dotenv').config()
require('express-async-errors')
const { createProxyMiddleware } = require('http-proxy-middleware')

//EXPRESS
const express = require('express')
const path = require('path')
const morgan = require('morgan')
const app = express()

const browserProvider = require('./browser/browserProvider')

const helmet = require('helmet')
const xss = require('xss-clean')
const cors = require('cors')
const mongoSanitize = require('express-mongo-sanitize')
// DATABASE
const connectDB = require('./db/connect')
// ROUTES
const itemRouter = require('./routes/itemRoutes')
const authRouter = require('./routes/userRoutes')
// const userRouter = require('./routes/userRoutes')
// middleware
const notFoundMiddleware = require('./middlewares/not-found')
const errorHandlerMiddleware = require('./middlewares/error-handler')
const cookieParser = require('cookie-parser')

// app.set('trust proxy', 1)
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    // imgSrc: ["'self'", 'https://www.material-react-table.com/'],
    imgSrc: ["'self'", 'data:', 'https://dimm.com.uy'],
    scriptSrc: [
      "'self'",
      'https://www.google.com/recaptcha/',
      'https://www.gstatic.com/',
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https://www.google.com/recaptcha/',
      'https://fonts.googleapis.com/',
    ],
    frameSrc: ['https://www.google.com/recaptcha/'],
  },
}

app.use(helmet())
app.use(helmet.contentSecurityPolicy(cspConfig))
app.use(cors())

app.use(xss())
app.use(mongoSanitize())
app.use(express.json())
app.use(cookieParser(process.env.JWT_SECRET))
app.use(morgan('tiny'))
app.use(
  '/images',
  createProxyMiddleware({
    target: 'https://dimm.com.uy',
    changeOrigin: true,
    pathRewrite: {
      '^/images': '/images',
    },
  })
)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/items', itemRouter)

app.use(express.static('./public'))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})
app.use(notFoundMiddleware)
app.use(errorHandlerMiddleware)

//
// CONNECTION / START
//
const port = process.env.PORT || 5000
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL)
    await browserProvider.launchBrowser()
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    )
  } catch (error) {
    console.log(error)
  }
}

start()

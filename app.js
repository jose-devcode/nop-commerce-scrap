require('dotenv').config()
require('express-async-errors')

//EXPRESS
const express = require('express')

const app = express()

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
const notFoundMiddleware = require('./middlewares/not-found')

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
)
app.use(cors())
app.use(xss())
app.use(mongoSanitize())
app.set('trust proxy', 1)
app.use(express.json())

app.use(express.static('./public'))

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/items', itemRouter)

app.use(notFoundMiddleware)

//
// CONNECTION / START
//
const port = process.env.PORT || 5000
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL)

    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    )
  } catch (error) {
    console.log(error)
  }
}

start()

require('dotenv').config()
require('express-async-errors')

//EXPRESS
const express = require('express')

const app = express()

// DATABASE
const connectDB = require('./db/connect')

// ROUTES
const itemRouter = require('./routes/itemRoutes')
const authRouter = require('./routes/userRoutes')
// const userRouter = require('./routes/userRoutes')
app.use(express.json())

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/items', itemRouter)

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

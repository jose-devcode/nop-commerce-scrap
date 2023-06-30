const orderStates = ['Procesando', 'Completada', 'Cancelada', 'Pendiente']
const paymentStates = ['Pagado', 'Pendiente', 'Reembolsado']
const shipmentStates = ['Entregado', 'No enviado', 'Enviado']
const { faker } = require('@faker-js/faker')

const fakeInfo = () => {
  const randomyzeField = (field) => {
    const randomIndex = Math.floor(Math.random() * field.length)
    return field[randomIndex]
  }

  function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min
  }
  const randomAmount = getRandomNumber(1, 2500)

  function getRandomDateNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  function generateRandomDate() {
    const randomMonth = getRandomDateNumber(1, 12)
    const randomDay = getRandomDateNumber(1, 28)
    const randomYear = getRandomDateNumber(2023, 2023)
    const randomHour = getRandomDateNumber(0, 23)
    const randomMinute = getRandomDateNumber(0, 59)

    const formattedDate = `${randomMonth
      .toString()
      .padStart(2, '0')}/${randomDay
      .toString()
      .padStart(2, '0')}/${randomYear} ${randomHour
      .toString()
      .padStart(2, '0')}:${randomMinute.toString().padStart(2, '0')}`

    return formattedDate
  }

  const longData = [...Array(500)].map(() => {
    return {
      orderNumber: faker.number.int({ min: 1000, max: 9999 }),
      orderState: randomyzeField(orderStates),
      paymentState: randomyzeField(paymentStates),
      email: faker.internet.email(),

      shipmentState: randomyzeField(shipmentStates),
      createdAt: generateRandomDate(),
      total: getRandomNumber(1, 2500).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      }),
    }
  })

  return longData
}
module.exports = fakeInfo

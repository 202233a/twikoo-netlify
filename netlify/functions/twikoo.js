const twikoo = require('twikoo-vercel')

exports.handler = async function (event) {
  process.env.VERCEL_URL = event.rawUrl.replace(/^https?:\/\//, '')
  process.env.TWIKOO_IP_HEADERS = JSON.stringify([
    'headers.cf-connecting-ip',
    'headers.x-real-ip',
    'headers.x-forwarded-for',
    'headers.x-nf-client-connection-ip',
  ])

  const result = {
    statusCode: 204,
    headers: {},
    body: '',
  }
  const request = {
    method: event.httpMethod,
    headers: event.headers,
    body: {},
  }

  try {
    request.body = JSON.parse(event.body)
  }
  catch {}

  const response = {
    status(code) {
      result.statusCode = code
      return this
    },
    json(json) {
      result.headers['Content-Type'] = 'application/json'
      result.body = JSON.stringify(json)
      return this
    },
    end() {
      return this
    },
    setHeader(k, v) {
      result.headers[k] = v
      return this
    },
  }

  await twikoo(request, response)
  return result
}

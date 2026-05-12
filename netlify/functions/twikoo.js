const twikoo = require('twikoo-vercel')

function getHeader(headers, name) {
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()]
}

function getHeaderDebug(headers) {
  const names = [
    'cf-connecting-ip',
    'x-real-ip',
    'x-forwarded-for',
    'x-nf-client-connection-ip',
    'x-client-ip',
    'forwarded',
  ]
  return Object.fromEntries(names.map(name => [name, getHeader(headers, name) || '']))
}

exports.handler = async function (event) {
  process.env.VERCEL_URL = event.rawUrl.replace(/^https?:\/\//, '')
  process.env.TWIKOO_IP_HEADERS = JSON.stringify([
    'headers.cf-connecting-ip',
    'headers.x-real-ip',
    'headers.x-forwarded-for',
    'headers.x-nf-client-connection-ip',
  ])

  const headers = event.headers || {}

  if (event.queryStringParameters?.['debug-ip'] === 'zery') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        ipHeaders: JSON.parse(process.env.TWIKOO_IP_HEADERS),
        received: getHeaderDebug(headers),
      }, null, 2),
    }
  }

  const result = {
    statusCode: 204,
    headers: {},
    body: '',
  }
  const request = {
    method: event.httpMethod,
    headers,
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

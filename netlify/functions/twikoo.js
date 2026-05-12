const twikoo = require('twikoo-vercel')

function getHeader(headers, name) {
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()]
}

function cleanIp(ip) {
  const value = String(ip || '')
    .trim()
    .replace(/^::ffff:/, '')
  const bracketed = value.match(/^\[([^\]]+)\](?::\d+)?$/)
  if (bracketed)
    return bracketed[1]
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value))
    return value.replace(/:\d+$/, '')
  return value
}

function isPublicIPv4(ip) {
  const parts = cleanIp(ip).split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255))
    return false

  const [a, b] = parts
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function getCandidateIps(headers) {
  return [
    getHeader(headers, 'x-forwarded-for'),
    getHeader(headers, 'x-real-ip'),
    getHeader(headers, 'cf-connecting-ip'),
    getHeader(headers, 'x-client-ip'),
  ]
    .filter(Boolean)
    .flatMap(value => String(value).split(','))
    .map(cleanIp)
    .filter(Boolean)
}

exports.handler = async function (event) {
  process.env.VERCEL_URL = event.rawUrl.replace(/^https?:\/\//, '')
  process.env.TWIKOO_IP_HEADERS = JSON.stringify([
    'headers.x-zery-client-ip',
    'headers.x-forwarded-for',
    'headers.x-real-ip',
    'headers.cf-connecting-ip',
    'headers.x-nf-client-connection-ip',
  ])

  const headers = event.headers || {}
  const ips = getCandidateIps(headers)
  const selectedIp = ips.find(isPublicIPv4) || ips[0]
  if (selectedIp)
    headers['x-zery-client-ip'] = selectedIp

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

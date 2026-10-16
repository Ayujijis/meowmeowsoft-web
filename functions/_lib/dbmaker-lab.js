const COOKIE = 'mms_dblab'
const PREFIX = 'dbmaker-lab/'
const SESSION_MS = 1000 * 60 * 60 * 12

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  })
}

function bytesToBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
  return out
}

async function hmacKey(secret) {
  const encoded = new TextEncoder().encode(secret)
  return crypto.subtle.importKey('raw', encoded, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

async function signToken(secret, expiresAt) {
  const payload = String(expiresAt)
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${bytesToBase64Url(new Uint8Array(sig))}`
}

async function verifyToken(secret, token) {
  if (!token || !secret) return false
  const [expRaw, sigPart] = token.split('.')
  if (!expRaw || !sigPart) return false
  const expiresAt = Number(expRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false
  const key = await hmacKey(secret)
  const sig = base64UrlToBytes(sigPart)
  const ok = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(expRaw))
  return ok
}

export function readSessionCookie(request) {
  const raw = request.headers.get('Cookie') || ''
  for (const part of raw.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === COOKIE) return rest.join('=')
  }
  return ''
}

export async function hasLabAccess(request, env) {
  const secret = env.DBMAKER_LAB_KEY
  if (!secret) return false
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (bearer && bearer === secret) return true
  const token = readSessionCookie(request)
  return verifyToken(secret, token)
}

export async function createSessionCookie(env, request) {
  const secret = env.DBMAKER_LAB_KEY
  if (!secret) return null
  const expiresAt = Date.now() + SESSION_MS
  const token = await signToken(secret, expiresAt)
  const maxAge = Math.floor(SESSION_MS / 1000)
  const secure =
    request && new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${token}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${maxAge}`
}

export function clearSessionCookie(request) {
  const secure =
    request && new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0`
}

export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

export function labKey(env) {
  return env.DBMAKER_LAB_KEY || ''
}

export function storagePrefix() {
  return PREFIX
}

export function sanitizeRelativePath(raw) {
  const parts = String(raw || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
  if (!parts.length) return null
  if (parts.some((part) => part === '..' || part === '.' || part.startsWith('.'))) return null
  const joined = parts.join('/')
  if (!/^[a-zA-Z0-9_][a-zA-Z0-9._/-]*$/.test(joined)) return null
  return joined
}

export function mimeFor(name) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8'
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8'
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8'
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8'
  if (lower.endsWith('.wasm')) return 'application/wasm'
  if (lower.endsWith('.dll')) return 'application/octet-stream'
  if (lower.endsWith('.dat')) return 'application/octet-stream'
  if (lower.endsWith('.blat')) return 'application/octet-stream'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.ico')) return 'image/x-icon'
  if (lower.endsWith('.woff')) return 'font/woff'
  if (lower.endsWith('.woff2')) return 'font/woff2'
  return 'application/octet-stream'
}

export async function rewriteIndexHtml(html) {
  const base = '<base href="/api/dbmaker-lab/app/" />'
  if (/<base\s+href=/i.test(html)) {
    return html.replace(/<base\s+href="[^"]*"\s*\/?>/i, base)
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n    ${base}`)
  }
  return `${base}\n${html}`
}

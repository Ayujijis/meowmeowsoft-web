import {
  clearSessionCookie,
  createSessionCookie,
  hasLabAccess,
  json,
  labKey,
  timingSafeEqual,
} from '../../_lib/dbmaker-lab.js'

export async function onRequestGet(context) {
  const { request, env } = context
  if (!labKey(env)) {
    return json({ ok: false, configured: false, error: 'DBmaker lab is not configured.' }, 503)
  }
  const ok = await hasLabAccess(request, env)
  return json({ ok, configured: true })
}

export async function onRequestPost(context) {
  const { request, env } = context
  const secret = labKey(env)
  if (!secret) {
    return json({ ok: false, configured: false, error: 'DBmaker lab is not configured.' }, 503)
  }

  let body = {}
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400)
  }

  const password = String(body.password || '')
  if (!timingSafeEqual(password, secret)) {
    return json({ ok: false, error: 'Wrong password.' }, 401)
  }

  const cookie = await createSessionCookie(env, request)
  if (!cookie) return json({ ok: false, error: 'Could not start session.' }, 500)
  return json({ ok: true, configured: true }, 200, { 'Set-Cookie': cookie })
}

export async function onRequestDelete(context) {
  const { request } = context
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(request) })
}

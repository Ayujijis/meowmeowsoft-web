const MAX_BYTES = 80 * 1024 * 1024
const ALLOWED = new Set(['glb', 'gltf', '3mf', 'blend'])

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function mimeFor(name) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.gltf')) return 'model/gltf+json'
  if (lower.endsWith('.glb')) return 'model/gltf-binary'
  if (lower.endsWith('.3mf')) return 'model/3mf'
  if (lower.endsWith('.blend')) return 'application/x-blender'
  return 'application/octet-stream'
}

function sanitizeName(raw) {
  const base = String(raw || '').split(/[/\\]/).pop() || ''
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '-')
  const match = cleaned.match(/^([a-zA-Z0-9._-]+)\.(glb|gltf|3mf|blend)$/i)
  if (!match) return null
  return `${match[1]}.${match[2].toLowerCase()}`
}

function authorized(request, env) {
  const expected = env.UPLOAD_KEY
  if (!expected) return false
  const header = request.headers.get('x-upload-key') || ''
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  return header === expected || bearer === expected
}

export async function onRequest(context) {
  const { request, env, params } = context
  if (!env.MODELS) return json({ error: 'Models storage is not configured.' }, 503)

  const parts = [].concat(params.path || []).filter(Boolean)
  if (parts[0] !== 'models') return json({ error: 'Not found' }, 404)

  const fileName = parts.slice(1).join('/')
  const method = request.method.toUpperCase()

  if (!fileName) {
    if (method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const listed = await env.MODELS.list({ prefix: 'models/' })
    const models = (listed.objects || []).map((object) => ({
      name: object.key.slice('models/'.length),
      size: object.size,
      uploaded: object.uploaded,
    }))
    return json({ models })
  }

  const name = sanitizeName(fileName)
  if (!name || !ALLOWED.has(name.split('.').pop())) {
    return json({ error: 'Use a .glb, .gltf, .3mf, or .blend file name.' }, 400)
  }
  const key = `models/${name}`

  if (method === 'GET') {
    const object = await env.MODELS.get(key)
    if (!object) return json({ error: 'Not found' }, 404)
    const headers = new Headers()
    headers.set('Content-Type', object.httpMetadata?.contentType || mimeFor(name))
    headers.set('Cache-Control', 'public, max-age=3600')
    headers.set('Content-Disposition', `inline; filename="${name}"`)
    return new Response(object.body, { headers })
  }

  if (method === 'PUT' || method === 'DELETE') {
    if (!authorized(request, env)) {
      return json({ error: 'Upload key required.' }, 401)
    }
  }

  if (method === 'DELETE') {
    await env.MODELS.delete(key)
    return json({ ok: true, name })
  }

  if (method === 'PUT') {
    const length = Number(request.headers.get('content-length') || 0)
    if (length > MAX_BYTES) return json({ error: 'File is larger than 80 MB.' }, 413)
    const bytes = await request.arrayBuffer()
    if (bytes.byteLength > MAX_BYTES) return json({ error: 'File is larger than 80 MB.' }, 413)
    if (bytes.byteLength < 16) return json({ error: 'File is empty.' }, 400)
    await env.MODELS.put(key, bytes, {
      httpMetadata: { contentType: mimeFor(name) },
    })
    return json({ ok: true, name, size: bytes.byteLength })
  }

  return json({ error: 'Method not allowed' }, 405)
}

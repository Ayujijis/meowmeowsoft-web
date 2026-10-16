import {
  hasLabAccess,
  json,
  mimeFor,
  rewriteIndexHtml,
  sanitizeRelativePath,
  storagePrefix,
} from '../../_lib/dbmaker-lab.js'

const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_FILES = 4000

async function listFiles(env) {
  const listed = await env.MODELS.list({ prefix: storagePrefix() })
  return (listed.objects || []).map((object) => ({
    name: object.key.slice(storagePrefix().length),
    size: object.size,
    uploaded: object.uploaded,
  }))
}

export async function onRequest(context) {
  const { request, env, params } = context
  if (!env.MODELS) return json({ error: 'Private storage is not configured.' }, 503)
  if (!env.DBMAKER_LAB_KEY) return json({ error: 'DBmaker lab is not configured.' }, 503)

  const parts = [].concat(params.path || []).filter(Boolean)
  const route = parts[0] || ''
  const method = request.method.toUpperCase()

  if (route === 'status' && method === 'GET') {
    const allowed = await hasLabAccess(request, env)
    if (!allowed) return json({ error: 'Password required.' }, 401)
    const files = await listFiles(env)
    return json({
      files: files.length,
      hasApp: files.some((file) => file.name === 'index.html'),
      updated: files.reduce((latest, file) => Math.max(latest, Date.parse(file.uploaded || 0)), 0),
    })
  }

  if (route === 'files') {
    const relative = sanitizeRelativePath(parts.slice(1).join('/'))
    if (!relative) return json({ error: 'Invalid file path.' }, 400)
    const key = `${storagePrefix()}${relative}`

    if (method === 'PUT') {
      if (!(await hasLabAccess(request, env))) {
        return json({ error: 'Password required.' }, 401)
      }
      const length = Number(request.headers.get('content-length') || 0)
      if (length > MAX_FILE_BYTES) return json({ error: 'Single file limit is 25 MB.' }, 413)
      const bytes = await request.arrayBuffer()
      if (bytes.byteLength > MAX_FILE_BYTES) return json({ error: 'Single file limit is 25 MB.' }, 413)
      if (bytes.byteLength < 1) return json({ error: 'File is empty.' }, 400)

      const total = await listFiles(env)
      if (total.length >= MAX_FILES && !total.some((file) => file.name === relative)) {
        return json({ error: 'Too many files in this deployment.' }, 413)
      }

      await env.MODELS.put(key, bytes, {
        httpMetadata: { contentType: mimeFor(relative) },
      })
      return json({ ok: true, name: relative, size: bytes.byteLength })
    }

    if (method === 'DELETE') {
      if (!(await hasLabAccess(request, env))) {
        return json({ error: 'Password required.' }, 401)
      }
      await env.MODELS.delete(key)
      return json({ ok: true, name: relative })
    }

    return json({ error: 'Method not allowed' }, 405)
  }

  if (route === 'deploy' && method === 'DELETE') {
    if (!(await hasLabAccess(request, env))) {
      return json({ error: 'Password required.' }, 401)
    }
    const files = await listFiles(env)
    await Promise.all(files.map((file) => env.MODELS.delete(`${storagePrefix()}${file.name}`)))
    return json({ ok: true, removed: files.length })
  }

  if (route === 'app') {
    if (!(await hasLabAccess(request, env))) {
      return new Response('Password required.', { status: 401, headers: { 'Cache-Control': 'no-store' } })
    }

    const relative = sanitizeRelativePath(parts.slice(1).join('/')) || 'index.html'
    const key = `${storagePrefix()}${relative}`
    const object = await env.MODELS.get(key)
    if (!object) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

    const type = object.httpMetadata?.contentType || mimeFor(relative)
    if (relative === 'index.html' || relative.endsWith('.html')) {
      const html = await object.text()
      const rewritten = await rewriteIndexHtml(html)
      return new Response(rewritten, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      })
    }

    const headers = new Headers()
    headers.set('Content-Type', type)
    headers.set('Cache-Control', 'private, max-age=300')
    return new Response(object.body, { headers })
  }

  return json({ error: 'Not found' }, 404)
}

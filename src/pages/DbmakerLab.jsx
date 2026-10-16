import { useCallback, useEffect, useState } from 'react'

const SKIP_DIRS = new Set(['.git', 'node_modules'])
const SKIP_EXT = new Set(['.pdb', '.map'])

function shouldUpload(file) {
  const path = file.webkitRelativePath || file.name
  const parts = path.split('/')
  if (parts.some((part) => SKIP_DIRS.has(part))) return false
  const lower = path.toLowerCase()
  if (SKIP_EXT.has(lower.slice(lower.lastIndexOf('.')))) return false
  return true
}

function relativePath(file) {
  const raw = file.webkitRelativePath || file.name
  const parts = raw.split('/')
  if (parts.length > 1) parts.shift()
  return parts.join('/') || file.name
}

export default function DbmakerLab() {
  const [configured, setConfigured] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [deployInfo, setDeployInfo] = useState(null)
  const [dragging, setDragging] = useState(false)

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/dbmaker-lab/status', { credentials: 'include' })
      if (res.status === 401) {
        setAuthed(false)
        setDeployInfo(null)
        return
      }
      if (!res.ok) throw new Error('status failed')
      const data = await res.json()
      setAuthed(true)
      setDeployInfo(data)
    } catch {
      setDeployInfo(null)
    }
  }, [])

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/dbmaker-lab/session', { credentials: 'include' })
      const data = await res.json()
      setConfigured(Boolean(data.configured))
      if (data.ok) {
        setAuthed(true)
        await refreshStatus()
      } else {
        setAuthed(false)
      }
    } catch {
      setConfigured(false)
      setAuthed(false)
    }
  }, [refreshStatus])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      meta.remove()
    }
  }, [])

  async function onLogin(event) {
    event.preventDefault()
    setBusy(true)
    setStatus('')
    try {
      const res = await fetch('/api/dbmaker-lab/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus(data.error || 'Login failed.')
        setAuthed(false)
        return
      }
      setPassword('')
      setAuthed(true)
      setStatus('Access granted.')
      await refreshStatus()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function onLogout() {
    await fetch('/api/dbmaker-lab/session', { method: 'DELETE', credentials: 'include' })
    setAuthed(false)
    setDeployInfo(null)
    setStatus('Signed out.')
  }

  async function uploadFiles(fileList) {
    const files = [...fileList].filter(shouldUpload)
    if (!files.length) {
      setStatus('Pick a published DBmaker folder (with index.html).')
      return
    }
    if (!files.some((file) => relativePath(file) === 'index.html')) {
      setStatus('Folder must include index.html at the top level you select.')
      return
    }

    setBusy(true)
    setStatus('Clearing previous private build…')
    try {
      await fetch('/api/dbmaker-lab/deploy', { method: 'DELETE', credentials: 'include' })

      let done = 0
      for (const file of files) {
        const name = relativePath(file)
        setStatus(`Uploading ${done + 1}/${files.length}: ${name}`)
        const res = await fetch(`/api/dbmaker-lab/files/${encodeURIComponent(name)}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `Upload failed for ${name}`)
        done += 1
      }
      setStatus(`Uploaded ${done} files. Private branch is live below.`)
      await refreshStatus()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="dbmaker-lab">
      <p className="eyebrow">Private</p>
      <h1>DBmaker branch</h1>
      <p className="lede">
        Password-only preview for a DBmaker build. Files are stored in Cloudflare R2 — not in
        this public GitHub repo.
      </p>

      {!configured ? (
        <p className="hint">
          Set <code>DBMAKER_LAB_KEY</code> in Cloudflare Pages (and <code>.dev.vars</code> for local
          wrangler) to enable this page.
        </p>
      ) : null}

      {!authed ? (
        <form className="lab-login" onSubmit={onLogin}>
          <label className="key-field">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Shared preview password"
              disabled={!configured || busy}
            />
          </label>
          <button type="submit" className="btn" disabled={!configured || busy || !password}>
            Unlock
          </button>
        </form>
      ) : (
        <>
          <div className="lab-toolbar">
            <p className="hint">
              {deployInfo?.hasApp
                ? `${deployInfo.files} files deployed`
                : 'No build uploaded yet'}
            </p>
            <button type="button" className="btn btn-ghost" onClick={onLogout}>
              Sign out
            </button>
          </div>

          <h2>Upload branch</h2>
          <p className="hint">
            Choose the published output folder (for example Blazor{' '}
            <code>publish/wwwroot</code>). Only people with the password can open the app.
          </p>
          <div
            className={`dropzone ${dragging ? 'dropzone-active' : ''}`}
            onDragEnter={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              uploadFiles(e.dataTransfer.files)
            }}
          >
            <p>Drop your publish folder here, or choose it.</p>
            <label className="btn file-btn">
              Choose folder
              <input
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                disabled={busy}
                onChange={(e) => {
                  uploadFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </div>

          <h2>Preview</h2>
          {deployInfo?.hasApp ? (
            <iframe
              className="dbmaker-lab-frame"
              title="DBmaker private branch"
              src="/api/dbmaker-lab/app/"
            />
          ) : (
            <p className="viewer-empty lab-empty">Upload a build to preview it here.</p>
          )}
        </>
      )}

      {status ? <p className="model-status">{status}</p> : null}
    </article>
  )
}

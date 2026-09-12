import { useCallback, useEffect, useMemo, useState } from 'react'
import ThreeMfViewer from '../components/ThreeMfViewer.jsx'

const KEY_STORAGE = 'meowmeowsoft-upload-key'
const DB_NAME = 'meowmeowsoft-models'
const STORE = 'files'
const ACCEPT = '.glb,.gltf,.3mf,.blend,model/gltf-binary,model/gltf+json,model/3mf'
const ALLOWED = ['.glb', '.gltf', '.3mf', '.blend']

function extOf(name) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/)
  return match ? match[1] : ''
}

function isAllowed(name) {
  return ALLOWED.some((ext) => String(name || '').toLowerCase().endsWith(ext))
}

function prettySize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'name' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbList() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

async function idbPut(record) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function idbDelete(name) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export default function Models() {
  const [published, setPublished] = useState([])
  const [localModels, setLocalModels] = useState([])
  const [selected, setSelected] = useState('')
  const [localUrl, setLocalUrl] = useState('')
  const [localName, setLocalName] = useState('')
  const [uploadKey, setUploadKey] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    setUploadKey(sessionStorage.getItem(KEY_STORAGE) || '')
  }, [])

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl)
    }
  }, [localUrl])

  const refreshLocal = useCallback(async () => {
    try {
      const rows = await idbList()
      setLocalModels(rows)
    } catch {
      setLocalModels([])
    }
  }, [])

  const loadPublished = useCallback(async () => {
    try {
      const res = await fetch('/api/models')
      if (!res.ok) throw new Error('offline')
      const data = await res.json()
      setPublished(data.models || [])
    } catch {
      setPublished([])
    }
  }, [])

  useEffect(() => {
    refreshLocal()
    loadPublished()
  }, [refreshLocal, loadPublished])

  const viewerSrc = useMemo(() => {
    if (localUrl) return localUrl
    if (selected.startsWith('site:')) {
      return `/api/models/${encodeURIComponent(selected.slice(5))}`
    }
    return ''
  }, [localUrl, selected])

  function rememberKey(value) {
    setUploadKey(value)
    if (value) sessionStorage.setItem(KEY_STORAGE, value)
    else sessionStorage.removeItem(KEY_STORAGE)
  }

  function showBlob(file) {
    if (localUrl) URL.revokeObjectURL(localUrl)
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    setLocalName(file.name)
    setSelected('')
  }

  async function onFiles(fileList) {
    const file = fileList?.[0]
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!isAllowed(lower)) {
      setStatus('Use a .glb, .gltf, .3mf, or .blend file.')
      return
    }
    showBlob(file)
    setBusy(true)
    try {
      await idbPut({
        name: file.name,
        size: file.size,
        type: file.type,
        blob: file,
        added: Date.now(),
      })
      await refreshLocal()
      setStatus(`Saved ${file.name} on this device.`)
      if (uploadKey) {
        const res = await fetch(`/api/models/${encodeURIComponent(file.name)}`, {
          method: 'PUT',
          headers: {
            'x-upload-key': uploadKey,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setStatus(
            `Saved on this device. Publishing needs R2 enabled in Cloudflare (${data.error || res.status}).`,
          )
        } else {
          await loadPublished()
          setStatus(`Published ${data.name || file.name}`)
        }
      }
    } catch (error) {
      setStatus(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function openLocal(record) {
    showBlob(record.blob)
    setStatus('')
  }

  async function removeLocal(name) {
    await idbDelete(name)
    if (localName === name) {
      if (localUrl) URL.revokeObjectURL(localUrl)
      setLocalUrl('')
      setLocalName('')
    }
    await refreshLocal()
    setStatus(`Removed ${name} from this device.`)
  }

  async function removePublished(name) {
    if (!uploadKey) {
      setStatus('Add your upload key to delete a published model.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/models/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { 'x-upload-key': uploadKey },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Delete failed.')
      if (selected === `site:${name}`) setSelected('')
      await loadPublished()
      setStatus(`Removed ${name} from the site.`)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="models">
      <p className="eyebrow">3D</p>
      <h1>Models</h1>
      <p className="lede">
        Drop a <code>.glb</code>, <code>.gltf</code>, <code>.3mf</code>, or{' '}
        <code>.blend</code> file. glTF and 3MF orbit in the viewer. Blender
        files are stored here and download to open in Blender.
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
          onFiles(e.dataTransfer.files)
        }}
      >
        <p>Drop a model here, or choose a file.</p>
        <label className="btn file-btn">
          Choose file
          <input
            type="file"
            accept={ACCEPT}
            disabled={busy}
            onChange={(e) => {
              onFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      <div className="viewer-wrap">
        {viewerSrc && ['glb', 'gltf'].includes(extOf(localName || selected.replace(/^site:/, ''))) ? (
          <model-viewer
            src={viewerSrc}
            alt={localName || selected || '3D model'}
            camera-controls
            auto-rotate
            shadow-intensity="1"
            touch-action="pan-y"
          />
        ) : viewerSrc && extOf(localName || selected.replace(/^site:/, '')) === '3mf' ? (
          <ThreeMfViewer src={viewerSrc} />
        ) : viewerSrc && extOf(localName || selected.replace(/^site:/, '')) === 'blend' ? (
          <div className="viewer-empty viewer-file">
            <p>{localName || selected.replace(/^site:/, '')}</p>
            <p>Blender files cannot preview in the browser.</p>
            <a className="btn" href={viewerSrc} download={localName || selected.replace(/^site:/, '')}>
              Download
            </a>
          </div>
        ) : (
          <p className="viewer-empty">No model selected yet.</p>
        )}
      </div>

      <label className="key-field">
        Upload key
        <input
          type="password"
          autoComplete="off"
          value={uploadKey}
          onChange={(e) => rememberKey(e.target.value)}
          placeholder="Optional — publish to the site"
        />
      </label>
      {status ? <p className="model-status">{status}</p> : null}

      <h2>On this device</h2>
      {localModels.length === 0 ? (
        <p className="hint">Nothing saved in this browser yet.</p>
      ) : (
        <ul className="model-list">
          {localModels.map((model) => (
            <li key={model.name}>
              <button type="button" onClick={() => openLocal(model)}>
                {model.name}
                <span>{prettySize(model.size)}</span>
              </button>
              <button
                type="button"
                className="linkish"
                onClick={() => removeLocal(model.name)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2>On the site</h2>
      {published.length === 0 ? (
        <p className="hint">
          No public models yet. Enable R2 in the Cloudflare dashboard, then
          upload with the key so visitors can see them too.
        </p>
      ) : (
        <ul className="model-list">
          {published.map((model) => (
            <li key={model.name}>
              <button
                type="button"
                className={selected === `site:${model.name}` && !localUrl ? 'active' : ''}
                onClick={() => {
                  if (localUrl) URL.revokeObjectURL(localUrl)
                  setLocalUrl('')
                  setLocalName('')
                  setSelected(`site:${model.name}`)
                  setStatus('')
                }}
              >
                {model.name}
                <span>{prettySize(model.size)}</span>
              </button>
              <button
                type="button"
                className="linkish"
                disabled={busy}
                onClick={() => removePublished(model.name)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

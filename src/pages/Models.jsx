import { useCallback, useEffect, useMemo, useState } from 'react'
import ThreeMfViewer from '../components/ThreeMfViewer.jsx'
import { bundledModels } from '../data/gallery.js'

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

function Mosaic({ items, activeId, onOpen }) {
  if (!items.length) return <p className="hint">Nothing in this gallery yet.</p>
  return (
    <ul className="mosaic">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`mosaic-tile ${activeId === item.id ? 'active' : ''}`}
            onClick={() => onOpen(item)}
          >
            <span className="mosaic-thumb">
              {item.thumb ? <img src={item.thumb} alt="" /> : extOf(item.name)}
            </span>
            <span className="mosaic-name">{item.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function Models() {
  const [published, setPublished] = useState([])
  const [localModels, setLocalModels] = useState([])
  const [activeId, setActiveId] = useState('')
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
      setLocalModels(await idbList())
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

  const gallery = useMemo(() => {
    const bundled = bundledModels.map((model) => ({
      id: `bundled:${model.name}`,
      name: model.name,
      thumb: model.thumb,
      kind: 'bundled',
    }))
    const device = localModels.map((model) => ({
      id: `device:${model.name}`,
      name: model.name,
      thumb: null,
      kind: 'device',
      blob: model.blob,
    }))
    const site = published.map((model) => ({
      id: `site:${model.name}`,
      name: model.name,
      thumb: null,
      kind: 'site',
    }))
    return [...bundled, ...device, ...site]
  }, [localModels, published])

  const viewerSrc = useMemo(() => {
    if (localUrl) return localUrl
    if (activeId.startsWith('site:')) {
      return `/api/models/${encodeURIComponent(activeId.slice(5))}`
    }
    if (activeId.startsWith('bundled:')) {
      const found = bundledModels.find((model) => model.name === activeId.slice(8))
      return found?.href || ''
    }
    return ''
  }, [localUrl, activeId])

  const activeName = localName || activeId.replace(/^(site|bundled|device):/, '')
  const activeExt = extOf(activeName)

  function rememberKey(value) {
    setUploadKey(value)
    if (value) sessionStorage.setItem(KEY_STORAGE, value)
    else sessionStorage.removeItem(KEY_STORAGE)
  }

  function showBlob(file, id) {
    if (localUrl) URL.revokeObjectURL(localUrl)
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    setLocalName(file.name)
    setActiveId(id || `device:${file.name}`)
  }

  function openItem(item) {
    if (item.kind === 'device' && item.blob) {
      showBlob(item.blob, item.id)
      setStatus('')
      return
    }
    if (localUrl) URL.revokeObjectURL(localUrl)
    setLocalUrl('')
    setLocalName(item.name)
    setActiveId(item.id)
    setStatus('')
  }

  async function onFiles(fileList) {
    const file = fileList?.[0]
    if (!file) return
    if (!isAllowed(file.name.toLowerCase())) {
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

  return (
    <article className="models">
      <p className="eyebrow">3D</p>
      <h1>Models</h1>
      <p className="lede">
        Click a tile to open it in the viewer, then download. Drop a{' '}
        <code>.glb</code>, <code>.gltf</code>, <code>.3mf</code>, or{' '}
        <code>.blend</code> to add one. Blender files download to open in Blender.
      </p>

      <h2>Gallery</h2>
      <Mosaic items={gallery} activeId={activeId} onOpen={openItem} />

      <div className="viewer-bar">
        <p>{activeName || 'Pick a tile'}</p>
        {viewerSrc ? (
          <a className="btn" href={viewerSrc} download={activeName}>
            Download
          </a>
        ) : null}
      </div>
      <div className="viewer-wrap">
        {viewerSrc && ['glb', 'gltf'].includes(activeExt) ? (
          <model-viewer
            src={viewerSrc}
            alt={activeName || '3D model'}
            camera-controls
            auto-rotate
            interaction-prompt="none"
            shadow-intensity="1"
            touch-action="pan-y"
          />
        ) : viewerSrc && activeExt === '3mf' ? (
          <ThreeMfViewer src={viewerSrc} />
        ) : viewerSrc && activeExt === 'blend' ? (
          <div className="viewer-empty viewer-file">
            <p>{activeName}</p>
            <p>Blender files cannot preview in the browser.</p>
          </div>
        ) : (
          <p className="viewer-empty">No model selected yet.</p>
        )}
      </div>

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
    </article>
  )
}

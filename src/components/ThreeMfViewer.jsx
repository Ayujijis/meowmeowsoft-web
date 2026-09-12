import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js'

export default function ThreeMfViewer({ src }) {
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !src) return undefined
    host.dataset.ready = '0'

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100000)
    camera.position.set(2, 2, 2)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    scene.add(new THREE.AmbientLight(0xffffff, 0.85))
    const key = new THREE.DirectionalLight(0xffffff, 1.15)
    key.position.set(4, 8, 6)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.35)
    fill.position.set(-6, 2, -4)
    scene.add(fill)

    const loader = new ThreeMFLoader()
    let frame = 0
    let disposed = false

    function resize() {
      const { clientWidth, clientHeight } = host
      if (!clientWidth || !clientHeight) return
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight, true)
    }

    function fit(root) {
      root.updateMatrixWorld(true)
      const box = new THREE.Box3()
      let meshCount = 0
      root.traverse((child) => {
        if (!child.isMesh || !child.geometry) return
        meshCount += 1
        if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
        const childBox = child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld)
        if (meshCount === 1) box.copy(childBox)
        else box.union(childBox)
      })
      if (!meshCount || box.isEmpty()) return
      const center = box.getCenter(new THREE.Vector3())
      root.position.sub(center)
      root.updateMatrixWorld(true)
      const size = box.getSize(new THREE.Vector3())
      const radius = Math.max(size.x, size.y, size.z, 0.001) * 0.5
      const dist = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.2
      controls.target.set(0, 0, 0)
      camera.near = Math.max(dist / 200, 0.01)
      camera.far = Math.max(dist * 40, 100)
      camera.position.set(dist * 0.72, dist * 0.48, dist * 0.72)
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix()
      controls.update()
    }

    function tick() {
      if (disposed) return
      controls.update()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    tick()

    loader.load(
      src,
      (object) => {
        if (disposed) return
        scene.add(object)
        resize()
        fit(object)
        renderer.render(scene, camera)
        host.dataset.ready = '1'
      },
      undefined,
      () => {
        /* load error shown by empty scene */
      },
    )

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [src])

  return <div className="three-host" ref={hostRef} />
}

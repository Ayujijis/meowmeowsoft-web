import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js'

export default function ThreeMfViewer({ src }) {
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !src) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000)
    camera.position.set(2, 2, 2)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const key = new THREE.DirectionalLight(0xffffff, 1.1)
    key.position.set(4, 8, 6)
    scene.add(key)

    const loader = new ThreeMFLoader()
    let frame = 0
    let disposed = false

    function resize() {
      const { clientWidth, clientHeight } = host
      if (!clientWidth || !clientHeight) return
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight, false)
    }

    function fit(object) {
      const box = new THREE.Box3().setFromObject(object)
      const size = box.getSize(new THREE.Vector3()).length() || 1
      const center = box.getCenter(new THREE.Vector3())
      controls.target.copy(center)
      camera.near = size / 100
      camera.far = size * 20
      camera.position.copy(center).add(new THREE.Vector3(size * 0.55, size * 0.45, size * 0.55))
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
        fit(object)
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

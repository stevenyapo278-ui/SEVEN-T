import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * HeroScene3D — Three.js WebGL
 * Globe de particules 3D + réseau filaire + sphères satellites orbitales
 * Parallaxe interactive selon la souris.
 */
export default function HeroScene3D({ isDark = true }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    /* ── Renderer ─────────────────────────────────────── */
    const W = el.clientWidth
    const H = el.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    /* ── Scene / Camera ───────────────────────────────── */
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    camera.position.set(0, 0, 5.5)

    /* ── Palette ──────────────────────────────────────── */
    const primaryHex  = isDark ? 0x3b82f6 : 0x2563eb
    const accentHex   = isDark ? 0xf59e0b : 0xd97706
    const particleHex = isDark ? 0x93c5fd : 0x60a5fa

    /* ── Globe de particules ──────────────────────────── */
    const COUNT = 2400
    const positArr = new Float32Array(COUNT * 3)
    const colorArr  = new Float32Array(COUNT * 3)
    const pC = new THREE.Color(particleHex)
    const aC = new THREE.Color(accentHex)

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.acos(2 * Math.random() - 1)
      const phi   = 2 * Math.PI * Math.random()
      const r     = 2.2 + (Math.random() - 0.5) * 0.14

      positArr[i * 3]     = r * Math.sin(theta) * Math.cos(phi)
      positArr[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi)
      positArr[i * 3 + 2] = r * Math.cos(theta)

      // Gradient de couleur
      const t = (Math.cos(theta) + 1) / 2
      const c = pC.clone().lerp(aC, t * 0.45)
      colorArr[i * 3]     = c.r
      colorArr[i * 3 + 1] = c.g
      colorArr[i * 3 + 2] = c.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positArr, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(colorArr, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.024,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.88 : 0.65,
      sizeAttenuation: true,
    })

    const globe = new THREE.Points(geo, mat)
    scene.add(globe)

    /* ── Réseau filaire (latitudes / longitudes) ──────── */
    const wireMat = new THREE.LineBasicMaterial({
      color: primaryHex,
      transparent: true,
      opacity: isDark ? 0.07 : 0.05,
    })
    const addWire = (pts) => scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts), wireMat
    ))

    for (let lat = -75; lat <= 75; lat += 25) {
      const pts = []
      for (let lng = 0; lng <= 360; lng += 4) {
        const p = (lng * Math.PI) / 180
        const t = ((90 - lat) * Math.PI) / 180
        pts.push(new THREE.Vector3(2.25 * Math.sin(t) * Math.cos(p), 2.25 * Math.cos(t), 2.25 * Math.sin(t) * Math.sin(p)))
      }
      addWire(pts)
    }
    for (let lng = 0; lng < 360; lng += 30) {
      const pts = []
      for (let lat = -90; lat <= 90; lat += 3) {
        const p = (lng * Math.PI) / 180
        const t = ((90 - lat) * Math.PI) / 180
        pts.push(new THREE.Vector3(2.25 * Math.sin(t) * Math.cos(p), 2.25 * Math.cos(t), 2.25 * Math.sin(t) * Math.sin(p)))
      }
      addWire(pts)
    }

    /* ── Sphères satellites ───────────────────────────── */
    const satsData = [
      { r: 0.13, orbit: 3.0, speed: 0.32, color: accentHex,   tiltY: 0.6,  tiltZ: 0.2, phase: 0 },
      { r: 0.08, orbit: 3.5, speed: 0.19, color: primaryHex,  tiltY: -0.4, tiltZ: 0.5, phase: Math.PI * 0.7 },
      { r: 0.10, orbit: 3.2, speed: 0.26, color: accentHex,   tiltY: 0.2,  tiltZ: -0.3,phase: Math.PI * 1.4 },
    ]
    const sats = satsData.map(d => {
      const satGeo = new THREE.SphereGeometry(d.r, 20, 20)
      const satMat = new THREE.MeshStandardMaterial({
        color: d.color,
        emissive: d.color,
        emissiveIntensity: isDark ? 1.4 : 0.7,
        roughness: 0.25,
        metalness: 0.8,
      })
      const mesh = new THREE.Mesh(satGeo, satMat)

      // Halo doux
      const hGeo = new THREE.SphereGeometry(d.r * 2.8, 16, 16)
      const hMat = new THREE.MeshBasicMaterial({
        color: d.color,
        transparent: true,
        opacity: 0.07,
        side: THREE.FrontSide,
      })
      mesh.add(new THREE.Mesh(hGeo, hMat))

      scene.add(mesh)
      return { mesh, ...d, angle: d.phase }
    })

    /* ── Lumières ─────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0xffffff, isDark ? 0.35 : 0.7))

    const dirLight = new THREE.DirectionalLight(accentHex, isDark ? 1.8 : 1.0)
    dirLight.position.set(5, 5, 5)
    scene.add(dirLight)

    const ptBlue = new THREE.PointLight(primaryHex, isDark ? 2.5 : 1.0, 14)
    ptBlue.position.set(-3, 1.5, 2)
    scene.add(ptBlue)

    /* ── Parallaxe souris ─────────────────────────────── */
    let mx = 0, my = 0
    const onMouse = (e) => {
      const r = el.getBoundingClientRect()
      mx = ((e.clientX - r.left) / r.width  - 0.5) * 2
      my = ((e.clientY - r.top)  / r.height - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouse)

    /* ── Resize ───────────────────────────────────────── */
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    /* ── Boucle ───────────────────────────────────────── */
    let raf
    const startTime = performance.now()
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const t = (performance.now() - startTime) / 1000

      if (!prefersReduced) {
        // Rotation du globe
        globe.rotation.y = t * 0.07
        globe.rotation.x = Math.sin(t * 0.04) * 0.06

        // Parallaxe caméra
        camera.position.x += (mx * 0.45 - camera.position.x) * 0.04
        camera.position.y += (-my * 0.28 - camera.position.y) * 0.04
        camera.lookAt(scene.position)

        // Satellites orbitaux
        sats.forEach((s) => {
          s.angle += s.speed * 0.01
          s.mesh.position.set(
            Math.cos(s.angle) * s.orbit,
            s.tiltY + Math.sin(t * 0.45 + s.phase) * 0.22,
            Math.sin(s.angle) * s.orbit
          )
          // Pulsation du halo
          const child = s.mesh.children[0]
          if (child) child.scale.setScalar(1 + 0.18 * Math.sin(t * 2.8 + s.phase))
        })

        // Légère pulsation du globe
        const p = 1 + 0.018 * Math.sin(t * 0.55)
        globe.scale.setScalar(p)
      }

      renderer.render(scene, camera)
    }

    animate()

    /* ── Cleanup ──────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [isDark])

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
      aria-hidden
    />
  )
}

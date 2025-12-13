import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type SatelliteConfig = {
  radius: number;
  speed: number;
  size: number;
  phase: number;
};

export function HeroOrbit3DIsland() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.6, 4);

    const resize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

      renderer.setPixelRatio(Math.min(pixelRatio, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0x22d3ee, 1.2);
    light1.position.set(2.5, 3, 3);
    scene.add(light1);

    const light2 = new THREE.PointLight(0x38bdf8, 0.6);
    light2.position.set(-3, -2, -4);
    scene.add(light2);

    const panelGeometry = new THREE.PlaneGeometry(7, 3.2);
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.9,
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(0, 0, -2.2);
    scene.add(panel);

    const coreGeometry = new THREE.IcosahedronGeometry(0.55, 1);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0f172a,
      emissiveIntensity: 0.8,
      metalness: 0.6,
      roughness: 0.25,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.castShadow = true;
    core.receiveShadow = true;
    scene.add(core);

    const ringGeometry = new THREE.TorusGeometry(1.7, 0.035, 18, 80);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2.4;
    scene.add(ring);

    const satellitesConfig: SatelliteConfig[] = [
      { radius: 1.6, speed: 0.45, size: 0.32, phase: 0 },
      { radius: 2.0, speed: -0.36, size: 0.34, phase: Math.PI / 3 },
      { radius: 2.4, speed: 0.3, size: 0.3, phase: (2 * Math.PI) / 3 },
      { radius: 1.9, speed: -0.5, size: 0.28, phase: Math.PI },
      { radius: 2.7, speed: 0.26, size: 0.33, phase: (4 * Math.PI) / 3 },
      { radius: 2.2, speed: -0.42, size: 0.3, phase: (5 * Math.PI) / 3 },
    ];

    const satellites: THREE.Mesh[] = satellitesConfig.map((config) => {
      const geometry = new THREE.SphereGeometry(config.size, 20, 20);
      const material = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0f172a,
        emissiveIntensity: 0.6,
        metalness: 0.5,
        roughness: 0.35,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    });

    let frameId: number;
    const startTime = performance.now();

    const renderFrame = (time: number) => {
      const elapsedSeconds = (time - startTime) / 1000;

      const rotationSpeed = 0.25;
      const tCore = elapsedSeconds * rotationSpeed;
      core.rotation.y = tCore;
      core.rotation.x = tCore * 0.6;

      ring.rotation.z = tCore * 0.5;

      const cameraOrbitRadius = 3.5;
      const cameraSpeed = 0.08;
      const tCam = elapsedSeconds * cameraSpeed;
      camera.position.x = Math.sin(tCam) * cameraOrbitRadius;
      camera.position.z = Math.cos(tCam) * cameraOrbitRadius;
      camera.position.y = 0.6 + Math.sin(tCam * 0.3) * 0.15;
      camera.lookAt(0, 0, 0);

      satellites.forEach((mesh, index) => {
        const config = satellitesConfig[index];
        const t = elapsedSeconds * config.speed + config.phase;
        const x = Math.cos(t) * config.radius;
        const z = Math.sin(t) * config.radius;
        const y = Math.sin(t * 0.85) * 0.2;

        mesh.position.set(x, y, z);
        mesh.rotation.y = t * 1.2;
        mesh.rotation.x = t * 0.4;
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(renderFrame);
    };

    resize();
    frameId = requestAnimationFrame(renderFrame);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }

      satellites.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });

      panelGeometry.dispose();
      panelMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-3xl bg-slate-950/70 border border-emerald-400/20 shadow-[0_0_40px_rgba(34,211,238,0.16)] overflow-hidden"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

export default HeroOrbit3DIsland;

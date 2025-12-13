import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  stream: MediaStream | null;
  className?: string;
}

/**
 * Three.js-based particle visualizer for the voice transcriptor.
 *
 * Renders a sphere of particles whose shape gently morphs based on
 * audio frequency energy (low/mid/high bands). If no audio stream is
 * present, it shows an idle breathing animation.
 */
export default function VisualizerParticles3D({ stream, className }: Props) {
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
    camera.position.set(0, 0, 3.2);

    const resize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

      renderer.setPixelRatio(Math.min(pixelRatio, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0x6366f1, 1.2);
    light1.position.set(2.5, 3, 3);
    scene.add(light1);

    const light2 = new THREE.PointLight(0x22d3ee, 0.8);
    light2.position.set(-3, -2, -4);
    scene.add(light2);

    const particleCount = 2200;
    const radius = 1.05;

    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.75 + Math.random() * 0.25);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      basePositions[i3] = x;
      basePositions[i3 + 1] = y;
      basePositions[i3 + 2] = z;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x6366f1,
      size: 0.03,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Optional faint glow sphere
    const glowGeometry = new THREE.SphereGeometry(radius * 1.05, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x1d4ed8,
      transparent: true,
      opacity: 0.12,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);

    // Audio setup (optional) -------------------------------------------------
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let freqData: Uint8Array | null = null;

    if (stream) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioCtx();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        freqData = new Uint8Array(analyser.frequencyBinCount);
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
      } catch {
        audioCtx = null;
        analyser = null;
        source = null;
        freqData = null;
      }
    }

    let frameId: number | undefined;
    const startTime = performance.now();

    let lowSmooth = 0;
    let midSmooth = 0;
    let highSmooth = 0;

    const renderFrame = (time: number) => {
      const elapsed = (time - startTime) / 1000;

      let lowAmp = 0;
      let midAmp = 0;
      let highAmp = 0;

      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        const len = freqData.length;
        if (len > 0) {
          const third = Math.floor(len / 3) || 1;
          let lowSum = 0;
          let midSum = 0;
          let highSum = 0;
          for (let i = 0; i < len; i++) {
            const v = freqData[i];
            if (i < third) lowSum += v;
            else if (i < 2 * third) midSum += v;
            else highSum += v;
          }
          lowAmp = lowSum / (third * 255);
          midAmp = midSum / (third * 255);
          highAmp = highSum / (Math.max(len - 2 * third, 1) * 255);
        }
      }

      const idleBreath = 0.08 * (0.5 + 0.5 * Math.sin(elapsed * 1));

      const riseFactor = 0.45;
      const fallFactor = 0.12;

      const lowFactor = lowAmp > lowSmooth ? riseFactor : fallFactor;
      const midFactor = midAmp > midSmooth ? riseFactor : fallFactor;
      const highFactor = highAmp > highSmooth ? riseFactor : fallFactor;

      lowSmooth += (lowAmp - lowSmooth) * lowFactor;
      midSmooth += (midAmp - midSmooth) * midFactor;
      highSmooth += (highAmp - highSmooth) * highFactor;

      const lowBoost = Math.min(lowSmooth * lowSmooth * 3, 1.6);
      const midBoost = Math.min(midSmooth * midSmooth * 3.6, 1.9);
      const highBoost = Math.min(highSmooth * highSmooth * 4.2, 2.2);

      const globalScale = 1 + idleBreath;
      const midInfluence = midBoost;

      const pos = geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const bx = basePositions[i3];
        const by = basePositions[i3 + 1];
        const bz = basePositions[i3 + 2];

        const radial = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
        const nx = bx / radial;
        const ny = by / radial;
        const nz = bz / radial;

        const radialNorm = radial / radius;

        // Band-spezifische "Loben":
        // - Bass (low) dehnt entlang Y-Achse (oben/unten)
        // - Mids entlang X-Achse (links/rechts)
        // - Highs entlang Z-Achse (vorne/hinten)
        const lowLobe = lowBoost * Math.pow(Math.abs(ny), 1.4);
        const midLobe = midBoost * Math.pow(Math.abs(nx), 1.4);
        const highLobe = highBoost * Math.pow(Math.abs(nz), 1.4);

        const bandWave = Math.sin(radial * 6 - elapsed * 2.8) * midInfluence * 0.8;
        const pulse = lowBoost * 0.6;

        const swirl = Math.sin(elapsed * 0.8 + i * 0.15) * midInfluence * 0.25 * radialNorm;

        const lobeScale = 1 + lowLobe + midLobe + highLobe;
        const rBase = radial * globalScale * lobeScale + pulse + bandWave * radialNorm;

        const r = rBase;

        arr[i3] = nx * r + swirl * -ny;
        arr[i3 + 1] = ny * r + swirl * nx;
        arr[i3 + 2] = nz * r;
      }

      pos.needsUpdate = true;

      const energy = Math.min(lowBoost * 0.7 + midBoost * 1 + highBoost * 1.3, 2.5);

      const limitedEnergy = Math.min(energy, 1.5);
      const hue = 0.62 - limitedEnergy * 0.18;
      const saturation = 0.6 + Math.min(energy, 1.2) * 0.25;
      const lightness = 0.5 + Math.min(energy, 1) * 0.15;

      material.color.setHSL(hue, saturation, lightness);
      material.size = 0.03 + Math.min(energy, 1.5) * 0.05;
      glowMaterial.opacity = 0.08 + Math.min(energy, 1.5) * 0.3;

      points.rotation.y = elapsed * 0.45;
      points.rotation.x = elapsed * 0.22;
      glow.rotation.y = elapsed * 0.3;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(renderFrame);
    };

    resize();
    frameId = requestAnimationFrame(renderFrame);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (frameId !== undefined) cancelAnimationFrame(frameId);

      if (source) {
        try {
          source.disconnect();
        } catch {}
      }
      if (analyser) {
        try {
          analyser.disconnect();
        } catch {}
      }
      if (audioCtx) {
        try {
          audioCtx.close();
        } catch {}
      }

      geometry.dispose();
      material.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      renderer.dispose();
    };
  }, [stream]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="w-full h-40 block" />
    </div>
  );
}

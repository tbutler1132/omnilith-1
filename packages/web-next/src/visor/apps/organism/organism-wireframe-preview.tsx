/**
 * Organism wireframe preview.
 *
 * Renders a small Three.js wireframe panel keyed by current content type
 * so the Organism app has an at-a-glance spatial signature.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { resolveWireframeModelSpec } from './wireframe-model-spec.js';

interface OrganismWireframePreviewProps {
  readonly contentTypeId: string | null;
}

export function OrganismWireframePreview({ contentTypeId }: OrganismWireframePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let frameId = 0;
    let cleanupResize: (() => void) | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let edgeGeometry: THREE.BufferGeometry | null = null;
    let meshMaterial: THREE.Material | null = null;
    let edgeMaterial: THREE.Material | null = null;
    setLoadError(null);

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    try {
      const spec = resolveWireframeModelSpec(contentTypeId);
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 0, 3);

      geometry =
        spec.geometryKind === 'icosahedron'
          ? new THREE.IcosahedronGeometry(0.95, 0)
          : new THREE.BoxGeometry(1.5, 1.5, 1.5, 1, 1, 1);

      meshMaterial = new THREE.MeshBasicMaterial({
        color: spec.colorHex,
        wireframe: true,
      });
      const mesh = new THREE.Mesh(geometry, meshMaterial);
      scene.add(mesh);

      edgeGeometry = new THREE.EdgesGeometry(geometry);
      edgeMaterial = new THREE.LineBasicMaterial({
        color: spec.colorHex,
        transparent: true,
        opacity: 0.48,
      });
      const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      scene.add(edgeLines);

      const resize = () => {
        const host = canvas.parentElement;
        const width = Math.max(host?.clientWidth ?? 0, 1);
        const height = Math.max(host?.clientHeight ?? 0, 1);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        renderer?.setPixelRatio(pixelRatio);
        renderer?.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      const renderScene = () => {
        renderer?.render(scene, camera);
      };

      resize();
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

      if (mediaQuery.matches) {
        renderScene();
      } else {
        const animate = () => {
          if (disposed) {
            return;
          }

          mesh.rotation.x = 0;
          mesh.rotation.y += spec.rotationSpeedY;
          edgeLines.rotation.x = mesh.rotation.x;
          edgeLines.rotation.y = mesh.rotation.y;

          renderScene();
          frameId = window.requestAnimationFrame(animate);
        };

        frameId = window.requestAnimationFrame(animate);
      }

      const handleResize = () => {
        if (disposed) return;
        resize();
        renderScene();
      };
      window.addEventListener('resize', handleResize);
      cleanupResize = () => {
        window.removeEventListener('resize', handleResize);
      };
    } catch {
      if (!disposed) {
        setLoadError('Wireframe preview unavailable on this device.');
      }
    }

    return () => {
      disposed = true;
      cleanupResize?.();
      window.cancelAnimationFrame(frameId);
      edgeGeometry?.dispose();
      edgeMaterial?.dispose();
      geometry?.dispose();
      meshMaterial?.dispose();
      renderer?.dispose();
    };
  }, [contentTypeId]);

  return (
    <div className="organism-wireframe-panel">
      {loadError ? <p className="organism-wireframe-fallback">{loadError}</p> : null}
      <canvas
        ref={canvasRef}
        className="organism-wireframe-canvas"
        style={loadError ? { display: 'none' } : undefined}
      />
    </div>
  );
}

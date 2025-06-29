import React, { useRef, useMemo } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function ZoomCamera({ renderTarget }) {
  const camera = useRef();
  const { pointer, camera: mainCamera } = useThree();
  const cursorAiming = useGameStore((state) => state.cursorAiming);
  
  useFrame((state) => {
    if (!cursorAiming || !camera.current) return;
    
    // Calculate cursor world position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, mainCamera);
    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 40.5);
    const cursorWorld = new THREE.Vector3();
    raycaster.ray.intersectPlane(targetPlane, cursorWorld);
    
    if (cursorWorld) {
      // Position zoom camera for close-up view
      camera.current.position.set(
        cursorWorld.x + 5,
        cursorWorld.y + 3,
        cursorWorld.z + 8
      );
      camera.current.lookAt(cursorWorld);
      
      // Render to texture
      state.gl.setRenderTarget(renderTarget);
      state.gl.render(state.scene, camera.current);
      state.gl.setRenderTarget(null);
    }
  });

  return (
    <perspectiveCamera
      ref={camera}
      fov={30}
      aspect={1}
      near={0.1}
      far={1000}
    />
  );
}

function AdvancedZoomOverlay() {
  const { gl, scene } = useThree();
  const cursorAiming = useGameStore((state) => state.cursorAiming);
  
  // Create render target for zoom view
  const renderTarget = useMemo(() => {
    return new THREE.WebGLRenderTarget(256, 256, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  }, []);
  
  if (!cursorAiming) return null;

  return (
    <>
      {/* Zoom camera that renders to texture */}
      <ZoomCamera renderTarget={renderTarget} />
      
      {/* Overlay quad that displays the render target */}
      <mesh position={[15, 8, -20]}>
        <planeGeometry args={[8, 6]} />
        <meshBasicMaterial map={renderTarget.texture} />
      </mesh>
    </>
  );
}

export default AdvancedZoomOverlay;
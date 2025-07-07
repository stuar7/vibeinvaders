import { MeshBVH } from 'three-mesh-bvh';
import * as THREE from 'three';

/**
 * Optional enhancement for debris collision using three-mesh-bvh
 * This can be used to make debris particles bounce off the ground or other objects
 */

export class DebrisCollisionSystem {
  constructor() {
    this.collisionMeshes = [];
    this.debrisParticles = [];
    this.raycaster = new THREE.Raycaster();
  }

  // Add a mesh to the collision system
  addCollisionMesh(mesh) {
    if (mesh.geometry) {
      // Generate BVH for the mesh
      mesh.geometry.computeBoundsTree = () => {
        mesh.geometry.boundsTree = new MeshBVH(mesh.geometry);
      };
      mesh.geometry.computeBoundsTree();
      
      this.collisionMeshes.push(mesh);
    }
  }

  // Check collision for a single debris particle
  checkDebrisCollision(particle, velocity, delta) {
    const nextPosition = particle.position.clone().add(
      velocity.clone().multiplyScalar(delta)
    );
    
    // Set up ray from current position to next position
    const direction = nextPosition.clone().sub(particle.position).normalize();
    const distance = particle.position.distanceTo(nextPosition);
    
    this.raycaster.set(particle.position, direction);
    this.raycaster.near = 0;
    this.raycaster.far = distance + particle.scale.x; // Account for particle size
    
    // Check intersections with all collision meshes
    for (const mesh of this.collisionMeshes) {
      if (mesh.geometry.boundsTree) {
        // Use BVH for fast intersection test
        const intersects = this.raycaster.intersectObject(mesh, false);
        
        if (intersects.length > 0) {
          const hit = intersects[0];
          
          // Calculate bounce
          const normal = hit.face.normal.clone();
          normal.transformDirection(mesh.matrixWorld);
          
          // Reflect velocity off the surface
          const dot = velocity.dot(normal);
          velocity.sub(normal.multiplyScalar(2 * dot));
          
          // Apply some damping
          velocity.multiplyScalar(0.6);
          
          // Move particle slightly away from surface to prevent sticking
          particle.position.add(normal.multiplyScalar(particle.scale.x * 0.5));
          
          return true; // Collision occurred
        }
      }
    }
    
    return false; // No collision
  }

  // Update all debris particles
  updateDebris(debrisData, delta) {
    for (let i = 0; i < debrisData.count; i++) {
      if (debrisData.lifetimes[i] > 0) {
        const i3 = i * 3;
        
        // Create temporary particle object
        const particle = {
          position: new THREE.Vector3(
            debrisData.positions[i3],
            debrisData.positions[i3 + 1],
            debrisData.positions[i3 + 2]
          ),
          scale: new THREE.Vector3(1, 1, 1).multiplyScalar(debrisData.sizes[i] * 0.1)
        };
        
        // Create velocity vector
        const velocity = new THREE.Vector3(
          debrisData.directions[i3] * debrisData.velocities[i],
          debrisData.directions[i3 + 1] * debrisData.velocities[i],
          debrisData.directions[i3 + 2] * debrisData.velocities[i]
        );
        
        // Check collision
        const collided = this.checkDebrisCollision(particle, velocity, delta);
        
        if (collided) {
          // Update directions based on reflected velocity
          const length = velocity.length();
          if (length > 0) {
            velocity.normalize();
            debrisData.directions[i3] = velocity.x;
            debrisData.directions[i3 + 1] = velocity.y;
            debrisData.directions[i3 + 2] = velocity.z;
            debrisData.velocities[i] = length;
          }
          
          // Update position
          debrisData.positions[i3] = particle.position.x;
          debrisData.positions[i3 + 1] = particle.position.y;
          debrisData.positions[i3 + 2] = particle.position.z;
        }
      }
    }
  }

  // Clean up BVH data
  dispose() {
    this.collisionMeshes.forEach(mesh => {
      if (mesh.geometry && mesh.geometry.boundsTree) {
        mesh.geometry.disposeBoundsTree = () => {
          mesh.geometry.boundsTree = null;
        };
        mesh.geometry.disposeBoundsTree();
      }
    });
    this.collisionMeshes = [];
  }
}

/**
 * Example usage in ImpactEffects.js:
 * 
 * import { DebrisCollisionSystem } from './DebrisCollisionSystem';
 * 
 * // In the component:
 * const collisionSystem = useRef(new DebrisCollisionSystem());
 * 
 * // Add ground mesh for collision (in useEffect)
 * useEffect(() => {
 *   const groundMesh = scene.getObjectByName('ground');
 *   if (groundMesh) {
 *     collisionSystem.current.addCollisionMesh(groundMesh);
 *   }
 * }, [scene]);
 * 
 * // In useFrame, update debris with collision
 * collisionSystem.current.updateDebris(debrisData, delta);
 */

export default DebrisCollisionSystem;
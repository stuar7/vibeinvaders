// Selective Bloom Configuration for asteroid field
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';

export class SelectiveBloomRenderer {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    this.BLOOM_LAYER = 1;
    this.bloomLayer = new THREE.Layers();
    this.bloomLayer.set(this.BLOOM_LAYER);
    
    this.materials = {};
    this.darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    this.setupComposers();
  }
  
  setupComposers() {
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        samples: 4 // Anti-aliasing
      }
    );
    
    // Bloom composer - only renders bloom layer objects
    this.bloomComposer = new EffectComposer(this.renderer, renderTarget);
    this.bloomComposer.renderToScreen = false;
    
    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,    // strength
      0.4,    // radius
      0.85    // threshold
    );
    
    // Configure bloom for best quality
    bloomPass.threshold = 0.85;
    bloomPass.strength = 1.5;
    bloomPass.radius = 0.4;
    
    this.bloomComposer.addPass(renderPass);
    this.bloomComposer.addPass(bloomPass);
    
    // Final composer - combines base scene with bloom
    this.finalComposer = new EffectComposer(this.renderer);
    this.finalComposer.addPass(renderPass);
    
    const mixPass = new ShaderPass(this.createMixShader());
    mixPass.uniforms['bloomTexture'].value = 
      this.bloomComposer.renderTarget2.texture;
    
    this.finalComposer.addPass(mixPass);
    this.finalComposer.addPass(new OutputPass());
  }
  
  createMixShader() {
    return new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: null },
        bloomIntensity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D baseTexture;
        uniform sampler2D bloomTexture;
        uniform float bloomIntensity;
        varying vec2 vUv;
        
        void main() {
          vec4 base = texture2D(baseTexture, vUv);
          vec4 bloom = texture2D(bloomTexture, vUv);
          
          // Additive blending with intensity control
          vec3 color = base.rgb + bloom.rgb * bloomIntensity;
          
          // Prevent bloom from affecting transparent areas
          float bloomAlpha = clamp(bloom.a, 0.0, 1.0);
          
          gl_FragColor = vec4(color, base.a);
        }
      `
    });
  }
  
  darkenNonBloomed(obj) {
    if (obj.isMesh && !this.bloomLayer.test(obj.layers)) {
      this.materials[obj.uuid] = obj.material;
      obj.material = this.darkMaterial;
    }
  }
  
  restoreMaterial(obj) {
    if (this.materials[obj.uuid]) {
      obj.material = this.materials[obj.uuid];
      delete this.materials[obj.uuid];
    }
  }
  
  render() {
    // Render bloom pass with only bloom objects
    this.scene.traverse(this.darkenNonBloomed.bind(this));
    this.bloomComposer.render();
    
    // Restore materials and render final pass
    this.scene.traverse(this.restoreMaterial.bind(this));
    this.finalComposer.render();
  }
  
  // Add objects to bloom layer
  addToBloom(object) {
    object.layers.enable(this.BLOOM_LAYER);
  }
  
  removeFromBloom(object) {
    object.layers.disable(this.BLOOM_LAYER);
  }
  
  setBloomStrength(strength) {
    const bloomPass = this.bloomComposer.passes[1];
    if (bloomPass) {
      bloomPass.strength = strength;
    }
  }
  
  setBloomRadius(radius) {
    const bloomPass = this.bloomComposer.passes[1];
    if (bloomPass) {
      bloomPass.radius = radius;
    }
  }
  
  setBloomThreshold(threshold) {
    const bloomPass = this.bloomComposer.passes[1];
    if (bloomPass) {
      bloomPass.threshold = threshold;
    }
  }
  
  resize(width, height) {
    this.bloomComposer.setSize(width, height);
    this.finalComposer.setSize(width, height);
  }
  
  dispose() {
    this.bloomComposer.dispose();
    this.finalComposer.dispose();
    this.darkMaterial.dispose();
  }
}

export default SelectiveBloomRenderer;
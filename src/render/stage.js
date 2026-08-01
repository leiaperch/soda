import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createMaterials, skyTexture, envTexture, PALETTE } from './materials.js';
import { DEFAULT_ZONE } from '../world/zones.js';

/** Rough mobile budget check: heavy bloom is the first thing to drop. */
function wantsBloom() {
  const cores = navigator.hardwareConcurrency || 4;
  return cores >= 4;
}

/**
 * Backdrop parented to the camera so it behaves like a skybox: the far arc of
 * The Ring curving up into the sky is what tells the player where they are.
 * Returns its parts so a zone change can retint them.
 */
function buildBackdrop() {
  const group = new THREE.Group();
  const basic = (color, opacity = 1) => new THREE.MeshBasicMaterial({
    color, toneMapped: false, fog: false,
    transparent: opacity < 1, opacity,
  });

  const sun = new THREE.Mesh(new THREE.CircleGeometry(58, 48), basic('#fff4d6'));
  sun.position.set(-120, 96, -600);
  group.add(sun);

  const halo = new THREE.Mesh(new THREE.CircleGeometry(104, 48), basic('#ffb27a', 0.28));
  halo.position.set(-120, 96, -602);
  group.add(halo);

  const arc = new THREE.Mesh(new THREE.TorusGeometry(760, 16, 6, 96, Math.PI * 1.15), basic('#e6c9ff', 0.5));
  arc.position.set(0, -190, -700);
  arc.rotation.set(0.16, 0, 0.1);
  group.add(arc);

  const arcInner = new THREE.Mesh(new THREE.TorusGeometry(742, 4, 6, 96, Math.PI * 1.15), basic('#ffe9c9', 0.65));
  arcInner.position.copy(arc.position);
  arcInner.rotation.copy(arc.rotation);
  group.add(arcInner);

  const planet = new THREE.Mesh(new THREE.SphereGeometry(120, 24, 16), basic('#8f6fd6'));
  planet.position.set(340, 180, -900);
  group.add(planet);

  return { group, sun, halo, arc, arcInner, planet };
}

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: window.devicePixelRatio < 2,
    powerPreference: 'high-performance',
    // Only when explicitly capturing: keeping the buffer costs real frames.
    preserveDrawingBuffer: new URLSearchParams(location.search).has('capture'),
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#ff9fd0', 230, 400);

  // Environment lighting: this is what gives the chrome something to reflect.
  // Deliberately not the zone sky, so metal keeps a hard horizon everywhere.
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  scene.environment = pmrem.fromEquirectangular(envTexture()).texture;

  // Strong key, low fill: the toon ramp needs contrast or every facet lands on
  // the same step and the city goes flat.
  const sun = new THREE.DirectionalLight('#fff0d8', 2.4);
  sun.position.set(-4, 7, 2);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight('#ffd9f0', '#4a2a7a', 0.38);
  scene.add(hemi);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 900);
  camera.position.set(0, 4.4, 9.2);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const backdrop = buildBackdrop();
  camera.add(backdrop.group);

  const materials = createMaterials(renderer);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Threshold below 1.0 so only the emissive pass (whose vertex colours are
  // deliberately pushed past 1.0) blooms, not the pastel facades.
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.6, 0.95);
  if (wantsBloom()) composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let currentSky = null;

  /** Swap every global that belongs to a zone: sky, fog, key light, backdrop. */
  function applyZone(zone) {
    if (currentSky) currentSky.dispose();
    currentSky = skyTexture(zone.sky);
    scene.background = currentSky;

    scene.fog.color.set(zone.fog.color);
    scene.fog.near = zone.fog.near;
    scene.fog.far = zone.fog.far;

    sun.color.set(zone.sun.color);
    sun.intensity = zone.sun.intensity;
    hemi.color.set(zone.hemi.sky);
    hemi.groundColor.set(zone.hemi.ground);
    hemi.intensity = zone.hemi.intensity;

    backdrop.sun.material.color.set(zone.backdrop.sun);
    backdrop.halo.material.color.set(zone.backdrop.halo);
    backdrop.arc.material.color.set(zone.backdrop.arc);
    backdrop.arcInner.material.color.set(zone.backdrop.arc);
    backdrop.planet.material.color.set(zone.backdrop.planet);
  }

  applyZone(DEFAULT_ZONE);

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // Portrait phones need a wider vertical FOV or the track vanishes.
    camera.fov = h > w ? 74 : 58;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  return {
    renderer, scene, camera, materials, composer, bloom,
    palette: PALETTE,
    applyZone,
    render() { composer.render(); },
    resize,
  };
}

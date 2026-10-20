import * as THREE from './vendor/three.module.min.js';
import { ROOMS, WALLS, WORLD, moveWithCollisions, roomAt, nearestPhotoFrame } from './model.js';

// Scenery is made locally. Personal photographs use small gallery thumbnails;
// the full-size originals are reserved for the album outside the 3D scene.
const PALETTE = {
  sky: 0xa9d5ed, grass: '#74a951', grassDark: '#5c8c3d', dirt: '#896443',
  path: '#d6bc89', wood: '#997043', leaves: '#4f8950', stone: '#c4c2b0',
};
const clamp = THREE.MathUtils.clamp;

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function textureFrom(draw, size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function pixelTexture(base, colors, seed = 1, planks = false) {
  return textureFrom((ctx, size) => {
    const random = rng(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 210; i++) {
      ctx.fillStyle = colors[Math.floor(random() * colors.length)];
      const x = Math.floor(random() * 16) * 4;
      const y = Math.floor(random() * 16) * 4;
      ctx.fillRect(x, y, (1 + Math.floor(random() * 2)) * 4, 4);
    }
    if (planks) {
      ctx.fillStyle = '#5f4931';
      for (let y = 0; y < size; y += 16) ctx.fillRect(0, y, size, 2);
      for (let y = 0; y < size; y += 16) ctx.fillRect(y % 32 ? 42 : 20, y, 2, 16);
      ctx.fillStyle = '#d5b883';
      for (let y = 3; y < size; y += 16) ctx.fillRect(0, y, size, 1);
    }
  });
}

function pixelPicture(index) {
  const schemes = [
    { sky: '#e2bd9d', sun: '#fff0b6', mountain: '#827882', hill: '#73937d', front: '#496a57', water: '#80b6b2' },
    { sky: '#adc6de', sun: '#fff0bb', mountain: '#9b9aac', hill: '#b0b783', front: '#6b8f61', water: '#85b2c0' },
    { sky: '#edc9c5', sun: '#fff2cd', mountain: '#a38b9b', hill: '#9ca28d', front: '#647c72', water: '#96b8be' },
    { sky: '#b9c6df', sun: '#fff0b0', mountain: '#878ba7', hill: '#91a6a1', front: '#4f777c', water: '#89b9ca' },
  ];
  const p = schemes[index % schemes.length];
  return textureFrom((ctx) => {
    const random = rng(index + 77);
    ctx.fillStyle = p.sky; ctx.fillRect(0, 0, 96, 96);
    ctx.fillStyle = p.sun; ctx.fillRect(66, 13, 12, 12);
    ctx.fillStyle = '#f7e9da';
    ctx.fillRect(10, 15, 24, 4); ctx.fillRect(18, 11, 12, 4);
    ctx.fillRect(42, 26, 28, 4); ctx.fillRect(48, 22, 12, 4);
    ctx.fillStyle = p.mountain;
    for (let x = 0; x < 96; x += 4) {
      const height = Math.max(0, 38 - Math.abs(x - 28) * 0.8, 36 - Math.abs(x - 74) * 0.9);
      ctx.fillRect(x, 64 - Math.floor(height / 4) * 4, 4, 96);
    }
    ctx.fillStyle = p.hill;
    for (let x = 0; x < 96; x += 4) ctx.fillRect(x, 53 + Math.floor(Math.sin(x / 16) * 3) * 4, 4, 96);
    ctx.fillStyle = p.water; ctx.fillRect(0, 66, 96, 30);
    ctx.fillStyle = '#d2dfcf';
    for (let i = 0; i < 15; i++) ctx.fillRect(Math.floor(random() * 23) * 4, 70 + Math.floor(random() * 5) * 4, 8, 1);
    ctx.fillStyle = p.front; ctx.fillRect(0, 86, 96, 10);
    // A pair of tiny original travelers, waiting for your own photograph.
    ctx.fillStyle = '#56464a'; ctx.fillRect(35, 70, 5, 10); ctx.fillRect(47, 70, 5, 10);
    ctx.fillStyle = '#e6ba96'; ctx.fillRect(35, 66, 5, 5); ctx.fillRect(47, 66, 5, 5);
    ctx.fillStyle = '#e8c49d'; ctx.fillRect(35, 76, 17, 3);
    ctx.fillStyle = '#c77e70'; ctx.fillRect(35, 73, 5, 9);
    ctx.fillStyle = '#e0d7b6'; ctx.fillRect(47, 73, 5, 9);
  }, 96);
}

function labelTexture(lines, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = options.width || 768;
  canvas.height = options.height || 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = options.background || '#f3dfb6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = options.border || '#997347';
  ctx.fillRect(0, 0, canvas.width, 12); ctx.fillRect(0, canvas.height - 12, canvas.width, 12);
  ctx.fillRect(0, 0, 12, canvas.height); ctx.fillRect(canvas.width - 12, 0, 12, canvas.height);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((line, index) => {
    ctx.font = `${index === 0 ? 'bold ' : ''}${index === 0 ? (options.titleSize || 52) : (options.bodySize || 31)}px monospace`;
    ctx.fillStyle = index === 0 ? (options.color || '#4a3c32') : '#75664e';
    const text = String(line);
    const maxWidth = canvas.width - 64;
    const width = ctx.measureText(text).width;
    if (width > maxWidth) {
      const initial = index === 0 ? (options.titleSize || 52) : (options.bodySize || 31);
      ctx.font = `${index === 0 ? 'bold ' : ''}${Math.floor(initial * maxWidth / width)}px monospace`;
    }
    const step = canvas.height / (lines.length + 1);
    ctx.fillText(text, canvas.width / 2, step * (index + 1));
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function basicMaterial(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

export async function createWorld({ canvas, onRoomChange, onNearbyMemory, onInteract, onReady, onError } = {}) {
  if (!canvas) throw new Error('A canvas is required to enter the world.');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    onError?.(error);
    throw error;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(PALETTE.sky);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.sky, 38, 94);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.08, 150);
  const ambient = new THREE.HemisphereLight(0xe3f4ff, 0x8a7951, 2.4);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe0ac, 3.2);
  sun.position.set(-18, 34, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -39, right: 39, top: 39, bottom: -39, near: 1, far: 95 });
  sun.shadow.bias = -0.0007;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xb7d8f0, 0.4);
  fill.position.set(20, 10, -30); scene.add(fill);

  const disposableTextures = [];
  const remember = (texture) => { disposableTextures.push(texture); return texture; };
  const tex = {
    grass: remember(pixelTexture('#79a950', ['#81b157', '#729f49', '#8cb85e', '#6c9845'], 13)),
    dirt: remember(pixelTexture('#8c6946', ['#80603f', '#987550', '#a17f56', '#74563b'], 15)),
    path: remember(pixelTexture('#d5bd8a', ['#cbb17e', '#e0cb9d', '#c6ae7c', '#d9c596'], 9)),
    planks: remember(pixelTexture('#b79463', ['#b18d59', '#c19e6b', '#b18e5f', '#c5a574'], 5, true)),
    bark: remember(pixelTexture('#745337', ['#64482e', '#87613e', '#76573b', '#9c744a'], 17)),
    leaves: remember(pixelTexture('#568a45', ['#659b50', '#4d803f', '#72a15a', '#5c9149'], 25)),
    stone: remember(pixelTexture('#b7b6a8', ['#aaa99b', '#c6c4b6', '#a7a699', '#d0cebf'], 36)),
  };
  const mats = {
    grass: basicMaterial(0xffffff, { map: tex.grass }),
    dirt: basicMaterial(0xffffff, { map: tex.dirt }),
    path: basicMaterial(0xffffff, { map: tex.path }),
    planks: basicMaterial(0xffffff, { map: tex.planks }),
    bark: basicMaterial(0xffffff, { map: tex.bark }),
    leaves: basicMaterial(0xffffff, { map: tex.leaves }),
    stone: basicMaterial(0xffffff, { map: tex.stone }),
    cream: basicMaterial('#f5ead5'),
    darkWood: basicMaterial('#6e5035'),
    warm: basicMaterial('#ffda85', { emissive: 0xffbd58, emissiveIntensity: 0.7 }),
  };
  const floorTexture = remember(tex.planks.clone());
  floorTexture.repeat.set(7, 8);
  mats.floor = basicMaterial(0xffffff, { map: floorTexture });
  const worldObstacles = [];
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const temporaryMatrix = new THREE.Matrix4();
  const temporaryPosition = new THREE.Vector3();
  const temporaryScale = new THREE.Vector3();
  const temporaryQuaternion = new THREE.Quaternion();
  const upAxis = new THREE.Vector3(0, 1, 0);

  function box(width, height, depth, material, x, y, z, parent = scene) {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(width, height, depth); mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function instances(items, material, shadows = true) {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(unitBox, material, items.length);
    items.forEach((item, i) => {
      temporaryPosition.set(item.x, item.y, item.z);
      temporaryScale.set(item.w || 1, item.h || 1, item.d || 1);
      temporaryQuaternion.setFromAxisAngle(upAxis, item.rotation || 0);
      temporaryMatrix.compose(temporaryPosition, temporaryQuaternion, temporaryScale);
      mesh.setMatrixAt(i, temporaryMatrix);
      if (item.color) mesh.setColorAt(i, new THREE.Color(item.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = shadows; mesh.receiveShadow = true;
    scene.add(mesh); return mesh;
  }

  const groundTiles = [];
  const random = rng(20261020);
  const bounds = WORLD.bounds || { minX: -42, maxX: 42, minZ: -48, maxZ: 34 };
  for (let x = bounds.minX; x < bounds.maxX; x += 2) {
    for (let z = bounds.minZ; z < bounds.maxZ; z += 2) {
      groundTiles.push({ x: x + 1, y: -0.16, z: z + 1, w: 2, h: 0.3, d: 2,
        color: new THREE.Color().setHSL(0.23 + random() * 0.015, 0.37, 0.71 + random() * 0.07) });
    }
  }
  instances(groundTiles, mats.grass, false);
  box(bounds.maxX - bounds.minX, 1.6, bounds.maxZ - bounds.minZ, mats.dirt,
    (bounds.minX + bounds.maxX) / 2, -1.12, (bounds.minZ + bounds.maxZ) / 2);

  // Sandstone path and a small arrival plaza lead into the four rooms.
  box(5.9, 0.14, 73, mats.path, 0, 0.025, -13.5);
  box(15, 0.16, 11, mats.path, 0, 0.04, 18);
  const edging = [];
  for (let z = -50; z <= 22; z += 2) {
    edging.push({ x: -3.08, y: 0.13, z, w: 0.18, h: 0.27, d: 1.9 });
    edging.push({ x: 3.08, y: 0.13, z, w: 0.18, h: 0.27, d: 1.9 });
  }
  // The room entrances remain clear across the side edging.
  const doorClear = edging.filter((tile) => !ROOMS.some((room) =>
    Math.abs(room.door.z - tile.z) < 2.2 && Math.sign(room.door.x) === Math.sign(tile.x)));
  instances(doorClear, mats.stone, false);

  const clouds = new THREE.Group();
  const cloudMaterial = basicMaterial('#fffaf0', { transparent: true, opacity: 0.9 });
  const cloudPatterns = [[7, 2, 3], [3, 3, 5], [6, 2, 4], [4, 2, 3], [8, 2, 4]];
  cloudPatterns.forEach((size, i) => {
    const group = new THREE.Group();
    group.position.set(-29 + i * 16, 20 + (i % 3) * 4, -24 - (i % 2) * 24);
    box(size[0], 1.1, size[2], cloudMaterial, 0, 0, 0, group).castShadow = false;
    box(size[0] * 0.55, 1.25, size[2] * 0.7, cloudMaterial, -1, 0.9, 0, group).castShadow = false;
    clouds.add(group);
  });
  scene.add(clouds);

  const trunks = [], leafBlocks = [], littleFlowers = [];
  const treePoints = [
    [-23, 10], [-28, -2], [-24, -17], [-27, -33], [-18, -42], [-7, -42],
    [23, 9], [29, -4], [24, -19], [27, -35], [17, -43], [5, -43],
    [-27, 26], [-15, 28], [19, 27], [31, 22], [-36, -11], [36, -26],
  ];
  const insideGalleryGround = (x, z, margin = 0) => ROOMS.some(({ bounds: b }) =>
    x > b.minX - margin && x < b.maxX + margin && z > b.minZ - margin && z < b.maxZ + margin)
    || (Math.abs(x) < 3.3 + margin && z > -51 - margin && z < 25 + margin);
  treePoints.filter(([x, z]) => !insideGalleryGround(x, z, 2)).forEach(([x, z], i) => {
    const height = 3.4 + (i % 3) * 0.4;
    worldObstacles.push({ minX: x - 0.43, maxX: x + 0.43, minZ: z - 0.43, maxZ: z + 0.43, height });
    trunks.push({ x, y: height / 2, z, w: 0.85, h: height, d: 0.85 });
    leafBlocks.push({ x, y: height + 0.55, z, w: 3.8, h: 1.6, d: 3.8 });
    leafBlocks.push({ x: x - 0.3, y: height + 1.75, z: z + 0.25, w: 2.8, h: 1.1, d: 2.8 });
    leafBlocks.push({ x: x + 1.15, y: height, z: z - 0.75, w: 2, h: 1.4, d: 2.5 });
  });
  instances(trunks, mats.bark);
  instances(leafBlocks, mats.leaves);
  const flowerColors = ['#e9c267', '#d89595', '#e5d8b3', '#a796c7'];
  for (let i = 0; i < 115; i++) {
    const x = (random() - 0.5) * 71, z = (random() - 0.5) * 68 - 4;
    if (insideGalleryGround(x, z, 0.5)) continue;
    if (x > 8 && x < 21 && z > 5 && z < 18) continue;
    littleFlowers.push({ x, y: 0.31, z, w: 0.11, h: 0.5, d: 0.11, color: '#5f8247' });
    littleFlowers.push({ x, y: 0.58, z, w: 0.37, h: 0.18, d: 0.37, color: flowerColors[i % 4] });
    littleFlowers.push({ x, y: 0.64, z, w: 0.15, h: 0.23, d: 0.15, color: flowerColors[i % 4] });
  }
  instances(littleFlowers, basicMaterial(0xffffff), false);

  // A stepped pond is shallow enough to cross while the world is being explored.
  const pondWater = new THREE.MeshLambertMaterial({ color: '#67adba', transparent: true, opacity: 0.84 });
  const waterGroup = new THREE.Group(); scene.add(waterGroup);
  box(9, 0.12, 6, pondWater, 16, 0.075, 12, waterGroup);
  box(5, 0.12, 10, pondWater, 16, 0.074, 12, waterGroup);
  const pondEdges = [[10.8, 12, 0.8, 6], [21.2, 12, 0.8, 6], [16, 6.7, 5, 0.7], [16, 17.3, 5, 0.7], [11.5, 8.6, 3.5, 0.6], [20.5, 8.6, 3.5, 0.6], [11.5, 15.4, 3.5, 0.6], [20.5, 15.4, 3.5, 0.6]];
  pondEdges.forEach(([x, z, w, d]) => box(w, 0.32, d, mats.stone, x, 0.12, z));
  const waterShimmers = [];
  const shimmerMat = basicMaterial('#b7e0d7', { transparent: true, opacity: 0.58 });
  for (let i = 0; i < 13; i++) {
    const shimmer = box(0.5 + random() * 0.8, 0.015, 0.08, shimmerMat,
      12.2 + random() * 7.4, 0.145, 9.4 + random() * 5.1);
    shimmer.castShadow = false; waterShimmers.push(shimmer);
  }
  box(2.4, 0.16, 1.6, basicMaterial('#7c9c63'), 17, 0.17, 9);
  box(0.45, 0.2, 0.45, basicMaterial('#e3b1b0'), 17, 0.29, 9);

  function sign(lines, x, y, z, width = 3.4, height = 1.1, rotation = 0, options = {}) {
    const group = new THREE.Group(); group.position.set(x, y, z); group.rotation.y = rotation;
    box(width + 0.14, height + 0.14, 0.12, mats.darkWood, 0, 0, 0, group);
    const texture = remember(labelTexture(lines, options));
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
    plane.position.z = 0.068; group.add(plane); scene.add(group); return group;
  }
  box(0.2, 2.3, 0.2, mats.darkWood, -3.7, 1.15, 24.5);
  box(0.2, 2.3, 0.2, mats.darkWood, 3.7, 1.15, 24.5);
  sign(['OUR LITTLE WORLD', 'Four rooms. A story still growing.'], 0, 3.1, 24.5, 8.2, 1.6, 0,
    { titleSize: 54, bodySize: 27 });
  // A little trail of lanterns gives the corridor a warm rhythm.
  const lanternCenters = [-48, -25, 1, 10];
  lanternCenters.forEach((z, i) => {
    const x = i % 2 ? 2.4 : -2.4;
    worldObstacles.push({ minX: x - 0.12, maxX: x + 0.12, minZ: z - 0.12, maxZ: z + 0.12, height: 2.7 });
    box(0.16, 2.5, 0.16, mats.darkWood, x, 1.25, z);
    box(0.5, 0.14, 0.5, mats.darkWood, x, 2.6, z);
    box(0.34, 0.49, 0.34, mats.warm, x, 2.28, z);
    box(0.46, 0.1, 0.46, mats.darkWood, x, 1.99, z);
  });

  const memoryFrames = [];
  const frameGeometry = new THREE.PlaneGeometry(1, 1);
  const timberFrames = [], creamMats = [];
  const roomPhotoFrames = new Map();
  const photoQueue = [];
  const livePhotoTextures = new Set();
  const pendingPhotoTextures = new Set();
  const photoLoader = new THREE.TextureLoader();
  let activePhotoLoads = 0;

  // One outline follows the closest photograph; frames share their timber and
  // mat draw calls, and never cast 126 separate shadows.
  const outlineGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const frameOutline = new THREE.LineSegments(outlineGeometry, new THREE.LineBasicMaterial({
    color: '#fff2a7', transparent: true, opacity: 0.98,
  }));
  frameOutline.visible = false;
  scene.add(frameOutline);

  function fitPhoto(frame, width, height) {
    if (!(width > 0 && height > 0)) return;
    const aspect = width / height;
    const heightFit = Math.min(frame.height, frame.width / aspect);
    // Fit the complete photograph into the opening and expose the cream mat.
    frame.picture.scale.set(heightFit * aspect, heightFit, 1);
  }

  function pumpPhotoQueue() {
    if (destroyed) return;
    while (activePhotoLoads < 3 && photoQueue.length) {
      const job = photoQueue.shift();
      if (job.revision !== job.frame.revision) continue;
      activePhotoLoads += 1;
      const finish = () => { activePhotoLoads -= 1; pumpPhotoQueue(); };
      const texture = photoLoader.load(job.url, (photo) => {
        pendingPhotoTextures.delete(photo);
        if (destroyed || job.revision !== job.frame.revision) {
          photo.dispose(); finish(); return;
        }
        photo.colorSpace = THREE.SRGBColorSpace;
        photo.magFilter = THREE.LinearFilter;
        photo.minFilter = THREE.LinearMipmapLinearFilter;
        const previous = job.frame.texture;
        job.frame.texture = photo;
        livePhotoTextures.add(photo);
        job.frame.picture.material.map = photo;
        job.frame.picture.material.needsUpdate = true;
        fitPhoto(job.frame, photo.image.width, photo.image.height);
        if (previous) { livePhotoTextures.delete(previous); previous.dispose(); }
        renderOnce(); finish();
      }, undefined, () => {
        pendingPhotoTextures.delete(texture);
        texture.dispose();
        if (job.revision === job.frame.revision) job.frame.requestedSrc = null;
        // The local placeholder remains visible if a photograph is unavailable.
        finish();
      });
      pendingPhotoTextures.add(texture);
    }
  }

  function requestFramePhoto(frame) {
    const source = frame.photo?.thumbnail;
    if (!source || frame.requestedSrc === source || destroyed) return false;
    let url;
    try { url = new URL(source, import.meta.url).href; }
    catch { return false; }
    frame.requestedSrc = source;
    frame.revision += 1;
    photoQueue.push({ frame, url, revision: frame.revision });
    pumpPhotoQueue();
    return true;
  }

  function unloadGallery(gallery) {
    if (!gallery.loaded) return;
    gallery.loaded = false;
    gallery.frames.forEach((frame) => {
      frame.revision += 1;
      frame.requestedSrc = null;
      frame.picture.material.map = frame.placeholder;
      frame.picture.material.needsUpdate = true;
      fitPhoto(frame, 1, 1);
      if (frame.texture) {
        livePhotoTextures.delete(frame.texture);
        frame.texture.dispose();
        frame.texture = null;
      }
    });
  }

  function prepareNearbyPhotos() {
    const galleries = [...roomPhotoFrames.values()].map((gallery) => {
      const b = gallery.room.bounds;
      const dx = Math.max(b.minX - player.x, 0, player.x - b.maxX);
      const dz = Math.max(b.minZ - player.z, 0, player.z - b.maxZ);
      return { gallery, distance: Math.hypot(dx, dz) };
    }).sort((a, b) => a.distance - b.distance || a.gallery.room.index - b.gallery.room.index);
    const wanted = galleries.filter(({ distance }) => distance <= 4).slice(0, 2);
    const wantedIds = new Set(wanted.map(({ gallery }) => gallery.room.id));
    // Retain nearby textures while walking around a room; evict them when
    // another gallery needs the space. Only two rooms (at most 64 photos) live
    // on the GPU, including where all four room corners meet.
    galleries.forEach(({ gallery, distance }) => {
      if (distance > 12) unloadGallery(gallery);
    });
    for (const { gallery } of wanted) {
      if (gallery.loaded) continue;
      let residentCount = [...roomPhotoFrames.values()].reduce((total, current) =>
        total + (current.loaded ? current.frames.length : 0), 0);
      for (const candidate of [...galleries].reverse()) {
        if (residentCount + gallery.frames.length <= 64) break;
        if (!candidate.gallery.loaded || wantedIds.has(candidate.gallery.room.id)) continue;
        residentCount -= candidate.gallery.frames.length;
        unloadGallery(candidate.gallery);
      }
      if (residentCount + gallery.frames.length > 64) continue;
      gallery.loaded = true;
      gallery.frames.forEach((frame) => requestFramePhoto(frame));
    }
  }

  const renderedWalls = new Set();
  ROOMS.forEach((room, i) => {
    const color = new THREE.Color(room.color || ['#d9a18b', '#93b5aa', '#c6b1cd', '#d9bf84'][i % 4]);
    const wallColor = color.clone().lerp(new THREE.Color('#f2ead7'), 0.7);
    const wallMaterial = basicMaterial(wallColor);
    const trimMaterial = basicMaterial(color.clone().multiplyScalar(0.88));
    const b = room.bounds;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    box(b.maxX - b.minX, 0.16, b.maxZ - b.minZ, mats.floor, cx, 0.055, cz);
    // A softly colored rug anchors the little gallery.
    box(6.2, 0.035, 5.3, trimMaterial, cx, 0.155, cz + 1.6);
    box(5.7, 0.04, 4.8, basicMaterial(color.clone().lerp(new THREE.Color('#eedeb7'), 0.42)), cx, 0.16, cz + 1.6);
    for (const wall of WALLS) {
      const mx = (wall.minX + wall.maxX) / 2, mz = (wall.minZ + wall.maxZ) / 2;
      if (mx < b.minX - 0.7 || mx > b.maxX + 0.7 || mz < b.minZ - 0.7 || mz > b.maxZ + 0.7) continue;
      renderedWalls.add(wall);
      const width = Math.max(wall.maxX - wall.minX, 0.15);
      const depth = Math.max(wall.maxZ - wall.minZ, 0.15);
      const height = wall.height || 3.6;
      box(width, height, depth, wallMaterial, mx, height / 2 + 0.1, mz);
      box(width + 0.035, 0.16, depth + 0.035, trimMaterial, mx, height + 0.13, mz);
      box(width + 0.035, 0.2, depth + 0.035, trimMaterial, mx, 0.23, mz);
    }
    // Four corner posts make the roofless rooms read as little block houses.
    [[b.minX, b.minZ], [b.maxX, b.minZ], [b.minX, b.maxZ], [b.maxX, b.maxZ]].forEach(([x, z]) => {
      box(0.52, 3.95, 0.52, mats.darkWood, x, 2.03, z);
      box(0.68, 0.18, 0.68, mats.planks, x, 4.05, z);
    });
    // Door lintel and front-facing chapter sign are visible from the corridor.
    const side = Math.sign(room.door.x) || 1;
    box(0.54, 0.4, 3.25, mats.darkWood, room.door.x, 3.45, room.door.z);
    sign([`${String(i + 1).padStart(2, '0')} / ${room.title}`, room.subtitle || 'A memory to make your own'],
      room.door.x - side * 0.35, 2.83, room.door.z + 0.02, 3.1, 0.83, -side * Math.PI / 2,
      { titleSize: 45, bodySize: 28 });
    // Every photo owns one permanent physical wall frame. Album navigation
    // leaves these photographs in place so the walk is a complete gallery.
    const placeholder = remember(pixelPicture(i));
    const gallery = { room, frames: [], loaded: false };
    roomPhotoFrames.set(room.id, gallery);
    room.frames.forEach((placement) => {
      const rotation = placement.rotation || 0;
      const normalX = Math.sin(rotation), normalZ = Math.cos(rotation);
      const { x, y, z } = placement;
      timberFrames.push({ x: x - normalX * 0.025, y, z: z - normalZ * 0.025,
        w: placement.width, h: placement.height, d: 0.12, rotation });
      creamMats.push({ x: x + normalX * 0.055, y, z: z + normalZ * 0.055,
        w: placement.width - 0.14, h: placement.height - 0.14, d: 0.035, rotation });
      const picture = new THREE.Mesh(frameGeometry, new THREE.MeshBasicMaterial({ map: placeholder }));
      picture.position.set(x + normalX * 0.09, y, z + normalZ * 0.09);
      picture.rotation.y = rotation;
      picture.userData.photoId = placement.photoId;
      scene.add(picture);
      const frame = { placement, room, picture, photo: placement.photo,
        width: placement.width - 0.28, height: placement.height - 0.28,
        placeholder, texture: null, revision: 0, requestedSrc: null };
      fitPhoto(frame, 1, 1);
      memoryFrames.push(frame);
      gallery.frames.push(frame);
    });
    // The date plaque sits above the doorway, leaving all wall photos clear.
    if (room.date) {
      sign([room.date], room.door.x - side * 0.35, 3.85, room.door.z, 2.85, 0.38,
        -side * Math.PI / 2, { titleSize: 42, height: 192 });
    }
    // Two benches and a plant make each room a place to linger.
    [-1, 1].forEach((direction) => {
      const x = cx + direction * 3.2, z = cz + 2.6;
      worldObstacles.push({ minX: x - 0.63, maxX: x + 0.63, minZ: z - 1.4, maxZ: z + 1.4, height: 1.5 });
      box(1.25, 0.2, 2.8, mats.planks, x, 0.73, z);
      box(0.16, 0.65, 0.16, mats.darkWood, x - 0.4, 0.36, z - 0.95);
      box(0.16, 0.65, 0.16, mats.darkWood, x + 0.4, 0.36, z + 0.95);
      box(0.18, 0.84, 2.8, mats.darkWood, x + direction * 0.48, 1.06, z);
    });
    const potX = cx + (i % 2 ? -3.2 : 3.2), potZ = cz - 3.2;
    worldObstacles.push({ minX: potX - 0.45, maxX: potX + 0.45, minZ: potZ - 0.45, maxZ: potZ + 0.45, height: 2.5 });
    box(0.8, 0.7, 0.8, basicMaterial('#b78366'), potX, 0.47, potZ);
    box(0.12, 1.1, 0.12, mats.bark, potX, 1.2, potZ);
    box(1.15, 0.8, 1.15, mats.leaves, potX, 1.6, potZ);
    box(0.7, 0.65, 0.7, mats.leaves, potX, 2.12, potZ);
    box(0.45, 0.09, 0.45, mats.warm, cx - 4.8, 3.75, b.minZ + 0.55);
    box(0.45, 0.09, 0.45, mats.warm, cx + 4.8, 3.75, b.minZ + 0.55);
  });

  instances(timberFrames, mats.darkWood, false);
  instances(creamMats, mats.cream, false);

  for (const wall of WALLS) {
    if (renderedWalls.has(wall)) continue;
    const width = wall.maxX - wall.minX, depth = wall.maxZ - wall.minZ;
    const height = wall.height || 4.5;
    const x = (wall.minX + wall.maxX) / 2, z = (wall.minZ + wall.maxZ) / 2;
    box(width, height, depth, mats.stone, x, height / 2 + 0.1, z);
    box(width + 0.08, 0.18, depth + 0.08, mats.planks, x, height + 0.18, z);
  }

  // Low block hills close the horizon beyond the playable garden.
  const hills = [];
  for (let i = 0; i < 28; i++) {
    const angle = i / 28 * Math.PI * 2;
    const radius = 57 + random() * 10;
    const height = 4 + random() * 8;
    hills.push({ x: Math.sin(angle) * radius, y: height / 2 - 1, z: Math.cos(angle) * radius - 8,
      w: 9 + random() * 9, h: height, d: 8 + random() * 8, color: new THREE.Color().setHSL(0.25, 0.2, 0.47 + random() * 0.12) });
  }
  instances(hills, basicMaterial('#b0b4a0'), false);

  const avatar = new THREE.Group(); scene.add(avatar);
  const skin = basicMaterial('#e1b58e');
  const hair = basicMaterial('#5a4030');
  const shirt = basicMaterial('#6c968b');
  const sleeve = basicMaterial('#7ca498');
  const trousers = basicMaterial('#53616c');
  const shoes = basicMaterial('#403c3a');
  const eyes = basicMaterial('#343638');
  box(0.6, 0.64, 0.34, shirt, 0, 1.02, 0, avatar);
  box(0.13, 0.42, 0.025, basicMaterial('#cbbd99'), 0, 1.05, -0.185, avatar);
  box(0.56, 0.55, 0.55, skin, 0, 1.61, 0, avatar);
  box(0.59, 0.17, 0.59, hair, 0, 1.83, 0, avatar);
  box(0.59, 0.39, 0.12, hair, 0, 1.59, 0.245, avatar);
  box(0.12, 0.25, 0.57, hair, -0.235, 1.66, 0.015, avatar);
  box(0.11, 0.14, 0.57, hair, 0.235, 1.72, 0.015, avatar);
  [-0.13, 0.13].forEach((x) => {
    box(0.1, 0.07, 0.015, basicMaterial('#f3e8d7'), x, 1.64, -0.283, avatar);
    box(0.045, 0.07, 0.02, eyes, x, 1.64, -0.295, avatar);
  });
  box(0.13, 0.045, 0.025, basicMaterial('#a27458'), 0, 1.47, -0.285, avatar);
  const leftArm = new THREE.Group(), rightArm = new THREE.Group();
  leftArm.position.set(-0.43, 1.29, 0); rightArm.position.set(0.43, 1.29, 0);
  avatar.add(leftArm, rightArm);
  [leftArm, rightArm].forEach((arm) => {
    box(0.23, 0.36, 0.31, sleeve, 0, -0.16, 0, arm);
    box(0.22, 0.3, 0.3, skin, 0, -0.48, 0, arm);
  });
  const leftLeg = new THREE.Group(), rightLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0.72, 0); rightLeg.position.set(0.16, 0.72, 0);
  avatar.add(leftLeg, rightLeg);
  [leftLeg, rightLeg].forEach((leg) => {
    box(0.27, 0.59, 0.31, trousers, 0, -0.29, 0, leg);
    box(0.28, 0.16, 0.38, shoes, 0, -0.63, -0.025, leg);
  });
  // A tiny stitched heart on the back of the jacket is the explorer's badge.
  const heartMaterial = basicMaterial('#e9b0a0');
  box(0.07, 0.07, 0.012, heartMaterial, -0.055, 1.13, 0.18, avatar);
  box(0.07, 0.07, 0.012, heartMaterial, 0.055, 1.13, 0.18, avatar);
  box(0.15, 0.07, 0.012, heartMaterial, 0, 1.08, 0.18, avatar);
  box(0.07, 0.06, 0.012, heartMaterial, 0, 1.02, 0.18, avatar);

  const player = { x: WORLD.spawn.x, y: 0.14, z: WORLD.spawn.z };
  const velocity = { x: 0, z: 0, y: 0 };
  const movement = { x: 0, y: 0 };
  const keys = new Set();
  const collisionWalls = [...WALLS, ...worldObstacles];
  let yaw = 0, pitch = 0.45, view = 'third-person';
  let paused = false, destroyed = false, grounded = true, dragging = null;
  let animationId = 0, lastTime = performance.now(), walkPhase = 0;
  let activeRoomId, activeZone, nearbyFrameId, nearbyPhotoId = null;
  let lastQaUpdate = -Infinity;
  let cameraInitialized = false, errorReported = false;
  const cameraTarget = new THREE.Vector3(), desiredCamera = new THREE.Vector3();
  const smoothCamera = new THREE.Vector3();
  const cameraRay = new THREE.Raycaster();
  const rayDirection = new THREE.Vector3();
  const listeners = [];
  const listen = (target, type, callback, options) => {
    target.addEventListener(type, callback, options);
    listeners.push(() => target.removeEventListener(type, callback, options));
  };

  function updateRoomState(force = false) {
    prepareNearbyPhotos();
    const room = roomAt(player);
    const near = nearestPhotoFrame(player);
    const roomId = room?.id ?? null;
    const nearId = near?.frame.id ?? null;
    const zone = roomId || (player.z < 0 ? 'hallway' : 'garden');
    if (force || roomId !== activeRoomId || zone !== activeZone) {
      activeRoomId = roomId;
      activeZone = zone;
      onRoomChange?.(room || null);
    }
    if (force || nearId !== nearbyFrameId) {
      nearbyFrameId = nearId;
      nearbyPhotoId = near?.photo.id ?? null;
      frameOutline.visible = Boolean(near);
      if (near) {
        const frame = near.frame, rotation = frame.rotation || 0;
        frameOutline.position.set(frame.x + Math.sin(rotation) * 0.09, frame.y,
          frame.z + Math.cos(rotation) * 0.09);
        frameOutline.rotation.y = rotation;
        frameOutline.scale.set(frame.width + 0.1, frame.height + 0.1, 0.14);
      }
      onNearbyMemory?.(near?.room ?? null, near?.photo ?? null);
    }
  }

  function updateQaState(force = false, time = performance.now()) {
    if (!force && time - lastQaUpdate < 250) return;
    lastQaUpdate = time;
    const x = player.x.toFixed(2), z = player.z.toFixed(2);
    if (canvas.dataset.playerX !== x) canvas.dataset.playerX = x;
    if (canvas.dataset.playerZ !== z) canvas.dataset.playerZ = z;
    if (canvas.dataset.view !== view) canvas.dataset.view = view;
    const nearbyId = nearbyPhotoId || '';
    if (canvas.dataset.nearbyPhotoId !== nearbyId) canvas.dataset.nearbyPhotoId = nearbyId;
    if (canvas.dataset.nearPhotoId !== nearbyId) canvas.dataset.nearPhotoId = nearbyId;
    canvas.dataset.wallFrameCount = String(memoryFrames.length);
    canvas.dataset.frameCount = String(memoryFrames.length);
    canvas.dataset.loadedPhotoCount = String(livePhotoTextures.size);
    canvas.dataset.activePhotoLoads = String(activePhotoLoads);
  }

  function resize() {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || window.innerWidth));
    const height = Math.max(1, Math.round(rect.height || window.innerHeight));
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    if (paused) renderOnce();
  }

  function updateCamera(dt = 1) {
    cameraTarget.set(player.x, player.y + 1.4, player.z);
    if (view === 'first-person') {
      camera.position.set(player.x, player.y + 1.65, player.z);
      camera.lookAt(player.x - Math.sin(yaw) * Math.cos(pitch),
        player.y + 1.65 - Math.sin(pitch), player.z - Math.cos(yaw) * Math.cos(pitch));
      avatar.visible = false;
    } else {
      avatar.visible = true;
      const distance = 5.7;
      desiredCamera.set(player.x + Math.sin(yaw) * Math.cos(pitch) * distance,
        player.y + 1.4 + Math.sin(pitch) * distance,
        player.z + Math.cos(yaw) * Math.cos(pitch) * distance);
      // Camera obstruction uses the same wall rectangles as walking collision.
      // A short ray test keeps the orbit on the visible side of a doorway.
      rayDirection.copy(desiredCamera).sub(cameraTarget);
      let cameraDistance = rayDirection.length();
      rayDirection.normalize();
      for (const wall of collisionWalls) {
        const h = (wall.height || 3.6) + 0.2;
        const min = new THREE.Vector3(wall.minX - 0.15, 0, wall.minZ - 0.15);
        const max = new THREE.Vector3(wall.maxX + 0.15, h, wall.maxZ + 0.15);
        cameraRay.set(cameraTarget, rayDirection);
        const hit = cameraRay.ray.intersectBox(new THREE.Box3(min, max), new THREE.Vector3());
        if (hit) cameraDistance = Math.min(cameraDistance, Math.max(0.5, hit.distanceTo(cameraTarget) - 0.22));
      }
      desiredCamera.copy(cameraTarget).addScaledVector(rayDirection, cameraDistance);
      if (!cameraInitialized) { smoothCamera.copy(desiredCamera); cameraInitialized = true; }
      else smoothCamera.lerp(desiredCamera, 1 - Math.exp(-12 * dt));
      camera.position.copy(smoothCamera);
      camera.lookAt(cameraTarget);
    }
  }

  function renderOnce() {
    if (destroyed || renderer.getContext().isContextLost()) return;
    avatar.position.set(player.x, player.y, player.z);
    updateCamera(1);
    renderer.render(scene, camera);
  }

  function clearInput() {
    keys.clear(); movement.x = movement.y = 0;
    velocity.x = velocity.z = 0;
    dragging = null;
  }

  function look(dx, dy) {
    if (paused || destroyed) return;
    yaw -= dx * 0.004;
    pitch = clamp(pitch + dy * 0.0035, view === 'first-person' ? -1.25 : 0.08, view === 'first-person' ? 1.25 : 1.05);
  }

  function jump() {
    if (!paused && grounded && !destroyed) { velocity.y = 6; grounded = false; }
  }

  function interact() {
    if (paused || destroyed) return null;
    const near = nearestPhotoFrame(player);
    if (near) onInteract?.(near.room, near.photo);
    return near?.room ?? null;
  }

  function setView(mode) {
    view = mode ? (mode === 'first' || mode === 'first-person' ? 'first-person' : 'third-person')
      : (view === 'first-person' ? 'third-person' : 'first-person');
    pitch = view === 'first-person' ? clamp(pitch, -1.25, 1.25) : clamp(pitch, 0.08, 1.05);
    cameraInitialized = false;
    updateQaState(true);
    renderOnce();
    return view;
  }

  function reset() {
    clearInput(); player.x = WORLD.spawn.x; player.y = 0.14; player.z = WORLD.spawn.z;
    velocity.y = 0; grounded = true; yaw = 0; pitch = 0.45; avatar.rotation.y = 0;
    cameraInitialized = false; updateRoomState(true); updateQaState(true); renderOnce();
  }

  function step(time) {
    if (destroyed || paused || document.hidden) { animationId = 0; return; }
    const dt = Math.min(0.045, Math.max(0.001, (time - lastTime) / 1000));
    lastTime = time;
    let mx = movement.x + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
      - (keys.has('KeyA') || keys.has('KeyQ') || keys.has('ArrowLeft') ? 1 : 0);
    let my = movement.y + (keys.has('KeyW') || keys.has('KeyZ') || keys.has('ArrowUp') ? 1 : 0)
      - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const magnitude = Math.hypot(mx, my);
    if (magnitude > 1) { mx /= magnitude; my /= magnitude; }
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 6.2 : 4.15;
    const desiredX = (Math.cos(yaw) * mx - Math.sin(yaw) * my) * speed;
    const desiredZ = (-Math.sin(yaw) * mx - Math.cos(yaw) * my) * speed;
    const acceleration = 1 - Math.exp(-(magnitude > 0.02 ? 15 : 20) * dt);
    velocity.x += (desiredX - velocity.x) * acceleration;
    velocity.z += (desiredZ - velocity.z) * acceleration;
    // Small substeps avoid tunneling through a narrow wall on a slow frame.
    const distance = Math.hypot(velocity.x, velocity.z) * dt;
    const substeps = Math.max(1, Math.ceil(distance / 0.15));
    for (let i = 0; i < substeps; i++) {
      const next = moveWithCollisions(player, { x: velocity.x * dt / substeps, z: velocity.z * dt / substeps }, collisionWalls, 0.32);
      player.x = clamp(next.x, bounds.minX + 0.6, bounds.maxX - 0.6);
      player.z = clamp(next.z, bounds.minZ + 0.6, bounds.maxZ - 0.6);
    }
    velocity.y -= 18 * dt; player.y += velocity.y * dt;
    if (player.y <= 0.14) { player.y = 0.14; velocity.y = 0; grounded = true; }
    const walking = Math.hypot(velocity.x, velocity.z);
    walkPhase += dt * walking * 2.5;
    const swing = Math.sin(walkPhase) * Math.min(walking / 4, 1) * 0.62 * (grounded ? 1 : 0.45);
    leftArm.rotation.x = -swing; rightArm.rotation.x = swing;
    leftLeg.rotation.x = swing; rightLeg.rotation.x = -swing;
    if (walking > 0.2) {
      const heading = Math.atan2(-velocity.x, -velocity.z);
      avatar.rotation.y += Math.atan2(Math.sin(heading - avatar.rotation.y), Math.cos(heading - avatar.rotation.y)) * Math.min(1, dt * 14);
    }
    avatar.position.set(player.x, player.y + (grounded ? Math.abs(Math.sin(walkPhase)) * Math.min(walking / 4, 1) * 0.025 : 0), player.z);
    clouds.position.x = Math.sin(time * 0.000018) * 3;
    waterShimmers.forEach((shimmer, i) => { shimmer.material.opacity = 0.4 + Math.sin(time * 0.001 + i) * 0.13; });
    updateRoomState();
    updateQaState(false, time);
    updateCamera(dt);
    try { renderer.render(scene, camera); }
    catch (error) {
      if (!errorReported) { errorReported = true; onError?.(error); }
      pause(); return;
    }
    animationId = requestAnimationFrame(step);
  }

  function resume() {
    if (destroyed) return;
    paused = false; lastTime = performance.now();
    if (!animationId && !document.hidden) animationId = requestAnimationFrame(step);
  }

  function pause() {
    paused = true; clearInput();
    if (animationId) cancelAnimationFrame(animationId);
    animationId = 0;
  }

  const interactiveTarget = (event) => {
    const target = event.target;
    return target instanceof HTMLElement && (target.isContentEditable || Boolean(target.closest(
      'input, textarea, select, button, a, [role="button"], [role="link"], [contenteditable="true"]',
    )));
  };
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyQ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight']);
  listen(window, 'keydown', (event) => {
    if (paused || event.ctrlKey || event.metaKey || event.altKey || interactiveTarget(event)) return;
    if (movementKeys.has(event.code)) { event.preventDefault(); keys.add(event.code); }
    if (!event.repeat && event.code === 'Space') jump();
    if (!event.repeat && event.code === 'KeyV') { event.preventDefault(); setView(); }
    if (!event.repeat && event.code === 'KeyE') { event.preventDefault(); interact(); }
  });
  listen(window, 'keyup', (event) => { keys.delete(event.code); });
  listen(window, 'blur', clearInput);
  listen(canvas, 'pointerdown', (event) => {
    if (paused || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
    canvas.focus?.({ preventScroll: true });
    event.preventDefault();
  });
  listen(canvas, 'pointermove', (event) => {
    if (!dragging || dragging.id !== event.pointerId) return;
    look(event.clientX - dragging.x, event.clientY - dragging.y);
    dragging.x = event.clientX; dragging.y = event.clientY;
    event.preventDefault();
  });
  const releasePointer = (event) => {
    if (dragging?.id === event.pointerId) dragging = null;
  };
  listen(canvas, 'pointerup', releasePointer);
  listen(canvas, 'pointercancel', releasePointer);
  listen(canvas, 'lostpointercapture', () => { dragging = null; });
  listen(canvas, 'contextmenu', (event) => event.preventDefault());
  listen(canvas, 'webglcontextlost', (event) => {
    event.preventDefault(); pause();
    onError?.(new Error('The graphics context was interrupted. Reload the page to re-enter the world.'));
  });
  listen(window, 'resize', resize);
  listen(document, 'visibilitychange', () => {
    clearInput();
    if (document.hidden) {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = 0;
    } else if (!paused) resume();
  });
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(canvas);
  canvas.style.touchAction = 'none';
  if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;

  function destroy() {
    if (destroyed) return;
    pause(); destroyed = true;
    photoQueue.length = 0;
    livePhotoTextures.forEach((texture) => texture.dispose());
    livePhotoTextures.clear();
    pendingPhotoTextures.forEach((texture) => texture.dispose());
    pendingPhotoTextures.clear();
    resizeObserver?.disconnect(); listeners.forEach((remove) => remove());
    const geometries = new Set(), materials = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material));
      if (object.isInstancedMesh) object.dispose?.();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    disposableTextures.forEach((texture) => texture.dispose());
    renderer.dispose();
  }

  resize(); updateRoomState(true); updateQaState(true); renderOnce();
  onReady?.(); resume();
  return {
    pause, resume, destroy, reset, setView, look, jump, interact,
    setMovement(value = {}) {
      if (paused || destroyed) return;
      movement.x = clamp(Number(value.x) || 0, -1, 1);
      movement.y = clamp(Number(value.y) || 0, -1, 1);
    },
    getState() {
      return { position: { ...player }, roomId: activeRoomId ?? null, view, paused };
    },
  };
}

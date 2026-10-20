import { ROOMS, isCorrectPassword } from './model.js';

const $ = (id) => document.getElementById(id);
const gate = $('gate');
const game = $('game');
const canvas = $('world-canvas');
const password = $('password');
const dialogs = [...document.querySelectorAll('dialog')];
const STORAGE_KEY = 'anna-world-memories-v1';
const PHOTO_STORAGE_KEY = 'anna-world-discovered-photos-v1';
const symbols = ['✿', '⛰', '⌂', '✦'];
let world = null;
let starting = false;
let currentRoom = null;
let nearbyRoom = null;
let destination = null;
let announcementTimer;
let hasShownGuide = false;
let closingWorld = false;
let albumRoom = null;
let albumIndex = 0;
const selectedPhotos = new Map();
const totalPhotos = ROOMS.reduce((count, room) => count + (room.photos?.length || 0), 0);
const photoIds = new Set(ROOMS.flatMap((room) => room.photos.map((photo) => photo.id)));
const heldDirections = new Map();

function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(Array.isArray(value) ? value.filter((id) => ROOMS.some((room) => room.id === id)) : []);
  } catch {
    return new Set();
  }
}
const visited = readProgress();
const discoveredPhotos = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(PHOTO_STORAGE_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved.filter((id) => photoIds.has(id)) : []);
  } catch { return new Set(); }
})();
const chapter = (room) => String(room.index + 1).padStart(2, '0');

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify([...discoveredPhotos]));
  }
  catch { /* Exploration still works when browser storage is disabled. */ }
}

function updateProgress() {
  $('discovery-count').textContent = `${discoveredPhotos.size} / ${totalPhotos} pictures found`;
  document.querySelectorAll('[data-room]').forEach((button) => {
    const room = ROOMS.find((entry) => entry.id === button.dataset.room);
    const isCurrent = room.id === currentRoom?.id;
    const found = room.photos.filter((photo) => discoveredPhotos.has(photo.id)).length;
    button.classList.toggle('is-visited', found === room.photos.length);
    button.classList.toggle('is-current', isCurrent);
    if (isCurrent) button.setAttribute('aria-current', 'location');
    else button.removeAttribute('aria-current');
    const status = button.querySelector('small');
    if (status) status.textContent = `${found} / ${room.photos.length} found${found === room.photos.length ? ' ✓' : ''}`;
    button.title = `${room.title} · ${found} of ${room.photos.length} pictures found`;
  });
  $('map-progress').textContent = discoveredPhotos.size === totalPhotos
    ? 'Every picture found. There’s always room for another chapter.'
    : `${discoveredPhotos.size} of ${totalPhotos} pictures found. Explore all 4 walls in each room.`;
}

function discoverPhoto(room, photo) {
  if (!photo || discoveredPhotos.has(photo.id)) return;
  discoveredPhotos.add(photo.id); visited.add(room.id);
  saveProgress(); updateProgress();
}

function updateView() {
  const firstPerson = world?.getState().view === 'first-person';
  $('view-button').setAttribute('aria-label', firstPerson ? 'Switch to third-person view' : 'Switch to first-person view');
  $('view-button').setAttribute('aria-pressed', String(Boolean(firstPerson)));
  $('crosshair').hidden = !firstPerson;
}

function updateLocation(room) {
  currentRoom = room;
  const inHall = !room && world?.getState().position.z < 0;
  $('location-label').textContent = room ? `CHAPTER ${chapter(room)}` : inHall ? 'THE HALLWAY' : 'THE GARDEN';
  $('location-title').textContent = room?.title || (inHall ? 'Pick a little chapter' : 'A world of our own');
  $('objective').textContent = room
    ? `${room.photos.length} pictures on these walls. Walk up to a frame.`
    : destination
      ? directionTo(destination)
      : inHall ? 'The rooms on either side hold our story.' : 'Follow the path. A little story waits inside.';
  updateProgress();
  if (room) {
    if (destination?.id === room.id) destination = null;
    const announcement = $('room-announcement');
    announcement.replaceChildren();
    const label = document.createElement('small');
    label.textContent = `CHAPTER ${chapter(room)}`;
    announcement.append(label, document.createTextNode(room.title));
    announcement.classList.add('show');
    clearTimeout(announcementTimer);
    announcementTimer = setTimeout(() => announcement.classList.remove('show'), 3000);
  }
}

function directionTo(room) {
  const side = room.bounds.maxX < 0 ? 'left' : 'right';
  const depth = room.index < 2 ? 'first' : 'second';
  return `${room.title}: the ${depth} door on the ${side}, as you enter the house.`;
}

function chooseDestination(room) {
  destination = room;
  $('objective').textContent = directionTo(room);
  $('map-dialog').close();
  if (!dialogs.some((dialog) => dialog.open)) canvas.focus({ preventScroll: true });
}

ROOMS.forEach((room) => {
  const button = document.createElement('button');
  button.className = 'chapter-button';
  button.dataset.room = room.id;
  button.setAttribute('aria-label', `Find ${room.title}`);
  const symbol = document.createElement('span');
  symbol.className = 'chapter-symbol'; symbol.textContent = symbols[room.index]; symbol.setAttribute('aria-hidden', 'true');
  const number = document.createElement('span');
  number.className = 'chapter-number'; number.textContent = chapter(room);
  const name = document.createElement('span');
  name.className = 'chapter-name'; name.textContent = room.title;
  button.append(symbol, number, name);
  button.addEventListener('click', () => chooseDestination(room));
  $('chapter-bar').append(button);

  const mapButton = document.createElement('button');
  mapButton.className = 'room-map-button'; mapButton.dataset.room = room.id;
  const index = document.createElement('span'); index.textContent = `ROOM ${chapter(room)}`;
  const title = document.createElement('strong'); title.textContent = room.title;
  const status = document.createElement('small');
  mapButton.append(index, title, status);
  mapButton.addEventListener('click', () => chooseDestination(room));
  $('room-map').append(mapButton);
});
updateProgress();

function stopTouchMovement() {
  heldDirections.clear();
  document.querySelectorAll('[data-move]').forEach((button) => button.classList.remove('is-held'));
  world?.setMovement({ x: 0, y: 0 });
}

function showDialog(dialog) {
  if (!world || starting || dialog.open) return;
  world.pause(); stopTouchMovement();
  dialogs.forEach((other) => { if (other.open) other.close(); });
  dialog.showModal();
}

dialogs.forEach((dialog) => {
  dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => {
    if (closingWorld || dialogs.some((other) => other.open) || !world) return;
    world.resume(); updateView(); canvas.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog || dialog.id === 'error-dialog') return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
});

function albumPhotos(room) {
  if (room.photos?.length) return room.photos;
  return room.image ? [{ id: room.id, src: room.image, date: room.date, caption: '' }] : [];
}

function showPhoto(index) {
  if (!albumRoom) return;
  const room = albumRoom;
  const photos = albumPhotos(room);
  albumIndex = photos.length ? ((index % photos.length) + photos.length) % photos.length : 0;
  const photo = photos[albumIndex];
  if (photo) selectedPhotos.set(room.id, photo.id);
  const image = $('memory-image');
  const placeholder = new URL(`./art/chapter-${room.index + 1}.svg`, import.meta.url).href;
  $('photo-stage').setAttribute('aria-busy', 'true');
  image.onload = () => $('photo-stage').setAttribute('aria-busy', 'false');
  image.onerror = () => {
    image.onerror = null;
    image.src = placeholder;
    image.alt = `Photo unavailable in ${room.title}; showing a pixel art illustration`;
    $('memory-image-note').hidden = false;
    $('memory-image-note').textContent = 'This photo couldn’t load. Try the next picture.';
    $('photo-stage').setAttribute('aria-busy', 'false');
  };
  image.dataset.photoId = photo?.id || '';
  image.src = photo ? new URL(photo.src, import.meta.url).href : placeholder;
  $('memory-full-size').hidden = !photo;
  if (photo) $('memory-full-size').href = image.src;
  else $('memory-full-size').removeAttribute('href');
  image.alt = photo ? `Photo ${albumIndex + 1} of ${photos.length} in ${room.title}` : `Pixel art illustration for ${room.title}`;
  $('memory-image-note').hidden = Boolean(photo && !photo.caption);
  $('memory-image-note').textContent = photo?.caption || 'A little illustration, until our photo goes here.';
  $('memory-photo-count').textContent = `PHOTO ${albumIndex + 1} OF ${photos.length}`;
  $('album-controls').hidden = photos.length < 2;
  $('memory-thumbnails').hidden = photos.length < 2;
  $('album-help').hidden = photos.length < 2;
  $('memory-date').textContent = photo?.date || room.date || '';
  $('memory-date').hidden = !$('memory-date').textContent;
  $('memory-placeholder').hidden = Boolean(photo);
  const thumbnails = [...$('memory-thumbnails').children];
  thumbnails.forEach((button, i) => {
    button.classList.toggle('is-active', i === albumIndex);
    button.setAttribute('aria-pressed', String(i === albumIndex));
  });
  const active = thumbnails[albumIndex];
  if (active) {
    const strip = $('memory-thumbnails');
    strip.scrollTo({ left: active.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2, behavior: 'instant' });
  }
}

function openMemory(room, wallPhoto = null) {
  if (!room || dialogs.some((dialog) => dialog.open)) return;
  albumRoom = room;
  const photos = albumPhotos(room);
  const selected = wallPhoto?.id || selectedPhotos.get(room.id) || room.coverPhotoId;
  albumIndex = Math.max(0, photos.findIndex((photo) => photo.id === selected));
  $('memory-chapter').textContent = `CHAPTER ${chapter(room)} · OUR PHOTO ALBUM`;
  $('memory-title').textContent = room.title;
  $('memory-description').textContent = room.description;
  $('memory-thumbnails').replaceChildren();
  photos.forEach((photo, index) => {
    const button = document.createElement('button');
    button.className = 'photo-thumbnail'; button.type = 'button';
    button.setAttribute('aria-label', `Show photo ${index + 1} of ${photos.length}`);
    const thumb = document.createElement('img');
    thumb.src = new URL(photo.thumbnail || photo.src, import.meta.url).href;
    thumb.alt = ''; thumb.loading = 'lazy'; thumb.decoding = 'async';
    if (photo.width && photo.height) { thumb.width = photo.width; thumb.height = photo.height; }
    button.append(thumb); button.addEventListener('click', () => showPhoto(index));
    $('memory-thumbnails').append(button);
  });
  visited.add(room.id); saveProgress(); updateProgress();
  if (wallPhoto) discoverPhoto(room, wallPhoto);
  showDialog($('memory-dialog'));
  showPhoto(albumIndex);
}

$('previous-photo').addEventListener('click', () => showPhoto(albumIndex - 1));
$('next-photo').addEventListener('click', () => showPhoto(albumIndex + 1));
$('memory-dialog').addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || !albumRoom) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); showPhoto(albumIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
let photoSwipe = null;
$('photo-stage').addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch') photoSwipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
$('photo-stage').addEventListener('pointerup', (event) => {
  if (!photoSwipe || event.pointerId !== photoSwipe.id) return;
  const dx = event.clientX - photoSwipe.x, dy = event.clientY - photoSwipe.y;
  photoSwipe = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) showPhoto(albumIndex + (dx < 0 ? 1 : -1));
});
$('photo-stage').addEventListener('pointercancel', () => { photoSwipe = null; });
$('memory-dialog').addEventListener('close', () => { albumRoom = null; photoSwipe = null; });

function worldError(error) {
  console.error('Anna world:', error);
  world?.pause();
  $('loading').hidden = true;
  starting = false;
  $('enter-button').disabled = false;
  $('world-error').textContent = 'This world needs WebGL graphics. Try enabling hardware acceleration or opening the page in a recent Chrome, Firefox, or Safari.';
  if (!$('error-dialog').open) $('error-dialog').showModal();
}

async function enterWorld() {
  if (starting || world) return;
  starting = true;
  $('enter-button').disabled = true;
  password.blur();
  $('loading').hidden = false;
  gate.hidden = true; game.hidden = false;
  // Let the loading screen paint before building the local 3D scene.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    const { createWorld } = await import('./engine.js');
    world = await createWorld({
      canvas,
      onRoomChange: updateLocation,
      onNearbyMemory(room, photo) {
        nearbyRoom = room;
        $('interact-button').hidden = !room || !photo;
        if (room && photo) {
          const index = room.photos.findIndex((entry) => entry.id === photo.id) + 1;
          $('interact-button').querySelector('span').textContent = `View picture ${index} of ${room.photos.length}`;
          discoverPhoto(room, photo);
        }
      },
      onInteract: openMemory,
      onError: worldError,
    });
    starting = false;
    $('loading').hidden = true;
    $('enter-button').disabled = false;
    updateLocation(null); updateView();
    canvas.focus({ preventScroll: true });
    if (!hasShownGuide) { hasShownGuide = true; showDialog($('help-dialog')); }
  } catch (error) { worldError(error); }
}

$('password-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!isCorrectPassword(password.value)) {
    password.setAttribute('aria-invalid', 'true');
    $('password-error').textContent = 'Try another word. This door is still closed.';
    const card = document.querySelector('.gate-card');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    password.focus(); password.select();
    return;
  }
  password.removeAttribute('aria-invalid'); $('password-error').textContent = '';
  enterWorld();
});
password.addEventListener('input', () => { password.removeAttribute('aria-invalid'); $('password-error').textContent = ''; });
$('show-password').addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  $('show-password').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  $('show-password').setAttribute('aria-pressed', String(show));
});

$('map-button').addEventListener('click', () => showDialog($('map-dialog')));
$('help-button').addEventListener('click', () => showDialog($('help-dialog')));
$('pause-button').addEventListener('click', () => showDialog($('pause-dialog')));
$('view-button').addEventListener('click', () => { world?.setView(); updateView(); canvas.focus({ preventScroll: true }); });
$('interact-button').addEventListener('click', () => { if (nearbyRoom) world?.interact(); });
$('jump-button').addEventListener('pointerdown', (event) => { event.preventDefault(); world?.jump(); });
$('reset-button').addEventListener('click', () => { destination = null; world?.reset(); $('pause-dialog').close(); updateLocation(null); updateView(); });
$('restart-button').addEventListener('click', () => {
  visited.clear(); discoveredPhotos.clear(); selectedPhotos.clear(); saveProgress(); destination = null;
  world?.reset(); updateProgress(); updateLocation(null); updateView();
  $('pause-dialog').close();
});

function closeWorld() {
  closingWorld = true;
  dialogs.forEach((dialog) => { if (dialog.open) dialog.close(); });
  stopTouchMovement(); world?.destroy(); world = null;
  currentRoom = nearbyRoom = destination = null;
  clearTimeout(announcementTimer);
  $('room-announcement').classList.remove('show');
  $('interact-button').hidden = true;
  $('loading').hidden = true;
  game.hidden = true; gate.hidden = false;
  password.value = ''; password.type = 'password';
  $('show-password').setAttribute('aria-label', 'Show password');
  $('show-password').setAttribute('aria-pressed', 'false');
  starting = false; $('enter-button').disabled = false;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  closingWorld = false;
  password.focus(); updateProgress();
}
$('lock-button').addEventListener('click', closeWorld);
$('retry-button').addEventListener('click', () => { closeWorld(); password.value = ''; });
$('error-dialog').addEventListener('cancel', (event) => { event.preventDefault(); closeWorld(); });

if (!document.fullscreenEnabled) $('fullscreen-button').hidden = true;
$('fullscreen-button').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await game.requestFullscreen();
  } catch { /* Some embedded browsers reserve fullscreen for the host app. */ }
});
document.addEventListener('fullscreenchange', () => {
  $('fullscreen-button').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
});

function updateTouchMovement() {
  const held = new Set(heldDirections.values());
  world?.setMovement({ x: Number(held.has('right')) - Number(held.has('left')), y: Number(held.has('forward')) - Number(held.has('back')) });
}
document.querySelectorAll('[data-move]').forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    if (!world || dialogs.some((dialog) => dialog.open)) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    heldDirections.set(event.pointerId, button.dataset.move); button.classList.add('is-held'); updateTouchMovement();
  });
  const release = (event) => {
    heldDirections.delete(event.pointerId); button.classList.remove('is-held'); updateTouchMovement();
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});

window.addEventListener('keydown', (event) => {
  if (!world || starting || event.ctrlKey || event.metaKey || event.altKey || event.repeat || dialogs.some((dialog) => dialog.open)) return;
  if (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return;
  if (event.code === 'KeyM') { event.preventDefault(); showDialog($('map-dialog')); }
  if (event.code === 'Escape') { event.preventDefault(); showDialog($('pause-dialog')); }
  if (event.code === 'KeyV') requestAnimationFrame(updateView);
});
window.addEventListener('blur', stopTouchMovement);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && world && !dialogs.some((dialog) => dialog.open)) showDialog($('pause-dialog'));
});
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) world?.destroy();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted && world) showDialog($('pause-dialog'));
});

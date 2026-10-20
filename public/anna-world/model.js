import { getRoomPhotos } from './photo-library.js';
import { layoutRoomFrames } from './gallery-layout.js';

// Dates and stories belong here; individual photos live in photo-library.js.
// Keep room IDs stable so saved discoveries continue to work.
export const WORLD = {
  spawn: { x: 0, z: 16 },
  bounds: { minX: -48, maxX: 48, minZ: -65, maxZ: 34 },
};

const room = (id, index, title, subtitle, description, color, bounds, { date = '', coverPhotoId = null } = {}) => {
  const photos = getRoomPhotos(id);
  const cover = photos.find((photo) => photo.id === coverPhotoId) ?? photos[0] ?? null;
  const memoryRoom = {
    id,
    index,
    title,
    subtitle,
    date,
    description,
    color,
    photos,
    coverPhotoId: cover?.id ?? null,
    image: cover?.src ?? null,
    bounds,
    door: { x: bounds.maxX < 0 ? bounds.maxX : bounds.minX, z: (bounds.minZ + bounds.maxZ) / 2 },
  };
  memoryRoom.frames = layoutRoomFrames(memoryRoom);
  const coverFrame = memoryRoom.frames.find(({ photoId }) => photoId === cover?.id) ?? memoryRoom.frames[0];
  memoryRoom.frame = { x: coverFrame.x, z: coverFrame.z, rotation: coverFrame.rotation };
  return memoryRoom;
};

export const ROOMS = [
  room(
    'the-beginning', 0, 'The beginning', 'A place for our first chapter',
    'A collection of us, kept together. Follow the photographs around the walls and open any one for a closer look.',
    '#edba78', { minX: -23, maxX: -3, minZ: -24, maxZ: 0 },
    { date: '', coverPhotoId: 'img-7929' },
  ),
  room(
    'little-adventures', 1, 'Little adventures', 'A place for the days we went exploring',
    'A few more moments to wander through together. Each photograph has a place in this room.',
    '#9abc91', { minX: 3, maxX: 23, minZ: -24, maxZ: 0 },
    { date: '', coverPhotoId: 'img-7964' },
  ),
  room(
    'the-everyday', 2, 'The everyday', 'A place for the small things',
    'The small moments deserve a room too. Stay a little while and walk through the photographs.',
    '#b4a1c9', { minX: -23, maxX: -3, minZ: -50, maxZ: -26 },
    { date: '', coverPhotoId: 'img-7996' },
  ),
  room(
    'still-to-come', 3, 'More of us', 'A place for more shared moments',
    'More photographs of us, with room for the stories behind them whenever we want to add them.',
    '#92c8cf', { minX: 3, maxX: 23, minZ: -50, maxZ: -26 },
    { date: '', coverPhotoId: 'img-8036' },
  ),
];

const WALL_THICKNESS = 0.5;
const DOOR_HALF_WIDTH = 2;
const ROOM_HEIGHT = 4.5;

function roomWalls({ bounds, door }) {
  const { minX, maxX, minZ, maxZ } = bounds;
  const isLeft = maxX < 0;
  const outerX = isLeft ? minX : maxX - WALL_THICKNESS;
  const innerX = isLeft ? maxX - WALL_THICKNESS : minX;
  const wall = (left, right, back, front) => ({
    minX: left, maxX: right, minZ: back, maxZ: front, height: ROOM_HEIGHT,
  });

  return [
    wall(minX, maxX, minZ, minZ + WALL_THICKNESS),
    wall(minX, maxX, maxZ - WALL_THICKNESS, maxZ),
    wall(outerX, outerX + WALL_THICKNESS, minZ, maxZ),
    wall(innerX, innerX + WALL_THICKNESS, minZ, door.z - DOOR_HALF_WIDTH),
    wall(innerX, innerX + WALL_THICKNESS, door.z + DOOR_HALF_WIDTH, maxZ),
  ];
}

export const WALLS = [
  ...ROOMS.flatMap(roomWalls),
  {
    minX: -3, maxX: 3,
    minZ: Math.min(...ROOMS.map(({ bounds }) => bounds.minZ)),
    maxZ: Math.min(...ROOMS.map(({ bounds }) => bounds.minZ)) + WALL_THICKNESS,
    height: ROOM_HEIGHT,
  },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const inside = ({ x, z }, { minX, maxX, minZ, maxZ }) =>
  x > minX && x < maxX && z > minZ && z < maxZ;

function collides({ x, z }, radius, walls) {
  return walls.some((wall) => {
    const nearestX = clamp(x, wall.minX, wall.maxX);
    const nearestZ = clamp(z, wall.minZ, wall.maxZ);
    return (x - nearestX) ** 2 + (z - nearestZ) ** 2 < radius ** 2;
  });
}

/** Move on the ground plane, sliding along walls without crossing thin blocks. */
export function moveWithCollisions(position, delta, walls = WALLS, radius = 0.32) {
  if (![position.x, position.z, delta.x, delta.z, radius].every(Number.isFinite) || radius <= 0) {
    throw new TypeError('Movement needs finite coordinates and a positive player radius.');
  }

  const { minX, maxX, minZ, maxZ } = WORLD.bounds;
  let x = clamp(position.x, minX + radius, maxX - radius);
  let z = clamp(position.z, minZ + radius, maxZ - radius);
  // Clamp the destination before stepping so even a huge delta stays bounded.
  const dx = clamp(x + delta.x, minX + radius, maxX - radius) - x;
  const dz = clamp(z + delta.z, minZ + radius, maxZ - radius) - z;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.min(0.16, radius / 2)));

  for (let step = 0; step < steps; step += 1) {
    const nextX = x + dx / steps;
    if (!collides({ x: nextX, z }, radius, walls)) x = nextX;
    const nextZ = z + dz / steps;
    if (!collides({ x, z: nextZ }, radius, walls)) z = nextZ;
  }

  return { x, z };
}

export function roomAt(position) {
  return ROOMS.find(({ bounds }) => inside(position, bounds)) ?? null;
}

/** Pick the closest photograph on the player's side of their room's walls. */
export function nearestPhotoFrame(position, maxDistance = 2.8) {
  const currentRoom = roomAt(position);
  if (!currentRoom || !Number.isFinite(maxDistance) || maxDistance < 0) return null;
  let closest = null;
  let closestDistance = maxDistance;
  for (const frame of currentRoom.frames) {
    const dx = position.x - frame.x;
    const dz = position.z - frame.z;
    const inwardDistance = dx * Math.sin(frame.rotation) + dz * Math.cos(frame.rotation);
    const distance = Math.hypot(dx, dz);
    if (inwardDistance >= 0 && distance <= closestDistance) {
      closest = { room: currentRoom, frame, photo: frame.photo };
      closestDistance = distance;
    }
  }
  return closest;
}

/** Retained for callers that only need the nearby frame's room. */
export function nearestMemory(position, maxDistance = 2.8) {
  return nearestPhotoFrame(position, maxDistance)?.room ?? null;
}

// This is a playful static-page gate. It does not protect published files.
export function isCorrectPassword(value) {
  return typeof value === 'string' && value.trim() === 'tesco';
}

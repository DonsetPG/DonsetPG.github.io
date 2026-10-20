import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  WORLD, ROOMS, WALLS, isCorrectPassword, moveWithCollisions, nearestMemory, roomAt,
} from '../public/anna-world/model.js';
import { PHOTO_LIBRARY, getRoomPhotos } from '../public/anna-world/photo-library.js';

const assetBase = new URL('../public/anna-world/', import.meta.url);

function webpDimensions(relativePath) {
  const data = readFileSync(new URL(relativePath, assetBase));
  assert.equal(data.toString('ascii', 0, 4), 'RIFF', `${relativePath} must be a WebP file`);
  assert.equal(data.toString('ascii', 8, 12), 'WEBP', `${relativePath} must be a WebP file`);
  for (let offset = 12; offset + 8 <= data.length;) {
    const type = data.toString('ascii', offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    const payload = offset + 8;
    assert.ok(payload + size <= data.length, `${relativePath} has a complete ${type} chunk`);
    if (type === 'VP8X') {
      return { width: data.readUIntLE(payload + 4, 3) + 1, height: data.readUIntLE(payload + 7, 3) + 1 };
    }
    if (type === 'VP8 ') {
      assert.equal(data.toString('hex', payload + 3, payload + 6), '9d012a');
      return { width: data.readUInt16LE(payload + 6) & 0x3fff, height: data.readUInt16LE(payload + 8) & 0x3fff };
    }
    if (type === 'VP8L') {
      assert.equal(data[payload], 0x2f);
      const dimensions = data.readUInt32LE(payload + 1);
      return { width: (dimensions & 0x3fff) + 1, height: ((dimensions >>> 14) & 0x3fff) + 1 };
    }
    offset = payload + size + (size % 2);
  }
  assert.fail(`No image dimensions found in ${relativePath}`);
}

const near = (actual, expected, tolerance = 1e-8) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be within ${tolerance} of ${expected}`);

function travel(position, target) {
  return moveWithCollisions(position, { x: target.x - position.x, z: target.z - position.z });
}

test('accepts the chosen password with surrounding space and rejects wrong values', () => {
  for (const value of ['tesco', ' tesco ', '\ttesco\n']) assert.equal(isCorrectPassword(value), true);
  for (const value of ['', 'Tesco', 'TESCO', 'tescos', 'te sco', null, undefined, 123]) {
    assert.equal(isCorrectPassword(value), false);
  }
});

test('all 126 images appear once across the four room albums', () => {
  assert.equal(PHOTO_LIBRARY.length, 126);
  assert.equal(new Set(PHOTO_LIBRARY.map(({ id }) => id)).size, PHOTO_LIBRARY.length);
  assert.equal(new Set(PHOTO_LIBRARY.map(({ sourceName }) => sourceName)).size, PHOTO_LIBRARY.length);
  assert.deepEqual(ROOMS.map(({ photos }) => photos.length), [32, 31, 31, 32]);

  const assignedIds = ROOMS.flatMap(({ photos }) => photos.map(({ id }) => id));
  assert.equal(new Set(assignedIds).size, PHOTO_LIBRARY.length);
  assert.deepEqual([...assignedIds].sort(), PHOTO_LIBRARY.map(({ id }) => id).sort());
  for (const room of ROOMS) {
    assert.deepEqual(room.photos, getRoomPhotos(room.id));
    assert.ok(room.photos.every((photo) => photo.roomId === room.id));
  }
  assert.deepEqual(getRoomPhotos('unknown-room'), []);
});

test('import order follows source filenames without claiming relationship dates', () => {
  const importedPhotos = PHOTO_LIBRARY.filter(({ sourceName }) => /^IMG_\d+\.PNG$/.test(sourceName));
  assert.equal(importedPhotos.length, 125);
  const filenames = importedPhotos.map(({ sourceName }) => sourceName);
  assert.deepEqual(filenames, [...filenames].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })));
  assert.deepEqual(ROOMS.flatMap(({ photos }) => photos.map(({ id }) => id)), PHOTO_LIBRARY.map(({ id }) => id));
  for (const photo of PHOTO_LIBRARY) {
    assert.equal(photo.date, '', `${photo.sourceName} has no supplied event date`);
  }
  for (const photo of importedPhotos) assert.equal(photo.caption, '', `${photo.sourceName} has no supplied caption`);
  const chart = PHOTO_LIBRARY.at(-1);
  assert.equal(chart.id, 'messages-per-month');
  assert.equal(chart.caption, 'Messages per month');
  assert.equal(chart.roomId, 'still-to-come');
  for (const room of ROOMS) assert.equal(room.date, '', `${room.title} has no supplied event date`);
  assert.equal(ROOMS[3].id, 'still-to-come');
  assert.equal(ROOMS[3].title, 'More of us');
});

test('every album photograph and thumbnail exists with matching image dimensions', () => {
  const paths = PHOTO_LIBRARY.map(({ src }) => src.replace('./photos/', ''));
  const publishedPhotos = readdirSync(new URL('./photos/', assetBase)).filter((path) => path.endsWith('.webp'));
  assert.deepEqual(publishedPhotos.sort(), paths.sort());
  const publishedThumbnails = readdirSync(new URL('./photos/thumbs/', assetBase)).filter((path) => path.endsWith('.webp'));
  assert.deepEqual(publishedThumbnails.sort(), [...paths].sort());

  for (const photo of PHOTO_LIBRARY) {
    assert.match(photo.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(photo.src, `./photos/${photo.id}.webp`);
    assert.equal(photo.thumbnail, `./photos/thumbs/${photo.id}.webp`);
    assert.ok(Number.isInteger(photo.width) && photo.width > 0);
    assert.ok(Number.isInteger(photo.height) && photo.height > 0);
    assert.deepEqual(webpDimensions(photo.src), { width: photo.width, height: photo.height });
    const thumbnail = webpDimensions(photo.thumbnail);
    assert.ok(thumbnail.width > 0 && thumbnail.height > 0);
    assert.ok(thumbnail.width <= photo.width && thumbnail.height <= photo.height);
  }
});

test('each room wall frame uses a photograph from its own album', () => {
  for (const room of ROOMS) {
    const cover = room.photos.find(({ id }) => id === room.coverPhotoId);
    assert.ok(cover, `${room.title} has a cover in its album`);
    assert.equal(room.image, cover.src);
  }
});

test('all four doorways connect the central hall to their rooms in both directions', () => {
  for (const room of ROOMS) {
    const center = { x: (room.bounds.minX + room.bounds.maxX) / 2, z: room.door.z };
    const fromHall = travel({ x: 0, z: room.door.z }, center);
    near(fromHall.x, center.x);
    near(fromHall.z, center.z);
    const toHall = travel(center, { x: 0, z: room.door.z });
    near(toHall.x, 0);
    near(toHall.z, room.door.z);
  }
});

test('large movements cannot tunnel through exterior walls or the closed hall end', () => {
  const left = moveWithCollisions({ x: -10, z: -8 }, { x: -200, z: 0 });
  assert.ok(left.x >= -16.18 && left.x < -15.9);
  const right = moveWithCollisions({ x: 10, z: -8 }, { x: 200, z: 0 });
  assert.ok(right.x <= 16.18 && right.x > 15.9);
  const back = moveWithCollisions({ x: 0, z: -30 }, { x: 0, z: -200 });
  assert.ok(back.z >= -33.18 && back.z < -33);
});

test('inner room walls stop movement outside the door openings', () => {
  for (const room of ROOMS) {
    const z = room.door.z + 4;
    const position = travel({ x: 0, z }, { x: room.frame.x, z });
    assert.equal(roomAt(position), null);
    assert.ok(Math.abs(position.x) < 2.7);
  }
});

test('diagonal movement slides along walls without clipping their corners', () => {
  const position = moveWithCollisions({ x: -10, z: -8 }, { x: -30, z: 4 });
  assert.ok(position.x >= -16.18);
  near(position.z, -4);
  for (const wall of WALLS) {
    const x = Math.max(wall.minX, Math.min(wall.maxX, position.x));
    const z = Math.max(wall.minZ, Math.min(wall.maxZ, position.z));
    assert.ok(Math.hypot(position.x - x, position.z - z) >= 0.32 - 1e-8);
  }
});

test('the player stays inside the outdoor boundary including its radius', () => {
  const { minX, maxX, minZ, maxZ } = WORLD.bounds;
  const bottomRight = moveWithCollisions({ x: 30, z: 25 }, { x: 1e9, z: 1e9 });
  near(bottomRight.x, maxX - 0.32);
  near(bottomRight.z, maxZ - 0.32);
  const topLeft = moveWithCollisions({ x: -30, z: -40 }, { x: -1e9, z: -1e9 });
  near(topLeft.x, minX + 0.32);
  near(topLeft.z, minZ + 0.32);
});

test('every memory can be reached from spawn through its doorway and inspected', () => {
  for (const room of ROOMS) {
    let position = { ...WORLD.spawn };
    for (const target of [
      { x: 0, z: room.door.z },
      { x: room.frame.x, z: room.door.z },
      { x: room.frame.x, z: room.frame.z + 2 },
    ]) position = travel(position, target);
    assert.equal(roomAt(position), room);
    assert.equal(nearestMemory(position), room);
    near(position.x, room.frame.x);
    near(position.z, room.frame.z + 2);
  }
});

test('room and memory detection avoid interactions from the hall or through walls', () => {
  assert.equal(roomAt(WORLD.spawn), null);
  assert.equal(nearestMemory(WORLD.spawn), null);
  for (const room of ROOMS) {
    assert.equal(roomAt({ x: room.frame.x, z: room.door.z }), room);
    assert.equal(roomAt({ x: room.door.x, z: room.door.z }), null);
    assert.equal(nearestMemory({ x: room.frame.x, z: room.bounds.minZ - 0.1 }), null);
    assert.equal(nearestMemory({ x: room.frame.x, z: room.frame.z + 3.6 }), null);
    assert.equal(nearestMemory({ x: room.frame.x, z: room.frame.z + 2 }, 1), null);
  }
});

test('invalid movement values fail instead of corrupting player coordinates', () => {
  for (const delta of [{ x: NaN, z: 0 }, { x: 0, z: Infinity }]) {
    assert.throws(() => moveWithCollisions(WORLD.spawn, delta), TypeError);
  }
  assert.throws(() => moveWithCollisions(WORLD.spawn, { x: 0, z: 0 }, WALLS, 0), TypeError);
});

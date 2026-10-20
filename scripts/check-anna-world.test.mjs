import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  WORLD, ROOMS, WALLS, isCorrectPassword, moveWithCollisions, nearestMemory, nearestPhotoFrame, roomAt,
} from '../public/anna-world/model.js';
import { layoutRoomFrames } from '../public/anna-world/gallery-layout.js';
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

const centerOf = ({ bounds }) => ({ x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 });
const approach = (frame, distance = 1.8) => ({
  x: frame.x + Math.sin(frame.rotation) * distance,
  z: frame.z + Math.cos(frame.rotation) * distance,
});

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

test('every image has its own permanent eye-level wall frame in album order', () => {
  const frames = ROOMS.flatMap(({ frames }) => frames);
  assert.equal(frames.length, 126);
  assert.equal(new Set(frames.map(({ id }) => id)).size, 126);
  assert.equal(new Set(frames.map(({ photoId }) => photoId)).size, 126);
  assert.deepEqual(frames.map(({ photoId }) => photoId), PHOTO_LIBRARY.map(({ id }) => id));
  for (const room of ROOMS) {
    const cover = room.photos.find(({ id }) => id === room.coverPhotoId);
    assert.ok(cover, `${room.title} has a cover in its album`);
    assert.equal(room.image, cover.src);
    assert.deepEqual(room.frames, layoutRoomFrames(room));
    const coverFrame = room.frames.find(({ photoId }) => photoId === cover.id);
    assert.deepEqual(room.frame, { x: coverFrame.x, z: coverFrame.z, rotation: coverFrame.rotation });
    for (const [index, frame] of room.frames.entries()) {
      assert.equal(frame.id, `${room.id}:${room.photos[index].id}`);
      assert.equal(frame.roomId, room.id);
      assert.equal(frame.photoId, room.photos[index].id);
      assert.equal(frame.photo, room.photos[index]);
      assert.equal(frame.index, index);
      assert.equal(frame.y, 2.15);
      assert.equal(frame.width, 1.75);
      assert.equal(frame.height, 2.25);
    }
  }
});

test('wall frames leave space at corners, between neighbours, and across every doorway', () => {
  for (const room of ROOMS) {
    const { minX, maxX, minZ, maxZ } = room.bounds;
    for (const frame of room.frames) {
      const horizontal = Math.abs(Math.sin(frame.rotation)) < 1e-8;
      const coordinate = horizontal ? frame.x : frame.z;
      const minimum = horizontal ? minX : minZ;
      const maximum = horizontal ? maxX : maxZ;
      assert.ok(coordinate - frame.width / 2 >= minimum + 1.2, `${frame.id} clears the first corner`);
      assert.ok(coordinate + frame.width / 2 <= maximum - 1.2, `${frame.id} clears the second corner`);
      if (horizontal) {
        near(frame.z, frame.rotation === 0 ? minZ + 0.64 : maxZ - 0.64);
      } else {
        near(frame.x, Math.sin(frame.rotation) > 0 ? minX + 0.64 : maxX - 0.64);
        if (Math.abs(frame.x - room.door.x) < 1) {
          assert.ok(frame.z + frame.width / 2 <= room.door.z - 2 - 1.2
            || frame.z - frame.width / 2 >= room.door.z + 2 + 1.2, `${frame.id} clears the doorway`);
        }
      }
      assert.equal(roomAt(approach(frame)), room);
      for (const neighbour of room.frames) {
        if (neighbour.index <= frame.index || neighbour.rotation !== frame.rotation) continue;
        const gap = Math.hypot(frame.x - neighbour.x, frame.z - neighbour.z) - frame.width;
        assert.ok(gap >= 0.25, `${frame.id} and ${neighbour.id} have space between them`);
      }
    }
  }
  assert.throws(() => layoutRoomFrames({ ...ROOMS[0], photos: Array(33).fill(ROOMS[0].photos[0]) }), RangeError);
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
  for (const room of ROOMS) {
    const isLeft = room.bounds.maxX < 0;
    const position = moveWithCollisions(centerOf(room), { x: isLeft ? -200 : 200, z: 0 });
    const limit = isLeft ? room.bounds.minX + 0.82 : room.bounds.maxX - 0.82;
    assert.ok(isLeft ? position.x >= limit : position.x <= limit);
    assert.ok(Math.abs(position.x - limit) < 0.16);
  }
  const endZ = Math.min(...ROOMS.map(({ bounds }) => bounds.minZ));
  const back = moveWithCollisions({ x: 0, z: endZ + 4 }, { x: 0, z: -200 });
  assert.ok(back.z >= endZ + 0.82 && back.z < endZ + 0.98);
});

test('inner room walls stop movement outside the door openings', () => {
  for (const room of ROOMS) {
    const z = room.door.z + 4;
    const position = travel({ x: 0, z }, { x: centerOf(room).x, z });
    assert.equal(roomAt(position), null);
    assert.ok(Math.abs(position.x) < 2.7);
  }
});

test('diagonal movement slides along walls without clipping their corners', () => {
  const room = ROOMS[0];
  const center = centerOf(room);
  const position = moveWithCollisions(center, { x: -30, z: 4 });
  assert.ok(position.x >= room.bounds.minX + 0.82);
  near(position.z, center.z + 4);
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
  const topLeft = moveWithCollisions({ x: -30, z: minZ + 4 }, { x: -1e9, z: -1e9 });
  near(topLeft.x, minX + 0.32);
  near(topLeft.z, minZ + 0.32);
});

test('all 126 photographs can be reached from spawn through their doorway and inspected', () => {
  for (const room of ROOMS) {
    for (const frame of room.frames) {
      let position = { ...WORLD.spawn };
      const targetPosition = approach(frame);
      for (const target of [{ x: 0, z: room.door.z }, centerOf(room), targetPosition]) {
        position = travel(position, target);
      }
      assert.equal(roomAt(position), room);
      assert.equal(nearestMemory(position), room);
      assert.deepEqual(nearestPhotoFrame(position), { room, frame, photo: frame.photo });
      near(position.x, targetPosition.x);
      near(position.z, targetPosition.z);
    }
  }
});

test('room and memory detection avoid interactions from the hall or through walls', () => {
  assert.equal(roomAt(WORLD.spawn), null);
  assert.equal(nearestMemory(WORLD.spawn), null);
  for (const room of ROOMS) {
    assert.equal(roomAt(centerOf(room)), room);
    assert.equal(roomAt({ x: room.door.x, z: room.door.z }), null);
    assert.equal(nearestPhotoFrame(centerOf(room)), null);
    assert.equal(nearestPhotoFrame({ x: 0, z: room.door.z }), null);
    for (const frame of room.frames) {
      assert.equal(nearestPhotoFrame(approach(frame, -1)), null, `${frame.id} cannot open through its wall`);
      assert.equal(nearestPhotoFrame(approach(frame, -0.1), 0.2), null, `${frame.id} only opens from its face`);
      assert.equal(nearestPhotoFrame(approach(frame), 1), null);
      for (const distance of [-1, NaN, Infinity]) assert.equal(nearestPhotoFrame(approach(frame), distance), null);
    }
  }
});

test('invalid movement values fail instead of corrupting player coordinates', () => {
  for (const delta of [{ x: NaN, z: 0 }, { x: 0, z: Infinity }]) {
    assert.throws(() => moveWithCollisions(WORLD.spawn, delta), TypeError);
  }
  assert.throws(() => moveWithCollisions(WORLD.spawn, { x: 0, z: 0 }, WALLS, 0), TypeError);
});

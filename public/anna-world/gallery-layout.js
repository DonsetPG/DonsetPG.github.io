const FRAME_WIDTH = 1.75;
const FRAME_HEIGHT = 2.25;
const WALL_INSET = 0.64;
const DOOR_HALF_WIDTH = 2;
// The extra corner space lets a player stand squarely in front of either wall.
const EDGE_MARGIN = 1.625;

function pointsBetween(start, end, count) {
  const direction = Math.sign(end - start);
  const first = start + direction * (EDGE_MARGIN + FRAME_WIDTH / 2);
  const last = end - direction * (EDGE_MARGIN + FRAME_WIDTH / 2);
  return Array.from({ length: count }, (_, index) => first + (last - first) * index / (count - 1));
}

/** Lay out one eye-level photograph per slot, following the room perimeter. */
export function layoutRoomFrames(room) {
  const { minX, maxX, minZ, maxZ } = room.bounds;
  const left = maxX < 0;
  const innerX = left ? maxX - WALL_INSET : minX + WALL_INSET;
  const outerX = left ? minX + WALL_INSET : maxX - WALL_INSET;
  const innerRotation = left ? -Math.PI / 2 : Math.PI / 2;
  const outerRotation = -innerRotation;
  const innerEdge = left ? maxX : minX;
  const outerEdge = left ? minX : maxX;
  const doorZ = room.door?.z ?? (minZ + maxZ) / 2;
  const slots = [
    ...pointsBetween(doorZ + DOOR_HALF_WIDTH, maxZ, 3).map((z) => ({ x: innerX, z, rotation: innerRotation })),
    ...pointsBetween(innerEdge, outerEdge, 8).map((x) => ({ x, z: maxZ - WALL_INSET, rotation: Math.PI })),
    ...pointsBetween(maxZ, minZ, 10).map((z) => ({ x: outerX, z, rotation: outerRotation })),
    ...pointsBetween(outerEdge, innerEdge, 8).map((x) => ({ x, z: minZ + WALL_INSET, rotation: 0 })),
    ...pointsBetween(minZ, doorZ - DOOR_HALF_WIDTH, 3).map((z) => ({ x: innerX, z, rotation: innerRotation })),
  ];

  if (room.photos.length > slots.length) {
    throw new RangeError(`${room.id} has ${room.photos.length} photos but only ${slots.length} wall slots.`);
  }

  return room.photos.map((photo, index) => ({
    id: `${room.id}:${photo.id}`,
    roomId: room.id,
    photoId: photo.id,
    photo,
    ...slots[index],
    y: 2.15,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    index,
  }));
}

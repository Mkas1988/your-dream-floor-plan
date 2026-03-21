import { BuildingConfig, RoomConfig, WallSegment, RoomLabel, FloorTile, FLOOR_COLORS } from "./types";

/**
 * Generate outer walls + inner walls from building config and room definitions.
 */
export function generateWalls(building: BuildingConfig, rooms: RoomConfig[]): WallSegment[] {
  const W = building.wallThickness;
  const H = building.wallHeight;
  const hw = building.width / 2;
  const hd = building.depth / 2;

  // Outer walls (centered at origin)
  const outerWalls: WallSegment[] = [
    // Nord (top, -Z)
    { start: [-hw, -hd], end: [hw, -hd], height: H, thickness: W },
    // Ost (right, +X)
    { start: [hw, -hd], end: [hw, hd], height: H, thickness: W },
    // Süd (bottom, +Z)
    { start: [hw, hd], end: [-hw, hd], height: H, thickness: W },
    // West (left, -X)
    { start: [-hw, hd], end: [-hw, -hd], height: H, thickness: W },
  ];

  // Check which outer walls have windows/doors from rooms
  for (const room of rooms) {
    const roomLeft = -hw + room.x;
    const roomRight = roomLeft + room.width;
    const roomTop = -hd + room.z;
    const roomBottom = roomTop + room.depth;

    // If room touches outer wall and has window/door
    if (room.hasWindow) {
      for (const wall of outerWalls) {
        const isNorth = wall.start[1] === -hd && wall.end[1] === -hd;
        const isSouth = wall.start[1] === hd && wall.end[1] === hd;
        const isWest = wall.start[0] === -hw && wall.end[0] === -hw;
        const isEast = wall.start[0] === hw && wall.end[0] === hw;

        if ((isNorth && Math.abs(roomTop - (-hd)) < 0.01) ||
            (isSouth && Math.abs(roomBottom - hd) < 0.01) ||
            (isWest && Math.abs(roomLeft - (-hw)) < 0.01) ||
            (isEast && Math.abs(roomRight - hw) < 0.01)) {
          wall.hasWindow = true;
        }
      }
    }
    if (room.hasDoor) {
      for (const wall of outerWalls) {
        const isSouth = wall.start[1] === hd && wall.end[1] === hd;
        if (isSouth && Math.abs(roomBottom - hd) < 0.01) {
          wall.hasDoor = true;
        }
      }
    }
  }

  // Inner walls: collect unique edges between adjacent rooms
  const innerWalls: WallSegment[] = [];
  const edgeSet = new Set<string>();

  for (const room of rooms) {
    const rL = -hw + room.x;
    const rR = rL + room.width;
    const rT = -hd + room.z;
    const rB = rT + room.depth;

    // Check each edge - if it's not on the outer boundary, it's an inner wall
    const edges: { start: [number, number]; end: [number, number] }[] = [
      { start: [rL, rT], end: [rR, rT] }, // top
      { start: [rR, rT], end: [rR, rB] }, // right
      { start: [rR, rB], end: [rL, rB] }, // bottom
      { start: [rL, rB], end: [rL, rT] }, // left
    ];

    for (const edge of edges) {
      const [s, e] = [edge.start, edge.end];
      // Skip outer walls
      const isOuter =
        (Math.abs(s[1] - (-hd)) < 0.01 && Math.abs(e[1] - (-hd)) < 0.01) ||
        (Math.abs(s[1] - hd) < 0.01 && Math.abs(e[1] - hd) < 0.01) ||
        (Math.abs(s[0] - (-hw)) < 0.01 && Math.abs(e[0] - (-hw)) < 0.01) ||
        (Math.abs(s[0] - hw) < 0.01 && Math.abs(e[0] - hw) < 0.01);

      if (isOuter) continue;

      // Normalize edge key
      const key = [
        Math.min(s[0], e[0]).toFixed(2),
        Math.min(s[1], e[1]).toFixed(2),
        Math.max(s[0], e[0]).toFixed(2),
        Math.max(s[1], e[1]).toFixed(2),
      ].join(",");

      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        innerWalls.push({
          start: [s[0], s[1]],
          end: [e[0], e[1]],
          height: H,
          thickness: W,
        });
      }
    }
  }

  return [...outerWalls, ...innerWalls];
}

export function generateFloorTiles(building: BuildingConfig, rooms: RoomConfig[]): FloorTile[] {
  const hw = building.width / 2;
  const hd = building.depth / 2;

  return rooms.map((room) => {
    const cx = -hw + room.x + room.width / 2;
    const cz = -hd + room.z + room.depth / 2;
    return {
      position: [cx, cz] as [number, number],
      size: [room.width, room.depth] as [number, number],
      color: FLOOR_COLORS[room.floorType] || FLOOR_COLORS.parkett,
    };
  });
}

export function generateRoomLabels(building: BuildingConfig, rooms: RoomConfig[]): RoomLabel[] {
  const hw = building.width / 2;
  const hd = building.depth / 2;

  return rooms.map((room) => {
    const cx = -hw + room.x + room.width / 2;
    const cz = -hd + room.z + room.depth / 2;
    return {
      text: room.name,
      area: `${room.width.toFixed(1)}×${room.depth.toFixed(1)}m`,
      position: [cx, cz] as [number, number],
    };
  });
}

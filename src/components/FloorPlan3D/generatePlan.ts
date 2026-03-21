import { BuildingConfig, RoomConfig, WallSegment, RoomLabel, FloorTile, FLOOR_COLORS } from "./types";

function centroid(points: [number, number][]): [number, number] {
  const n = points.length;
  if (n === 0) return [0, 0];
  const cx = points.reduce((s, p) => s + p[0], 0) / n;
  const cz = points.reduce((s, p) => s + p[1], 0) / n;
  return [cx, cz];
}

function polygonArea(points: [number, number][]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return Math.abs(area) / 2;
}

function boundingBox(points: [number, number][]): { minX: number; minZ: number; maxX: number; maxZ: number } {
  const xs = points.map((p) => p[0]);
  const zs = points.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    minZ: Math.min(...zs),
    maxX: Math.max(...xs),
    maxZ: Math.max(...zs),
  };
}

// Convert building-local coords to world coords (centered at origin)
function toWorld(p: [number, number], hw: number, hd: number): [number, number] {
  return [p[0] - hw, p[1] - hd];
}

export function generateWalls(building: BuildingConfig, rooms: RoomConfig[]): WallSegment[] {
  const W = building.wallThickness;
  const H = building.wallHeight;
  const hw = building.width / 2;
  const hd = building.depth / 2;

  // Outer walls
  const outerWalls: WallSegment[] = [
    { start: [-hw, -hd], end: [hw, -hd], height: H, thickness: W },
    { start: [hw, -hd], end: [hw, hd], height: H, thickness: W },
    { start: [hw, hd], end: [-hw, hd], height: H, thickness: W },
    { start: [-hw, hd], end: [-hw, -hd], height: H, thickness: W },
  ];

  // Apply window/door flags from rooms that touch outer edges
  for (const room of rooms) {
    if (room.points.length < 3) continue;
    const bb = boundingBox(room.points);

    if (room.hasWindow) {
      if (Math.abs(bb.minZ) < 0.05) outerWalls[0].hasWindow = true;
      if (Math.abs(bb.maxX - building.width) < 0.05) outerWalls[1].hasWindow = true;
      if (Math.abs(bb.maxZ - building.depth) < 0.05) outerWalls[2].hasWindow = true;
      if (Math.abs(bb.minX) < 0.05) outerWalls[3].hasWindow = true;
    }
    if (room.hasDoor) {
      if (Math.abs(bb.maxZ - building.depth) < 0.05) outerWalls[2].hasDoor = true;
    }
  }

  // Inner walls from polygon edges
  const innerWalls: WallSegment[] = [];
  const edgeSet = new Set<string>();

  for (const room of rooms) {
    const pts = room.points;
    if (pts.length < 3) continue;

    for (let i = 0; i < pts.length; i++) {
      const a = toWorld(pts[i], hw, hd);
      const b = toWorld(pts[(i + 1) % pts.length], hw, hd);

      // Skip edges on outer boundary
      const isOuter =
        (Math.abs(a[1] - (-hd)) < 0.05 && Math.abs(b[1] - (-hd)) < 0.05) ||
        (Math.abs(a[1] - hd) < 0.05 && Math.abs(b[1] - hd) < 0.05) ||
        (Math.abs(a[0] - (-hw)) < 0.05 && Math.abs(b[0] - (-hw)) < 0.05) ||
        (Math.abs(a[0] - hw) < 0.05 && Math.abs(b[0] - hw) < 0.05);

      if (isOuter) continue;

      const key = [
        Math.min(a[0], b[0]).toFixed(2),
        Math.min(a[1], b[1]).toFixed(2),
        Math.max(a[0], b[0]).toFixed(2),
        Math.max(a[1], b[1]).toFixed(2),
      ].join(",");

      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        innerWalls.push({ start: [a[0], a[1]], end: [b[0], b[1]], height: H, thickness: W });
      }
    }
  }

  return [...outerWalls, ...innerWalls];
}

export function generateFloorTiles(building: BuildingConfig, rooms: RoomConfig[]): FloorTile[] {
  const hw = building.width / 2;
  const hd = building.depth / 2;

  return rooms.map((room) => {
    if (room.points.length < 3) {
      return { position: [0, 0] as [number, number], size: [0, 0] as [number, number], color: FLOOR_COLORS.parkett };
    }

    const worldPts = room.points.map((p) => toWorld(p, hw, hd)) as [number, number][];
    const c = centroid(worldPts);
    const bb = boundingBox(worldPts);

    return {
      position: c,
      size: [bb.maxX - bb.minX, bb.maxZ - bb.minZ] as [number, number],
      color: FLOOR_COLORS[room.floorType] || FLOOR_COLORS.parkett,
      polygon: worldPts,
    };
  });
}

export function generateRoomLabels(building: BuildingConfig, rooms: RoomConfig[]): RoomLabel[] {
  const hw = building.width / 2;
  const hd = building.depth / 2;

  return rooms.map((room) => {
    if (room.points.length < 3) {
      return { text: room.name, position: [0, 0] as [number, number] };
    }

    const worldPts = room.points.map((p) => toWorld(p, hw, hd)) as [number, number][];
    const c = centroid(worldPts);
    const area = polygonArea(worldPts);

    return {
      text: room.name,
      area: `${area.toFixed(1)} m²`,
      position: c,
    };
  });
}

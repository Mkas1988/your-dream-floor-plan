import { BuildingConfig, RoomConfig, WallSegment, RoomLabel, FloorTile, FLOOR_COLORS } from "./types";

function centroid(points: [number, number][]): [number, number] {
  const n = points.length;
  if (n === 0) return [0, 0];
  return [
    points.reduce((s, p) => s + p[0], 0) / n,
    points.reduce((s, p) => s + p[1], 0) / n,
  ];
}

function polygonArea(points: [number, number][]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i][0] * points[j][1] - points[j][0] * points[i][1];
  }
  return Math.abs(area) / 2;
}

function edgeKey(a: [number, number], b: [number, number]): string {
  const ax = a[0].toFixed(3), az = a[1].toFixed(3);
  const bx = b[0].toFixed(3), bz = b[1].toFixed(3);
  if (ax < bx || (ax === bx && az < bz)) return `${ax},${az}|${bx},${bz}`;
  return `${bx},${bz}|${ax},${az}`;
}

export function generateWalls(building: BuildingConfig, rooms: RoomConfig[]): WallSegment[] {
  const W = building.wallThickness;
  const H = building.wallHeight;

  const edgeCounts = new Map<string, { start: [number, number]; end: [number, number]; count: number; rooms: RoomConfig[]; noWall: boolean; customThickness?: number }>();

  for (const room of rooms) {
    const pts = room.points;
    if (pts.length < 3) continue;
    const noWallSet = new Set(room.noWallEdges || []);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const key = edgeKey(a, b);
      const edgeT = room.edgeThickness?.[i];
      const existing = edgeCounts.get(key);
      if (existing) {
        existing.count++;
        existing.rooms.push(room);
        if (noWallSet.has(i)) existing.noWall = true;
        if (edgeT !== undefined) existing.customThickness = edgeT;
      } else {
        edgeCounts.set(key, { start: [a[0], a[1]], end: [b[0], b[1]], count: 1, rooms: [room], noWall: noWallSet.has(i), customThickness: edgeT });
      }
    }
  }

  const walls: WallSegment[] = [];
  for (const [, edge] of edgeCounts) {
    if (edge.noWall) continue;
    const isOuter = edge.count === 1;
    const room = edge.rooms[0];
    const defaultThickness = isOuter ? W : W * 0.6;

    const wall: WallSegment = {
      start: edge.start,
      end: edge.end,
      height: H,
      thickness: edge.customThickness ?? defaultThickness,
    };

    if (isOuter) {
      if (room.hasWindow) wall.hasWindow = true;
      if (room.hasDoor) wall.hasDoor = true;
    }

    walls.push(wall);
  }

  return walls;
}

export function generateFloorTiles(_building: BuildingConfig, rooms: RoomConfig[]): FloorTile[] {
  return rooms.map((room) => {
    if (room.points.length < 3) {
      return { position: [0, 0] as [number, number], size: [0, 0] as [number, number], color: FLOOR_COLORS.parkett };
    }
    const c = centroid(room.points);
    const xs = room.points.map((p) => p[0]);
    const zs = room.points.map((p) => p[1]);
    return {
      position: c,
      size: [Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)] as [number, number],
      color: FLOOR_COLORS[room.floorType] || FLOOR_COLORS.parkett,
      polygon: room.points,
    };
  });
}

export function generateRoomLabels(_building: BuildingConfig, rooms: RoomConfig[]): RoomLabel[] {
  return rooms.map((room) => {
    if (room.points.length < 3) {
      return { text: room.name, position: [0, 0] as [number, number] };
    }
    const c = centroid(room.points);
    const area = polygonArea(room.points);
    return {
      text: room.name,
      area: `${area.toFixed(1)} m²`,
      position: c,
    };
  });
}

export function computeBuildingBounds(rooms: RoomConfig[]): { minX: number; minZ: number; maxX: number; maxZ: number; width: number; depth: number } {
  if (rooms.length === 0) return { minX: -5, minZ: -4, maxX: 5, maxZ: 4, width: 10, depth: 8 };
  const allPts = rooms.flatMap((r) => r.points);
  const minX = Math.min(...allPts.map((p) => p[0]));
  const maxX = Math.max(...allPts.map((p) => p[0]));
  const minZ = Math.min(...allPts.map((p) => p[1]));
  const maxZ = Math.max(...allPts.map((p) => p[1]));
  return { minX, minZ, maxX, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

export interface WallSegment {
  start: [number, number];
  end: [number, number];
  height: number;
  thickness: number;
  hasWindow?: boolean;
  hasDoor?: boolean;
}

export interface FurnitureItem {
  id: string;
  type: string;
  label: string;
  position: [number, number, number];
  rotation: number;
  size: [number, number, number];
  color: string;
  floor: FloorId;
}

export interface RoomLabel {
  text: string;
  area?: string;
  position: [number, number];
}

export interface FloorTile {
  position: [number, number];
  size: [number, number];
  color: string;
}

export interface FloorData {
  id: FloorId;
  label: string;
  walls: WallSegment[];
  roomLabels: RoomLabel[];
  floorTiles: FloorTile[];
}

export type FloorId = "KG" | "EG" | "OG" | "DG";

export type FurnitureCatalogItem = {
  type: string;
  label: string;
  size: [number, number, number];
  color: string;
  icon: string;
};

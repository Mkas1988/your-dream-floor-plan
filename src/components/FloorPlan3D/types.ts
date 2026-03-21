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
  polygon?: [number, number][]; // world-space polygon vertices for non-rectangular rooms
}

export type FurnitureCatalogItem = {
  type: string;
  label: string;
  size: [number, number, number];
  color: string;
  icon: string;
};

// Wizard types
export interface BuildingConfig {
  width: number;
  depth: number;
  wallThickness: number;
  wallHeight: number;
}

export interface RoomConfig {
  id: string;
  name: string;
  points: [number, number][]; // polygon vertices in building-local coords (meters from top-left corner)
  floorType: "parkett" | "fliesen" | "laminat";
  hasWindow?: boolean;
  hasDoor?: boolean;
}

export const FLOOR_COLORS: Record<string, string> = {
  parkett: "hsl(35, 45%, 72%)",
  fliesen: "hsl(220, 8%, 75%)",
  laminat: "hsl(30, 20%, 66%)",
};

import { FloorData, FurnitureCatalogItem } from "./types";

// Building: Right half of Doppelhaus, 8.00m × 9.50m
// Centered at origin: X from -4 to 4, Z from -4.75 to 4.75
// Party wall (shared) = west (x = -4)
// North = z = -4.75, South = z = 4.75
// Wall thickness: 0.24m, Height: 2.60m

const W = 0.24;
const H = 2.6;

// Key X coordinates:
// Party wall inner: -3.76
// Vertical interior wall center: 0.38
// East wall inner: 3.76

// Key Z zones (EG):
// Wohn-Essraum: -4.51 to ~-0.1
// Flur/corridor: -0.1 to ~2.2
// Küche/Diele: 2.2 to 4.51

// ============================================================
// ERDGESCHOSS (Ground Floor)
// ============================================================
const egWalls = [
  // Outer walls
  { start: [-4, -4.75] as [number, number], end: [4, -4.75] as [number, number], height: H, thickness: W, hasWindow: true },
  { start: [4, -4.75] as [number, number], end: [4, 4.75] as [number, number], height: H, thickness: W },
  { start: [4, 4.75] as [number, number], end: [-4, 4.75] as [number, number], height: H, thickness: W, hasDoor: true },
  { start: [-4, 4.75] as [number, number], end: [-4, -4.75] as [number, number], height: H, thickness: W },

  // Vertical interior wall (x=0.38) - left part (Wohn area)
  { start: [0.38, -4.75] as [number, number], end: [0.38, -0.5] as [number, number], height: H, thickness: W },
  // Vertical interior wall - right part (Küche/Diele) with door gap
  { start: [0.38, 0.4] as [number, number], end: [0.38, 2.2] as [number, number], height: H, thickness: W, hasDoor: true },
  { start: [0.38, 2.2] as [number, number], end: [0.38, 4.75] as [number, number], height: H, thickness: W },

  // Horizontal wall: Wohn-Essraum south wall (z = -0.1) - only right column
  { start: [0.38, -0.1] as [number, number], end: [4, -0.1] as [number, number], height: H, thickness: W, hasDoor: true },

  // Horizontal wall: Küche/Diele north wall (z = 2.2)
  { start: [-4, 2.2] as [number, number], end: [0.38, 2.2] as [number, number], height: H, thickness: W, hasDoor: true },
  { start: [0.38, 2.2] as [number, number], end: [4, 2.2] as [number, number], height: H, thickness: W, hasDoor: true },

  // Small WC/bath walls in right column (x=0.38 to x=4, z=-0.1 to z=2.2)
  // Bath horizontal wall
  { start: [0.38, 1.0] as [number, number], end: [2.5, 1.0] as [number, number], height: H, thickness: W },
  // Bath vertical wall
  { start: [2.5, -0.1] as [number, number], end: [2.5, 1.0] as [number, number], height: H, thickness: W, hasDoor: true },
];

const egLabels = [
  { text: "Wohn-Essraum", area: "~28 m²", position: [-1.7, -2.4] as [number, number] },
  { text: "Küche", area: "~8 m²", position: [-1.7, 3.5] as [number, number] },
  { text: "Diele", area: "~7 m²", position: [2.2, 3.5] as [number, number] },
  { text: "Flur", position: [2.2, -2.0] as [number, number] },
  { text: "WC", position: [1.4, 0.5] as [number, number] },
  { text: "Treppe", position: [3.2, 0.5] as [number, number] },
];

const egFloorTiles = [
  // Wohn-Essraum - wood
  { position: [-1.7, -2.4] as [number, number], size: [4.0, 4.3] as [number, number], color: "hsl(35, 45%, 72%)" },
  // Flur right column upper - tile
  { position: [2.2, -2.0] as [number, number], size: [3.2, 4.3] as [number, number], color: "hsl(30, 20%, 68%)" },
  // Küche - tile
  { position: [-1.7, 3.5] as [number, number], size: [4.0, 2.3] as [number, number], color: "hsl(220, 8%, 72%)" },
  // Diele - tile
  { position: [2.2, 3.5] as [number, number], size: [3.2, 2.3] as [number, number], color: "hsl(30, 15%, 65%)" },
  // Corridor/WC area
  { position: [1.4, 0.5] as [number, number], size: [2.0, 1.0] as [number, number], color: "hsl(200, 10%, 78%)" },
];

// ============================================================
// KELLERGESCHOSS (Basement)
// ============================================================
const kgWalls = [
  // Outer walls (same footprint)
  { start: [-4, -4.75] as [number, number], end: [4, -4.75] as [number, number], height: H, thickness: W },
  { start: [4, -4.75] as [number, number], end: [4, 4.75] as [number, number], height: H, thickness: W },
  { start: [4, 4.75] as [number, number], end: [-4, 4.75] as [number, number], height: H, thickness: W },
  { start: [-4, 4.75] as [number, number], end: [-4, -4.75] as [number, number], height: H, thickness: W },

  // Vertical wall dividing left/right
  { start: [0.38, -4.75] as [number, number], end: [0.38, 4.75] as [number, number], height: H, thickness: W, hasDoor: true },

  // Horizontal wall upper area (Waschküche / Trockenkeller divider)
  { start: [-4, -1.5] as [number, number], end: [0.38, -1.5] as [number, number], height: H, thickness: W, hasDoor: true },

  // Horizontal wall: Vorrat area
  { start: [-4, 0.5] as [number, number], end: [0.38, 0.5] as [number, number], height: H, thickness: W, hasDoor: true },

  // Horizontal wall: Heizung / Diele
  { start: [-4, 2.2] as [number, number], end: [4, 2.2] as [number, number], height: H, thickness: W, hasDoor: true },

  // Vertical wall: Heizung / Öl+Koks
  { start: [-1.5, 2.2] as [number, number], end: [-1.5, 4.75] as [number, number], height: H, thickness: W },

  // Right column: Flur / Vorrat dividers
  { start: [0.38, -1.5] as [number, number], end: [4, -1.5] as [number, number], height: H, thickness: W, hasDoor: true },
  { start: [2.5, -4.75] as [number, number], end: [2.5, -1.5] as [number, number], height: H, thickness: W, hasDoor: true },
];

const kgLabels = [
  { text: "Trockenkeller", area: "Mehrzweckr.", position: [-1.7, -3.1] as [number, number] },
  { text: "Waschküche", position: [-1.7, -0.5] as [number, number] },
  { text: "Vorrat", position: [-1.7, 1.3] as [number, number] },
  { text: "Heizung", position: [-2.8, 3.5] as [number, number] },
  { text: "Öl & Koks", position: [-0.5, 3.5] as [number, number] },
  { text: "Diele", position: [2.2, 3.5] as [number, number] },
  { text: "Vorrat", position: [1.3, -3.1] as [number, number] },
  { text: "Flur", position: [3.2, -3.1] as [number, number] },
];

const kgFloorTiles = [
  { position: [0, 0] as [number, number], size: [7.5, 9.0] as [number, number], color: "hsl(0, 0%, 62%)" },
];

// ============================================================
// OBERGESCHOSS (Upper Floor)
// ============================================================
const ogWalls = [
  // Outer walls
  { start: [-4, -4.75] as [number, number], end: [4, -4.75] as [number, number], height: H, thickness: W, hasWindow: true },
  { start: [4, -4.75] as [number, number], end: [4, 4.75] as [number, number], height: H, thickness: W, hasWindow: true },
  { start: [4, 4.75] as [number, number], end: [-4, 4.75] as [number, number], height: H, thickness: W },
  { start: [-4, 4.75] as [number, number], end: [-4, -4.75] as [number, number], height: H, thickness: W },

  // Vertical interior wall (x=0.38)
  { start: [0.38, -4.75] as [number, number], end: [0.38, -0.5] as [number, number], height: H, thickness: W },
  { start: [0.38, 0.4] as [number, number], end: [0.38, 4.75] as [number, number], height: H, thickness: W },

  // Horizontal wall: Schlafzimmer/Kinderzimmer south (z = -0.1)
  { start: [0.38, -0.1] as [number, number], end: [4, -0.1] as [number, number], height: H, thickness: W, hasDoor: true },

  // Horizontal wall: separating upper rooms from lower (z = 2.2)
  { start: [-4, 2.2] as [number, number], end: [4, 2.2] as [number, number], height: H, thickness: W, hasDoor: true },

  // Bad walls in right column
  { start: [0.38, 1.0] as [number, number], end: [2.5, 1.0] as [number, number], height: H, thickness: W },
  { start: [2.5, -0.1] as [number, number], end: [2.5, 1.0] as [number, number], height: H, thickness: W, hasDoor: true },

  // Ankleide wall (left column, small room)
  { start: [-4, -0.1] as [number, number], end: [-1.5, -0.1] as [number, number], height: H, thickness: W },
  { start: [-1.5, -0.1] as [number, number], end: [-1.5, 2.2] as [number, number], height: H, thickness: W, hasDoor: true },
];

const ogLabels = [
  { text: "Schlafzimmer", area: "~17 m²", position: [-1.7, -2.4] as [number, number] },
  { text: "Kinderzimmer", area: "~14 m²", position: [2.2, -2.4] as [number, number] },
  { text: "Bad", area: "~5 m²", position: [1.4, 0.5] as [number, number] },
  { text: "Ankleide", position: [-2.8, 1.0] as [number, number] },
  { text: "Kinderzimmer 2", area: "~8 m²", position: [-1.7, 3.5] as [number, number] },
  { text: "Diele", position: [2.2, 3.5] as [number, number] },
  { text: "Balkon", position: [0, -5.3] as [number, number] },
];

const ogFloorTiles = [
  // Schlafzimmer - wood
  { position: [-1.7, -2.4] as [number, number], size: [4.0, 4.3] as [number, number], color: "hsl(35, 45%, 72%)" },
  // Kinderzimmer top - wood
  { position: [2.2, -2.4] as [number, number], size: [3.2, 4.3] as [number, number], color: "hsl(32, 40%, 70%)" },
  // Bad - tile
  { position: [1.4, 0.5] as [number, number], size: [2.0, 1.0] as [number, number], color: "hsl(200, 10%, 78%)" },
  // Ankleide - wood
  { position: [-2.8, 1.0] as [number, number], size: [2.3, 2.1] as [number, number], color: "hsl(35, 40%, 68%)" },
  // Kinderzimmer 2 - wood
  { position: [-1.7, 3.5] as [number, number], size: [4.0, 2.3] as [number, number], color: "hsl(32, 40%, 70%)" },
  // Diele - tile
  { position: [2.2, 3.5] as [number, number], size: [3.2, 2.3] as [number, number], color: "hsl(30, 15%, 65%)" },
];

// ============================================================
// DACHGESCHOSS (Attic)
// ============================================================
const dgWalls = [
  // Outer walls (same footprint but shorter)
  { start: [-4, -4.75] as [number, number], end: [4, -4.75] as [number, number], height: 1.8, thickness: W, hasWindow: true },
  { start: [4, -4.75] as [number, number], end: [4, 4.75] as [number, number], height: 1.8, thickness: W },
  { start: [4, 4.75] as [number, number], end: [-4, 4.75] as [number, number], height: 1.8, thickness: W },
  { start: [-4, 4.75] as [number, number], end: [-4, -4.75] as [number, number], height: 1.8, thickness: W },
];

const dgLabels = [
  { text: "Dachgeschoss", area: "Ausbaureserve", position: [0, 0] as [number, number] },
];

const dgFloorTiles = [
  { position: [0, 0] as [number, number], size: [7.5, 9.0] as [number, number], color: "hsl(35, 30%, 65%)" },
];

// ============================================================
// FLOOR DATA
// ============================================================
export const floors: FloorData[] = [
  { id: "KG", label: "Keller", walls: kgWalls, roomLabels: kgLabels, floorTiles: kgFloorTiles },
  { id: "EG", label: "Erdgeschoss", walls: egWalls, roomLabels: egLabels, floorTiles: egFloorTiles },
  { id: "OG", label: "Obergeschoss", walls: ogWalls, roomLabels: ogLabels, floorTiles: ogFloorTiles },
  { id: "DG", label: "Dachgeschoss", walls: dgWalls, roomLabels: dgLabels, floorTiles: dgFloorTiles },
];

export const furnitureCatalog: FurnitureCatalogItem[] = [
  { type: "sofa", label: "Sofa", size: [2.2, 0.5, 0.9], color: "hsl(0, 0%, 30%)", icon: "🛋️" },
  { type: "armchair", label: "Sessel", size: [0.8, 0.5, 0.8], color: "hsl(0, 0%, 35%)", icon: "💺" },
  { type: "coffee-table", label: "Couchtisch", size: [1.2, 0.35, 0.6], color: "hsl(35, 30%, 65%)", icon: "☕" },
  { type: "dining-table", label: "Esstisch", size: [1.6, 0.75, 0.9], color: "hsl(30, 40%, 55%)", icon: "🍽️" },
  { type: "dining-chair", label: "Stuhl", size: [0.45, 0.45, 0.45], color: "hsl(30, 25%, 50%)", icon: "🪑" },
  { type: "bed", label: "Bett", size: [2.0, 0.4, 1.6], color: "hsl(0, 0%, 90%)", icon: "🛏️" },
  { type: "wardrobe", label: "Schrank", size: [1.8, 2.0, 0.6], color: "hsl(30, 15%, 45%)", icon: "🚪" },
  { type: "bookshelf", label: "Regal", size: [1.2, 1.8, 0.35], color: "hsl(30, 20%, 50%)", icon: "📚" },
  { type: "tv-unit", label: "TV-Möbel", size: [1.6, 0.5, 0.4], color: "hsl(0, 0%, 25%)", icon: "📺" },
  { type: "desk", label: "Schreibtisch", size: [1.4, 0.75, 0.7], color: "hsl(30, 30%, 60%)", icon: "🖥️" },
  { type: "plant", label: "Pflanze", size: [0.4, 0.8, 0.4], color: "hsl(140, 50%, 35%)", icon: "🌿" },
  { type: "rug", label: "Teppich", size: [2.5, 0.02, 1.8], color: "hsl(35, 30%, 70%)", icon: "🟫" },
  { type: "nightstand", label: "Nachttisch", size: [0.5, 0.45, 0.4], color: "hsl(30, 20%, 50%)", icon: "🛏️" },
  { type: "washer", label: "Waschmaschine", size: [0.6, 0.85, 0.6], color: "hsl(0, 0%, 92%)", icon: "🫧" },
  { type: "sink", label: "Waschbecken", size: [0.6, 0.8, 0.45], color: "hsl(0, 0%, 95%)", icon: "🚿" },
  { type: "toilet", label: "WC", size: [0.4, 0.4, 0.65], color: "hsl(0, 0%, 95%)", icon: "🚽" },
  { type: "bathtub", label: "Badewanne", size: [1.7, 0.5, 0.75], color: "hsl(0, 0%, 95%)", icon: "🛁" },
  { type: "kitchen-counter", label: "Küchenzeile", size: [2.4, 0.9, 0.6], color: "hsl(0, 0%, 88%)", icon: "🍳" },
];

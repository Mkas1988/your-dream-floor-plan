import { WallSegment, RoomLabel, FloorTile, FurnitureCatalogItem } from "./types";

// ============================================================
// ERDGESCHOSS (Ground Floor) — Rechte Doppelhaushälfte
// Building: 9.50m (width) × 8.00m (depth)
// Centered at origin: X: -4.75 to 4.75, Z: -4.0 to 4.0
//
// ORIENTATION (matching floor plan image):
// Nord (top) = -Z = Trennwand (party wall, NO windows)
// Süd (bottom) = +Z = Eingang (entry door)
// West (left) = -X = Küche/Diele side
// Ost (right) = +X = Treppe / Wohn-Essraum side
// ============================================================

const W = 0.24;
const H = 2.6;

// Layout guides derived from the user's sketch:
// Main split (left block / middle-right block): x = -2.05
// Flur/WC right wall: x = -1.10
// Kitchen / Diele divider: z = 0.10
// Stair / Living divider: z = -0.60
// Flur / WC divider: z = 1.10

export const walls: WallSegment[] = [
  // === OUTER WALLS ===
  { start: [-4.75, -4.0], end: [4.75, -4.0], height: H, thickness: W },
  { start: [4.75, -4.0], end: [4.75, 4.0], height: H, thickness: W, hasWindow: true },
  { start: [4.75, 4.0], end: [-4.75, 4.0], height: H, thickness: W, hasDoor: true },
  { start: [-4.75, 4.0], end: [-4.75, -4.0], height: H, thickness: W, hasWindow: true },

  // === LEFT BLOCK: KÜCHE / DIELE ===
  { start: [-2.05, -4.0], end: [-2.05, 4.0], height: H, thickness: W },
  { start: [-4.75, 0.10], end: [-2.05, 0.10], height: H, thickness: W },

  // === CENTER BLOCK: FLUR / WC ===
  { start: [-1.10, -0.60], end: [-1.10, 4.0], height: H, thickness: W },
  { start: [-2.05, 1.10], end: [-1.10, 1.10], height: H, thickness: W },

  // === RIGHT BLOCK: TREPPE ABOVE / WOHN-ESSRAUM BELOW ===
  { start: [-2.05, -0.60], end: [4.75, -0.60], height: H, thickness: W },
];

export const roomLabels: RoomLabel[] = [
  { text: "Küche", area: "2,34 × 4,02", position: [-3.4, -1.9] },
  { text: "Diele", area: "2,76 × 3,25", position: [-3.4, 2.15] },
  { text: "Flur", area: "1,38", position: [-1.58, 0.25] },
  { text: "WC", position: [-1.58, 2.35] },
  { text: "Treppe", area: "oben rechts", position: [1.6, -2.2] },
  { text: "Wohn-Essraum", area: "hinter Küche", position: [1.85, 1.7] },
];

export const floorTiles: FloorTile[] = [
  { position: [-3.4, -1.95], size: [2.7, 4.1], color: "hsl(220, 8%, 75%)" },
  { position: [-3.4, 2.05], size: [2.7, 3.9], color: "hsl(30, 20%, 66%)" },
  { position: [-1.58, 0.25], size: [0.95, 1.7], color: "hsl(30, 12%, 70%)" },
  { position: [-1.58, 2.35], size: [0.95, 2.9], color: "hsl(200, 10%, 80%)" },
  { position: [1.35, -2.25], size: [6.8, 3.4], color: "hsl(30, 12%, 68%)" },
  { position: [1.85, 1.7], size: [5.8, 4.6], color: "hsl(35, 45%, 72%)" },
];

export const furnitureCatalog: FurnitureCatalogItem[] = [
  { type: "sofa", label: "Sofa", size: [2.2, 0.5, 0.9], color: "hsl(0, 0%, 30%)", icon: "🛋️" },
  { type: "armchair", label: "Sessel", size: [0.8, 0.5, 0.8], color: "hsl(0, 0%, 35%)", icon: "💺" },
  { type: "coffee-table", label: "Couchtisch", size: [1.2, 0.35, 0.6], color: "hsl(35, 30%, 65%)", icon: "☕" },
  { type: "dining-table", label: "Esstisch", size: [1.6, 0.75, 0.9], color: "hsl(30, 40%, 55%)", icon: "🍽️" },
  { type: "dining-chair", label: "Stuhl", size: [0.45, 0.45, 0.45], color: "hsl(30, 25%, 50%)", icon: "🪑" },
  { type: "tv-unit", label: "TV-Möbel", size: [1.6, 0.5, 0.4], color: "hsl(0, 0%, 25%)", icon: "📺" },
  { type: "bookshelf", label: "Regal", size: [1.2, 1.8, 0.35], color: "hsl(30, 20%, 50%)", icon: "📚" },
  { type: "desk", label: "Schreibtisch", size: [1.4, 0.75, 0.7], color: "hsl(30, 30%, 60%)", icon: "🖥️" },
  { type: "plant", label: "Pflanze", size: [0.4, 0.8, 0.4], color: "hsl(140, 50%, 35%)", icon: "🌿" },
  { type: "rug", label: "Teppich", size: [2.5, 0.02, 1.8], color: "hsl(35, 30%, 70%)", icon: "🟫" },
  { type: "kitchen-counter", label: "Küchenzeile", size: [2.4, 0.9, 0.6], color: "hsl(0, 0%, 88%)", icon: "🍳" },
  { type: "toilet", label: "WC", size: [0.4, 0.4, 0.65], color: "hsl(0, 0%, 95%)", icon: "🚽" },
  { type: "sink", label: "Waschbecken", size: [0.6, 0.8, 0.45], color: "hsl(0, 0%, 95%)", icon: "🚿" },
  { type: "wardrobe", label: "Schrank", size: [1.8, 2.0, 0.6], color: "hsl(30, 15%, 45%)", icon: "🚪" },
];

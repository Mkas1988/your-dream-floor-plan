import { WallSegment, RoomLabel, FloorTile, FurnitureCatalogItem } from "./types";

// ============================================================
// ERDGESCHOSS (Ground Floor) — Rechte Doppelhaushälfte
// Building: 9.50m (width) × 8.00m (depth)
// Centered at origin: X: -4.75 to 4.75, Z: -4.0 to 4.0
//
// ORIENTATION (matching floor plan image):
// Nord (top) = -Z = Trennwand (party wall, NO windows)
// Süd (bottom) = +Z = Eingang (entry door)
// West (left) = -X = Küche/Diele side (windows)
// Ost (right) = +X = Wohn-Essraum side (windows)
//
// Wall thickness: 0.24m, Height: 2.6m
// ============================================================

const W = 0.24;
const H = 2.6;

// X coords: West outer -4.75, inner -4.51
//   Küche east wall center: -2.05 (clear 2.34m)
//   Flur/WC east wall center: -0.43 (Flur clear 1.38m)
//   East inner 4.51, outer 4.75
// Z coords: North outer -4.0, inner -3.76
//   Küche/Treppe south wall center: 0.38 (Küche depth 4.02m)
//   Flur/WC divider center: 1.7
//   South inner 3.76, outer 4.0

export const walls: WallSegment[] = [
  // === OUTER WALLS ===
  // Nord — Trennwand (party wall, NO windows)
  { start: [-4.75, -4.0], end: [4.75, -4.0], height: H, thickness: W },
  // Ost — Wohn-Essraum windows
  { start: [4.75, -4.0], end: [4.75, 4.0], height: H, thickness: W, hasWindow: true },
  // Süd — Eingang with door
  { start: [4.75, 4.0], end: [-4.75, 4.0], height: H, thickness: W, hasDoor: true },
  // West — Küche/Diele windows
  { start: [-4.75, 4.0], end: [-4.75, -4.0], height: H, thickness: W, hasWindow: true },

  // === MAIN VERTICAL WALL X = -2.05 ===
  // Top section: Küche east / Treppe west (north to horizontal wall)
  { start: [-2.05, -4.0], end: [-2.05, 0.38], height: H, thickness: W },
  // Bottom section: Diele east / Flur-WC west (horizontal wall to south) — with door
  { start: [-2.05, 0.38], end: [-2.05, 4.0], height: H, thickness: W, hasDoor: true },

  // === HORIZONTAL WALL Z = 0.38 ===
  // Left: separates Küche (north) from Diele (south) — with door
  { start: [-4.75, 0.38], end: [-2.05, 0.38], height: H, thickness: W, hasDoor: true },
  // Right: separates Treppe from Flur/WC/Wohn-Essraum corridor
  { start: [-2.05, 0.38], end: [-0.43, 0.38], height: H, thickness: W },

  // === SECONDARY VERTICAL WALL X = -0.43 ===
  // Flur/WC east wall, separates from Wohn-Essraum — with door
  { start: [-0.43, 0.38], end: [-0.43, 3.2], height: H, thickness: W, hasDoor: true },

  // === FLUR / WC HORIZONTAL DIVIDER Z = 1.7 ===
  { start: [-2.05, 1.7], end: [-0.43, 1.7], height: H, thickness: W, hasDoor: true },
];

export const roomLabels: RoomLabel[] = [
  { text: "Küche", area: "2,34 × 4,02 m", position: [-3.3, -1.7] },
  { text: "Treppe", position: [1.2, -1.7] },
  { text: "Diele", area: "~3,25 m²", position: [-3.3, 2.1] },
  { text: "Flur", position: [-1.24, 1.0] },
  { text: "WC", position: [-1.24, 2.5] },
  { text: "Wohn-Essraum", area: "~28 m²", position: [2.1, 2.0] },
];

export const floorTiles: FloorTile[] = [
  // Küche — tiles (light gray)
  { position: [-3.3, -1.7], size: [2.3, 4.0], color: "hsl(220, 8%, 75%)" },
  // Treppe area — neutral
  { position: [1.2, -1.7], size: [5.4, 4.0], color: "hsl(30, 12%, 68%)" },
  // Diele — warm wood
  { position: [-3.3, 2.1], size: [2.3, 3.2], color: "hsl(30, 20%, 65%)" },
  // Flur — tiles
  { position: [-1.24, 1.0], size: [1.4, 1.1], color: "hsl(30, 12%, 70%)" },
  // WC — light blue tiles
  { position: [-1.24, 2.5], size: [1.4, 1.3], color: "hsl(200, 10%, 80%)" },
  // Wohn-Essraum — wood parquet (large room right side)
  { position: [2.1, 0.0], size: [4.8, 7.5], color: "hsl(35, 45%, 72%)" },
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

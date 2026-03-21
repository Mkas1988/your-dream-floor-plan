import { WallSegment, RoomLabel, FloorTile, FurnitureCatalogItem } from "./types";

// ============================================================
// ERDGESCHOSS (Ground Floor) — Rechte Doppelhaushälfte
// Building: 9.50m (width) × 8.00m (depth)
// Centered at origin: X: -4.75 to 4.75, Z: -4.0 to 4.0
// North (top of plan) = -Z, South (party wall) = +Z
// West (left/entry) = -X, East (right/Wohn-Essraum) = +X
// Wall thickness: 0.24m
// ============================================================

const W = 0.24;
const H = 2.6;

// Key X coordinates:
// West outer: -4.75, inner: -4.51
// Main vertical wall center: -0.37  (left column = 4.02m clear)
// WC/bath east wall: 1.2
// East inner: 4.51, outer: 4.75

// Key Z coordinates:
// North outer: -4.0, inner: -3.76
// Küche south wall center: -1.30  (Küche depth = 2.34m clear)
// Small rooms south: 0.9
// South inner: 3.76, outer: 4.0

export const walls: WallSegment[] = [
  // === OUTER WALLS ===
  { start: [-4.75, -4.0], end: [4.75, -4.0], height: H, thickness: W, hasWindow: true },   // North - windows
  { start: [4.75, -4.0], end: [4.75, 4.0], height: H, thickness: W, hasWindow: true },     // East - Wohn-Essraum windows
  { start: [4.75, 4.0], end: [-4.75, 4.0], height: H, thickness: W },                       // South - party wall
  { start: [-4.75, 4.0], end: [-4.75, -4.0], height: H, thickness: W, hasDoor: true },      // West - entry door

  // === MAIN VERTICAL WALL x = -0.37 ===
  // Upper: between Küche and staircase area
  { start: [-0.37, -4.0], end: [-0.37, -1.42], height: H, thickness: W },
  // Middle: between Diele and Flur/WC — with door opening
  { start: [-0.37, -1.42], end: [-0.37, -0.6], height: H, thickness: W },
  { start: [-0.37, 0.3], end: [-0.37, 4.0], height: H, thickness: W },

  // === HORIZONTAL WALL z = -1.30 (Küche south / staircase south) ===
  // Küche south wall with door
  { start: [-4.75, -1.30], end: [-0.37, -1.30], height: H, thickness: W, hasDoor: true },
  // Right side: staircase south wall — gap for stair access
  { start: [-0.37, -1.30], end: [1.2, -1.30], height: H, thickness: W },
  { start: [2.8, -1.30], end: [4.75, -1.30], height: H, thickness: W },

  // === SMALL ROOMS: FLUR / WC / BAD ===
  // Vertical wall at x = 1.2 (WC/Bath east wall, separating from Wohn-Essraum)
  { start: [1.2, -1.30], end: [1.2, 0.9], height: H, thickness: W, hasDoor: true },

  // Horizontal divider between Flur and WC at z = -0.2
  { start: [-0.37, -0.2], end: [1.2, -0.2], height: H, thickness: W, hasDoor: true },

  // Horizontal wall: WC/Bath south at z = 0.9
  { start: [-0.37, 0.9], end: [1.2, 0.9], height: H, thickness: W },
];

export const roomLabels: RoomLabel[] = [
  { text: "Küche", area: "4,02 × 2,34", position: [-2.5, -2.5] },
  { text: "Treppe", position: [2.0, -2.8] },
  { text: "Diele", area: "3,25", position: [-2.5, 1.5] },
  { text: "Flur", position: [0.4, -0.8] },
  { text: "WC", position: [0.4, 0.35] },
  { text: "Wohn-Essraum", area: "~4,02 × 4,55", position: [3.0, 1.5] },
];

export const floorTiles: FloorTile[] = [
  // Küche - tiles
  { position: [-2.5, -2.5], size: [4.0, 2.3], color: "hsl(220, 8%, 72%)" },
  // Staircase area
  { position: [2.2, -2.8], size: [4.5, 2.3], color: "hsl(30, 15%, 65%)" },
  // Diele - tiles
  { position: [-2.5, 1.5], size: [4.0, 4.8], color: "hsl(30, 15%, 65%)" },
  // Flur - tiles
  { position: [0.4, -0.8], size: [1.3, 1.0], color: "hsl(30, 12%, 68%)" },
  // WC - tiles
  { position: [0.4, 0.35], size: [1.3, 0.9], color: "hsl(200, 10%, 78%)" },
  // Wohn-Essraum - wood parquet
  { position: [3.0, 1.5], size: [3.3, 5.0], color: "hsl(35, 45%, 72%)" },
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

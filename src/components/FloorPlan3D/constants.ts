import { WallSegment, RoomLabel, FloorTile, FurnitureCatalogItem } from "./types";

// ============================================================
// ERDGESCHOSS (Ground Floor) — Rechte Doppelhaushälfte
// Building: 9.50m (width) × 8.00m (depth)
// Centered at origin: X: -4.75 to 4.75, Z: -4.0 to 4.0
//
// ORIENTATION (matching floor plan image):
// Nord (top/back) = -Z = Trennwand (party wall, NO windows) / Garten
// Süd (bottom/front) = +Z = Eingang (entry door) / Straße
// West (left) = -X
// Ost (right) = +X
//
// LAYOUT:
//   NORD (-Z) Gartenseite
//   ┌──────────────────────────────────────────────┐
//   │           WOHN-ESSRAUM                       │
//   │      (volle Breite, Gartenseite)             │
//   ├──────────┬────┬──────────────────────────────┤ z ≈ 0.0
//   │          │    │         TREPPE                │
//   │  KÜCHE   │ FL ├──────────────────────────────┤ z ≈ 2.0
//   │          ├────┤         DIELE                 │
//   │          │ WC │       (Wendeltreppe)          │
//   └──────────┴────┴──────────────────────────────┘
//   SÜD (+Z) Straßenseite / Eingang
// ============================================================

const W = 0.24;
const H = 2.6;

// Key X coordinates:
// -4.75 = West outer wall
// -2.41 = Inner wall (Küche east edge = -4.75 + 2.34)
// -1.03 = Inner wall (Flur/WC east edge = -2.41 + 1.38)
// +4.75 = East outer wall

// Key Z coordinates:
// -4.0  = North outer wall (Trennwand)
// -0.02 = Horizontal divider (Wohn-Essraum south edge = -4.0 + 3.98)
// +2.0  = Horizontal divider (Flur/WC split & Treppe/Diele split)
// +4.0  = South outer wall (Eingang)

export const walls: WallSegment[] = [
  // === OUTER WALLS ===
  // Nord — Trennwand (NO windows)
  { start: [-4.75, -4.0], end: [4.75, -4.0], height: H, thickness: W },
  // Ost — Fenster
  { start: [4.75, -4.0], end: [4.75, 4.0], height: H, thickness: W, hasWindow: true },
  // Süd — Haustür
  { start: [4.75, 4.0], end: [-4.75, 4.0], height: H, thickness: W, hasDoor: true },
  // West — Fenster (Küche + Wohn-Essraum)
  { start: [-4.75, 4.0], end: [-4.75, -4.0], height: H, thickness: W, hasWindow: true },

  // === INNER WALLS ===
  // Horizontale Trennwand: Wohn-Essraum (Nord) | Küche/Flur/Treppe (Süd)
  { start: [-4.75, -0.02], end: [4.75, -0.02], height: H, thickness: W },

  // Vertikale Wand: Küche | Flur/WC (nur südliche Hälfte)
  { start: [-2.41, -0.02], end: [-2.41, 4.0], height: H, thickness: W },

  // Vertikale Wand: Flur/WC | Treppe/Diele
  { start: [-1.03, -0.02], end: [-1.03, 4.0], height: H, thickness: W },

  // Horizontale Wand: Flur | WC
  { start: [-2.41, 2.0], end: [-1.03, 2.0], height: H, thickness: W },

  // Horizontale Wand: Treppe | Diele
  { start: [-1.03, 2.0], end: [4.75, 2.0], height: H, thickness: W },
];

export const roomLabels: RoomLabel[] = [
  { text: "Wohn-Essraum", area: "9,50 × 3,98", position: [0, -2.0] },
  { text: "Küche", area: "2,34 × 4,02", position: [-3.58, 2.0] },
  { text: "Flur", area: "1,38", position: [-1.72, 1.0] },
  { text: "WC", position: [-1.72, 3.0] },
  { text: "Treppe", position: [1.86, 1.0] },
  { text: "Diele", area: "Wendeltreppe", position: [1.86, 3.0] },
];

export const floorTiles: FloorTile[] = [
  // Wohn-Essraum (Parkett)
  { position: [0, -2.0], size: [9.5, 3.96], color: "hsl(35, 45%, 72%)" },
  // Küche (Fliesen)
  { position: [-3.58, 2.0], size: [2.34, 4.0], color: "hsl(220, 8%, 75%)" },
  // Flur (Fliesen)
  { position: [-1.72, 1.0], size: [1.38, 2.0], color: "hsl(30, 12%, 70%)" },
  // WC (Fliesen)
  { position: [-1.72, 3.0], size: [1.38, 2.0], color: "hsl(200, 10%, 80%)" },
  // Treppe
  { position: [1.86, 1.0], size: [5.78, 2.0], color: "hsl(30, 12%, 68%)" },
  // Diele (Parkett)
  { position: [1.86, 3.0], size: [5.78, 2.0], color: "hsl(30, 20%, 66%)" },
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

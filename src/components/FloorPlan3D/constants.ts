import { WallSegment, RoomLabel, FurnitureCatalogItem } from "./types";

// Scale: 1 unit = 1 meter
// Building: ~10.5m × 7.5m
// Centered at origin
// X: left(-) to right(+), Z: top(-) to bottom(+) in plan view

const W = 0.2; // wall thickness
const H = 2.8; // wall height

// Layout based on the floor plan:
// Living Room (39.8m²): top-left large area, ~8m × 5m
// Kitchen (9.1m²): bottom-left, ~3.5m × 2.6m
// Hallway (7.1m²): right column upper, ~2.5m × 2.85m
// Bathroom (2.7m²): right column lower, ~1.5m × 1.8m
// External staircase: far left outside
// Spiral staircase: bottom-right inside

export const walls: WallSegment[] = [
  // === OUTER WALLS ===
  // Top wall (north) - with windows
  { start: [-5.25, -3.75], end: [5.25, -3.75], height: H, thickness: W, hasWindow: true },
  // Right wall (east)
  { start: [5.25, -3.75], end: [5.25, 3.75], height: H, thickness: W },
  // Bottom wall (south)
  { start: [5.25, 3.75], end: [-5.25, 3.75], height: H, thickness: W },
  // Left wall (west) - with door to external staircase
  { start: [-5.25, 3.75], end: [-5.25, -3.75], height: H, thickness: W, hasDoor: true },

  // === INTERIOR WALLS ===
  // 1. Main vertical divider: living room | hallway/bath (x=2.75)
  //    Goes from top wall down, with door opening
  { start: [2.75, -3.75], end: [2.75, -0.5], height: H, thickness: W },
  { start: [2.75, 0.4], end: [2.75, 3.75], height: H, thickness: W },

  // 2. Kitchen: horizontal wall at z=1.15, from left wall partway across
  { start: [-5.25, 1.15], end: [-2.5, 1.15], height: H, thickness: W, hasDoor: true },

  // 3. Kitchen: right wall going down
  { start: [-1.75, 1.15], end: [-1.75, 3.75], height: H, thickness: W },

  // 4. Hallway / bathroom horizontal divider (z=-0.75)
  { start: [2.75, -0.75], end: [5.25, -0.75], height: H, thickness: W, hasDoor: true },

  // 5. Bathroom left wall (x=3.75), separates bath from spiral staircase area
  { start: [3.75, -0.75], end: [3.75, 1.05], height: H, thickness: W },

  // 6. Bathroom bottom wall
  { start: [2.75, 1.05], end: [3.75, 1.05], height: H, thickness: W },
];

export const roomLabels: RoomLabel[] = [
  { text: "Wohnzimmer", area: "39,8 m²", position: [-1.25, -1.25] },
  { text: "Küche", area: "9,1 m²", position: [-3.5, 2.45] },
  { text: "Flur", area: "7,1 m²", position: [4.0, -2.25] },
  { text: "Bad", area: "2,7 m²", position: [3.25, 0.15] },
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
];

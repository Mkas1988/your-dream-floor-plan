import { WallSegment, RoomLabel, FurnitureCatalogItem } from "./types";

// Scale: 1 unit = 1 meter approximately
// Based on the floor plan: total ~10m x 8m footprint

const W = 0.2; // wall thickness
const H = 2.8; // wall height

// Outer walls (clockwise from top-left)
// The plan is roughly: main area left + rooms right
// Coordinates centered around origin
export const walls: WallSegment[] = [
  // === OUTER WALLS ===
  // Top wall
  { start: [-5, -4], end: [5, -4], height: H, thickness: W },
  // Right wall
  { start: [5, -4], end: [5, 4], height: H, thickness: W },
  // Bottom wall
  { start: [5, 4], end: [-5, 4], height: H, thickness: W },
  // Left wall (with staircase gap)
  { start: [-5, 4], end: [-5, -4], height: H, thickness: W },

  // === INNER WALLS ===
  // Wall separating living room from hallway/bathroom (vertical, right side)
  { start: [2, -4], end: [2, 1], height: H, thickness: W, hasDoor: true },
  // Wall separating hallway from bathroom (horizontal)
  { start: [2, 1], end: [5, 1], height: H, thickness: W, hasDoor: true },
  // Wall between hallway and bathroom (vertical)
  { start: [3.8, 1], end: [3.8, 4], height: H, thickness: W },
  // Kitchen wall (horizontal, bottom area)
  { start: [-5, 1.5], end: [2, 1.5], height: H, thickness: W, hasDoor: true },
];

export const roomLabels: RoomLabel[] = [
  { text: "Wohnzimmer", area: "39,8 m²", position: [-1.5, -1.5] },
  { text: "Küche", area: "9,1 m²", position: [-1.5, 2.8] },
  { text: "Flur", area: "7,1 m²", position: [2.8, -1] },
  { text: "Bad", area: "2,7 m²", position: [4.2, 2.5] },
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

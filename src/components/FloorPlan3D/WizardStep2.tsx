import { useState, useRef, useCallback, useEffect } from "react";
import { BuildingConfig, RoomConfig } from "./types";
import { Trash2, ArrowLeft, Eye, Pencil, MousePointer, X, Settings, Plus, Minus, Home, Save, Loader2, Merge, Magnet } from "lucide-react";
import { ChatPanel } from "./ChatPanel";

interface Props {
  building: BuildingConfig;
  onBuildingChange: (b: BuildingConfig) => void;
  rooms: RoomConfig[];
  onChange: (rooms: RoomConfig[]) => void;
  onBack: () => void;
  onFinish: () => void;
  onSave?: () => void;
  saving?: boolean;
  planName?: string;
  onPlanNameChange?: (name: string) => void;
}

let roomIdCounter = 0;

const FLOOR_TYPES = [
  { value: "parkett", label: "Parkett", color: "hsl(35, 45%, 72%)" },
  { value: "fliesen", label: "Fliesen", color: "hsl(220, 8%, 75%)" },
  { value: "laminat", label: "Laminat", color: "hsl(30, 20%, 66%)" },
] as const;

const SNAP = 0.01;
const CLOSE_DIST = 0.4;
const SNAP_VERTEX_DIST = 0.20; // snap to existing vertices within 20cm

function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP;
}

function polygonArea(pts: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return Math.abs(area) / 2;
}

function centroid(pts: [number, number][]): [number, number] {
  const n = pts.length;
  return [
    pts.reduce((s, p) => s + p[0], 0) / n,
    pts.reduce((s, p) => s + p[1], 0) / n,
  ];
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function pointInPolygon(x: number, y: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

type Phase = "outline" | "rooms";
type Mode = "select" | "draw";
type DragState =
  | null
  | { type: "vertex"; roomId: string; idx: number }
  | { type: "edge"; roomId: string; idx: number; startMouse: [number, number]; origPts: [number, number][] }
  | { type: "room"; roomId: string; startMouse: [number, number]; origPts: [number, number][] }
  | { type: "outline-vertex"; idx: number }
  | { type: "outline-edge"; idx: number; startMouse: [number, number]; origPts: [number, number][] }
  | { type: "pan"; startMouse: [number, number]; startCenter: [number, number] };

export const WizardStep2 = ({ building, onBuildingChange, rooms, onChange, onBack, onFinish, onSave, saving, planName, onPlanNameChange }: Props) => {
  const outline = building.outline || [];
  const [phase, setPhase] = useState<Phase>(outline.length >= 3 ? "rooms" : "outline");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedEdgeIdx, setSelectedEdgeIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [mouseWorld, setMouseWorld] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("Neuer Raum");
  const [newRoomWidth, setNewRoomWidth] = useState("4");
  const [newRoomDepth, setNewRoomDepth] = useState("3");
  const [outlineWidth, setOutlineWidth] = useState("10");
  const [outlineDepth, setOutlineDepth] = useState("8");

  const [viewCenter, setViewCenter] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState(50);
  const [containerSize, setContainerSize] = useState<[number, number]>([800, 600]);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setContainerSize([width, height]);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vbW = containerSize[0] / zoom;
  const vbH = containerSize[1] / zoom;
  const vbX = viewCenter[0] - vbW / 2;
  const vbY = viewCenter[1] - vbH / 2;
  const viewBox = `${vbX} ${vbY} ${vbW} ${vbH}`;

  const screenToWorld = useCallback((e: React.MouseEvent | MouseEvent): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const world = pt.matrixTransform(ctm.inverse());
    return [snap(world.x), snap(world.y)];
  }, []);

  const screenToWorldRaw = useCallback((e: React.MouseEvent | MouseEvent): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const world = pt.matrixTransform(ctm.inverse());
    return [world.x, world.y];
  }, []);

  // Grid
  const gridStep = zoom > 30 ? 1 : zoom > 15 ? 2 : 5;
  const gridStartX = Math.floor(vbX / gridStep) * gridStep;
  const gridStartY = Math.floor(vbY / gridStep) * gridStep;
  const gridLines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
  for (let x = gridStartX; x <= vbX + vbW; x += gridStep) {
    gridLines.push({ x1: x, y1: vbY, x2: x, y2: vbY + vbH, major: x === 0 });
  }
  for (let y = gridStartY; y <= vbY + vbH; y += gridStep) {
    gridLines.push({ x1: vbX, y1: y, x2: vbX + vbW, y2: y, major: y === 0 });
  }

  const px = 1 / zoom;

  const setOutline = (pts: [number, number][]) => {
    onBuildingChange({ ...building, outline: pts });
  };

  // --- Event Handlers ---

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const worldBefore = screenToWorldRaw(e);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => {
      const newZ = Math.max(5, Math.min(200, z * factor));
      const newVbW = containerSize[0] / newZ;
      const newVbH = containerSize[1] / newZ;
      const screenFrac: [number, number] = [
        (worldBefore[0] - viewCenter[0] + vbW / 2) / vbW,
        (worldBefore[1] - viewCenter[1] + vbH / 2) / vbH,
      ];
      const newCx = worldBefore[0] - (screenFrac[0] - 0.5) * newVbW;
      const newCy = worldBefore[1] - (screenFrac[1] - 0.5) * newVbH;
      setViewCenter([newCx, newCy]);
      return newZ;
    });
  }, [screenToWorldRaw, containerSize, viewCenter, vbW, vbH]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      const raw = screenToWorldRaw(e);
      setDrag({ type: "pan", startMouse: raw, startCenter: [...viewCenter] });
      return;
    }
    if (e.button !== 0 || mode !== "select") return;

    const world = screenToWorld(e);

    // --- OUTLINE phase: select/edit outline vertices ---
    if (phase === "outline" && outline.length >= 3) {
      for (let i = 0; i < outline.length; i++) {
        if (Math.hypot(world[0] - outline[i][0], world[1] - outline[i][1]) < 6 * px) {
          e.stopPropagation();
          setDrag({ type: "outline-vertex", idx: i });
          return;
        }
      }
      for (let i = 0; i < outline.length; i++) {
        const j = (i + 1) % outline.length;
        if (distToSegment(world[0], world[1], outline[i][0], outline[i][1], outline[j][0], outline[j][1]) < 4 * px) {
          e.stopPropagation();
          setDrag({ type: "outline-edge", idx: i, startMouse: world, origPts: outline.map((p) => [...p] as [number, number]) });
          return;
        }
      }
      return;
    }

    // --- ROOMS phase ---
    if (phase === "rooms") {
      // Vertex hit (selected room)
      for (const room of rooms) {
        if (room.id !== selectedRoomId) continue;
        for (let i = 0; i < room.points.length; i++) {
          if (Math.hypot(world[0] - room.points[i][0], world[1] - room.points[i][1]) < 6 * px) {
            e.stopPropagation();
            setDrag({ type: "vertex", roomId: room.id, idx: i });
            return;
          }
        }
      }
      // Edge hit (selected room)
      if (selectedRoomId) {
        const room = rooms.find((r) => r.id === selectedRoomId);
        if (room) {
          for (let i = 0; i < room.points.length; i++) {
            const j = (i + 1) % room.points.length;
            if (distToSegment(world[0], world[1], room.points[i][0], room.points[i][1], room.points[j][0], room.points[j][1]) < 4 * px) {
              e.stopPropagation();
              setDrag({ type: "edge", roomId: room.id, idx: i, startMouse: world, origPts: room.points.map((p) => [...p] as [number, number]) });
              return;
            }
          }
        }
      }
      // Room hit
      for (const room of rooms) {
        if (pointInPolygon(world[0], world[1], room.points)) {
          e.stopPropagation();
          setSelectedRoomId(room.id);
          setSelectedEdgeIdx(null);
          setDrag({ type: "room", roomId: room.id, startMouse: world, origPts: room.points.map((p) => [...p] as [number, number]) });
          return;
        }
      }
      setSelectedRoomId(null);
      setSelectedEdgeIdx(null);
    }
  }, [mode, phase, rooms, selectedRoomId, outline, screenToWorld, screenToWorldRaw, viewCenter, px]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const world = screenToWorld(e);
    const raw = screenToWorldRaw(e);
    setMouseWorld(world);

    if (!drag) return;

    if (drag.type === "pan") {
      const dx = raw[0] - drag.startMouse[0];
      const dy = raw[1] - drag.startMouse[1];
      setViewCenter([drag.startCenter[0] - dx, drag.startCenter[1] - dy]);
      return;
    }

    if (drag.type === "outline-vertex") {
      const pts = [...outline] as [number, number][];
      pts[drag.idx] = world;
      setOutline(pts);
      return;
    }

    if (drag.type === "outline-edge") {
      const dx = world[0] - drag.startMouse[0];
      const dy = world[1] - drag.startMouse[1];
      const i = drag.idx;
      const j = (i + 1) % drag.origPts.length;
      const pts = drag.origPts.map((p, k) => {
        if (k === i || k === j) return [snap(p[0] + dx), snap(p[1] + dy)] as [number, number];
        return [...p] as [number, number];
      });
      setOutline(pts);
      return;
    }

    if (drag.type === "vertex") {
      onChange(rooms.map((r) => {
        if (r.id !== drag.roomId) return r;
        const pts = [...r.points] as [number, number][];
        pts[drag.idx] = world;
        return { ...r, points: pts };
      }));
      return;
    }

    if (drag.type === "edge") {
      const dx = world[0] - drag.startMouse[0];
      const dy = world[1] - drag.startMouse[1];
      const i = drag.idx;
      const j = (i + 1) % drag.origPts.length;
      onChange(rooms.map((r) => {
        if (r.id !== drag.roomId) return r;
        const pts = drag.origPts.map((p, k) => {
          if (k === i || k === j) return [snap(p[0] + dx), snap(p[1] + dy)] as [number, number];
          return [...p] as [number, number];
        });
        return { ...r, points: pts };
      }));
      return;
    }

    if (drag.type === "room") {
      const dx = world[0] - drag.startMouse[0];
      const dy = world[1] - drag.startMouse[1];
      onChange(rooms.map((r) => {
        if (r.id !== drag.roomId) return r;
        const pts = drag.origPts.map((p) => [snap(p[0] + dx), snap(p[1] + dy)] as [number, number]);
        return { ...r, points: pts };
      }));
    }
  }, [drag, screenToWorld, screenToWorldRaw, rooms, onChange, outline, building, onBuildingChange]);

  const handleMouseUp = useCallback(() => { setDrag(null); }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (mode !== "draw") return;
    if (drag) return;

    const world = screenToWorld(e);

    // Close polygon check
    if (drawingPoints.length >= 3) {
      const d = Math.hypot(world[0] - drawingPoints[0][0], world[1] - drawingPoints[0][1]);
      if (d < CLOSE_DIST) {
        finishDrawing();
        return;
      }
    }
    setDrawingPoints((prev) => [...prev, world]);
  }, [mode, drawingPoints, screenToWorld, drag]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (mode !== "draw" || drawingPoints.length < 3) return;
    e.preventDefault();
    e.stopPropagation();
    finishDrawing();
  }, [mode, drawingPoints]);

  const finishDrawing = () => {
    if (drawingPoints.length < 3) return;

    if (phase === "outline") {
      setOutline([...drawingPoints]);
      setDrawingPoints([]);
      setMode("select");
      // Auto-advance to rooms phase
      setPhase("rooms");
      setMode("draw");
    } else {
      const newRoom: RoomConfig = {
        id: `room-${++roomIdCounter}`,
        name: "Neuer Raum",
        points: [...drawingPoints],
        floorType: "parkett",
      };
      onChange([...rooms, newRoom]);
      setSelectedRoomId(newRoom.id);
      setDrawingPoints([]);
      setMode("select");
    }
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const world = screenToWorld(e);

    // Outline context menu
    if (phase === "outline" && mode === "select" && outline.length >= 3) {
      // Vertex delete
      for (let i = 0; i < outline.length; i++) {
        if (Math.hypot(world[0] - outline[i][0], world[1] - outline[i][1]) < 6 * px) {
          if (outline.length <= 3) return;
          setOutline(outline.filter((_, k) => k !== i));
          return;
        }
      }
      // Edge insert
      for (let i = 0; i < outline.length; i++) {
        const j = (i + 1) % outline.length;
        if (distToSegment(world[0], world[1], outline[i][0], outline[i][1], outline[j][0], outline[j][1]) < 4 * px) {
          const mid: [number, number] = [snap((outline[i][0] + outline[j][0]) / 2), snap((outline[i][1] + outline[j][1]) / 2)];
          const pts = [...outline];
          pts.splice(j, 0, mid);
          setOutline(pts);
          return;
        }
      }
      return;
    }

    // Room context menu
    if (phase === "rooms" && mode === "select" && selectedRoomId) {
      const room = rooms.find((r) => r.id === selectedRoomId);
      if (!room) return;
      for (let i = 0; i < room.points.length; i++) {
        if (Math.hypot(world[0] - room.points[i][0], world[1] - room.points[i][1]) < 6 * px) {
          if (room.points.length <= 3) return;
          const newPts = room.points.filter((_, k) => k !== i);
          onChange(rooms.map((r) => (r.id === room.id ? { ...r, points: newPts } : r)));
          return;
        }
      }
      for (let i = 0; i < room.points.length; i++) {
        const j = (i + 1) % room.points.length;
        if (distToSegment(world[0], world[1], room.points[i][0], room.points[i][1], room.points[j][0], room.points[j][1]) < 4 * px) {
          const mid: [number, number] = [snap((room.points[i][0] + room.points[j][0]) / 2), snap((room.points[i][1] + room.points[j][1]) / 2)];
          const newPts = [...room.points];
          newPts.splice(j, 0, mid);
          onChange(rooms.map((r) => (r.id === room.id ? { ...r, points: newPts } : r)));
          return;
        }
      }
    }
  }, [mode, phase, selectedRoomId, rooms, onChange, outline, building, onBuildingChange, screenToWorld, px]);

  // ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode === "draw") {
        setDrawingPoints([]);
        setMode("select");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode]);

  const updateRoom = (id: string, updates: Partial<RoomConfig>) => {
    onChange(rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteRoom = (id: string) => {
    onChange(rooms.filter((r) => r.id !== id));
    if (selectedRoomId === id) setSelectedRoomId(null);
  };

  // --- Wall edge length editing ---
  const updateEdgeLength = (roomId: string, edgeIdx: number, newLength: number) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || newLength <= 0) return;
    const pts = room.points;
    const i = edgeIdx;
    const j = (i + 1) % pts.length;
    const a = pts[i], b = pts[j];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const currentLen = Math.hypot(dx, dy);
    if (currentLen === 0) return;
    const scale = newLength / currentLen;
    const newB: [number, number] = [snap(a[0] + dx * scale), snap(a[1] + dy * scale)];
    const newPts = [...pts];
    newPts[j] = newB;
    onChange(rooms.map((r) => (r.id === roomId ? { ...r, points: newPts } : r)));
  };

  // --- Chatbot action handlers ---
  const chatCreateRoom = (name: string, width: number, depth: number, x?: number, y?: number) => {
    let cx = x ?? 0, cy = y ?? 0;
    if (x === undefined && y === undefined && outline.length >= 3) {
      const c = centroid(outline);
      cx = c[0]; cy = c[1];
      cx = snap(cx + rooms.length * 0.5);
      cy = snap(cy + rooms.length * 0.5);
    }
    const hw = width / 2, hd = depth / 2;
    const points: [number, number][] = [
      [snap(cx - hw), snap(cy - hd)],
      [snap(cx + hw), snap(cy - hd)],
      [snap(cx + hw), snap(cy + hd)],
      [snap(cx - hw), snap(cy + hd)],
    ];
    const newRoom: RoomConfig = {
      id: `room-${++roomIdCounter}`,
      name,
      points,
      floorType: "parkett",
    };
    onChange([...rooms, newRoom]);
    setSelectedRoomId(newRoom.id);
    setMode("select");
  };

  const chatResizeRoom = (roomName: string, width?: number, depth?: number) => {
    const room = rooms.find((r) => r.name.toLowerCase() === roomName.toLowerCase());
    if (!room) return;
    const c = centroid(room.points);
    const xs = room.points.map((p) => p[0]);
    const ys = room.points.map((p) => p[1]);
    const curW = Math.max(...xs) - Math.min(...xs);
    const curD = Math.max(...ys) - Math.min(...ys);
    const newW = width ?? curW;
    const newD = depth ?? curD;
    const hw = newW / 2, hd = newD / 2;
    const points: [number, number][] = [
      [snap(c[0] - hw), snap(c[1] - hd)],
      [snap(c[0] + hw), snap(c[1] - hd)],
      [snap(c[0] + hw), snap(c[1] + hd)],
      [snap(c[0] - hw), snap(c[1] + hd)],
    ];
    onChange(rooms.map((r) => (r.id === room.id ? { ...r, points } : r)));
  };

  const chatMoveRoom = (roomName: string, x: number, y: number) => {
    const room = rooms.find((r) => r.name.toLowerCase() === roomName.toLowerCase());
    if (!room) return;
    const c = centroid(room.points);
    const dx = x - c[0], dy = y - c[1];
    const points = room.points.map((p) => [snap(p[0] + dx), snap(p[1] + dy)] as [number, number]);
    onChange(rooms.map((r) => (r.id === room.id ? { ...r, points } : r)));
  };

  const chatRenameRoom = (roomName: string, newName: string) => {
    const room = rooms.find((r) => r.name.toLowerCase() === roomName.toLowerCase());
    if (room) updateRoom(room.id, { name: newName });
  };

  const chatDeleteRoom = (roomName: string) => {
    const room = rooms.find((r) => r.name.toLowerCase() === roomName.toLowerCase());
    if (room) deleteRoom(room.id);
  };

  const chatSetFloorType = (roomName: string, floorType: string) => {
    const room = rooms.find((r) => r.name.toLowerCase() === roomName.toLowerCase());
    if (room && ["parkett", "fliesen", "laminat"].includes(floorType)) {
      updateRoom(room.id, { floorType: floorType as RoomConfig["floorType"] });
    }
  };

  const addRoomByDimensions = () => {
    const w = parseFloat(newRoomWidth);
    const d = parseFloat(newRoomDepth);
    if (isNaN(w) || isNaN(d) || w <= 0 || d <= 0) return;

    // Place in center of outline or at origin
    let cx = 0, cy = 0;
    if (outline.length >= 3) {
      const c = centroid(outline);
      cx = c[0]; cy = c[1];
    }

    // Offset if rooms already exist to avoid exact overlap
    const offsetIdx = rooms.length;
    cx = snap(cx + offsetIdx * 0.5);
    cy = snap(cy + offsetIdx * 0.5);

    const hw = w / 2, hd = d / 2;
    const points: [number, number][] = [
      [snap(cx - hw), snap(cy - hd)],
      [snap(cx + hw), snap(cy - hd)],
      [snap(cx + hw), snap(cy + hd)],
      [snap(cx - hw), snap(cy + hd)],
    ];

    const newRoom: RoomConfig = {
      id: `room-${++roomIdCounter}`,
      name: newRoomName || "Neuer Raum",
      points,
      floorType: "parkett",
    };
    onChange([...rooms, newRoom]);
    setSelectedRoomId(newRoom.id);
    setShowAddRoom(false);
    setNewRoomName("Neuer Raum");
    setMode("select");
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const pointsToSvg = (pts: [number, number][]) => pts.map((p) => `${p[0]},${p[1]}`).join(" ");
  const sw = (pixels: number) => pixels * px;

  const outlineArea = outline.length >= 3 ? polygonArea(outline) : 0;

  // Helper instructions
  const getHelpText = () => {
    if (phase === "outline") {
      if (mode === "draw") return "Zeichne die Außenwände deines Gebäudes · Klicke um Eckpunkte zu setzen · Doppelklick zum Schließen";
      return "Passe die Gebäudeform an · Punkte ziehen · Rechtsklick: Punkt einfügen/löschen";
    }
    if (mode === "draw") return "Zeichne Räume innerhalb der Gebäudeform · Doppelklick zum Schließen";
    return "Raum anklicken zum Auswählen · Rechtsklick: Punkt einfügen/löschen · Mausrad: Zoom";
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-3 border-b border-border flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-foreground">
                {phase === "outline" ? "Gebäudeform zeichnen" : "Räume zeichnen"}
              </h1>
              {phase === "outline" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Schritt 1</span>
              )}
              {phase === "rooms" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Schritt 2</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{getHelpText()}</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => { setMode("select"); setDrawingPoints([]); }}
              className={`p-2 rounded-lg transition-colors ${mode === "select" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
              title="Auswählen"
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode("draw")}
              className={`p-2 rounded-lg transition-colors ${mode === "draw" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
              title="Zeichnen"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <div className="w-px bg-border mx-1" />
            <button onClick={() => setZoom((z) => Math.min(200, z * 1.3))} className="p-2 rounded-lg hover:bg-muted text-foreground"><Plus className="w-4 h-4" /></button>
            <button onClick={() => setZoom((z) => Math.max(5, z / 1.3))} className="p-2 rounded-lg hover:bg-muted text-foreground"><Minus className="w-4 h-4" /></button>
            <div className="w-px bg-border mx-1" />
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
            >
              <Settings className="w-4 h-4" />
            </button>
            {onSave && (
              <>
                <div className="w-px bg-border mx-1" />
                {onPlanNameChange && (
                  <input
                    value={planName || ""}
                    onChange={(e) => onPlanNameChange(e.target.value)}
                    className="px-2 py-1.5 rounded-md border border-border bg-background text-foreground text-sm w-36 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Name..."
                  />
                )}
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Speichern
                </button>
              </>
            )}
          </div>
        </div>

        {/* SVG Canvas */}
        <div ref={containerRef} className="flex-1 overflow-hidden bg-muted/30">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={viewBox}
            className={mode === "draw" ? "cursor-crosshair" : "cursor-default"}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
          >
            <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="hsl(120, 15%, 92%)" />

            {/* Grid */}
            {gridLines.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={l.major ? "hsl(220, 10%, 60%)" : "hsl(220, 10%, 82%)"}
                strokeWidth={sw(l.major ? 1.5 : 0.5)}
                strokeDasharray={l.major ? undefined : `${sw(4)} ${sw(4)}`}
              />
            ))}

            {/* Scale labels */}
            {gridLines.filter((l) => l.x1 === l.x2 && !l.major).map((l, i) => (
              <text key={`lx-${i}`} x={l.x1} y={vbY + sw(12)} textAnchor="middle" fontSize={sw(10)} fill="hsl(220, 10%, 50%)" className="select-none">{l.x1}m</text>
            ))}
            {gridLines.filter((l) => l.y1 === l.y2 && !l.major).map((l, i) => (
              <text key={`ly-${i}`} x={vbX + sw(4)} y={l.y1 + sw(3)} fontSize={sw(10)} fill="hsl(220, 10%, 50%)" className="select-none">{l.y1}m</text>
            ))}

            {/* Building outline (always visible once set) */}
            {outline.length >= 3 && (
              <g>
                <polygon
                  points={pointsToSvg(outline)}
                  fill={phase === "rooms" ? "hsl(40, 30%, 95%)" : "hsl(40, 40%, 88%)"}
                  fillOpacity={0.5}
                  stroke="hsl(220, 15%, 35%)"
                  strokeWidth={sw(phase === "outline" ? 2.5 : 2)}
                  strokeLinejoin="miter"
                />
                {/* Outline edge lengths */}
                {outline.map((pt, idx) => {
                  const next = outline[(idx + 1) % outline.length];
                  const len = Math.hypot(next[0] - pt[0], next[1] - pt[1]);
                  const mx = (pt[0] + next[0]) / 2;
                  const my = (pt[1] + next[1]) / 2;
                  // Offset label outward
                  const dx = next[1] - pt[1], dy = -(next[0] - pt[0]);
                  const mag = Math.hypot(dx, dy) || 1;
                  return (
                    <text key={`olen-${idx}`} x={mx + (dx / mag) * sw(12)} y={my + (dy / mag) * sw(12)}
                      textAnchor="middle" fontSize={sw(9)} fontWeight="600"
                      fill="hsl(220, 15%, 35%)" className="pointer-events-none select-none"
                    >
                      {len.toFixed(2)}m
                    </text>
                  );
                })}
                {/* Outline area label */}
                {(() => {
                  const c = centroid(outline);
                  return phase === "outline" ? (
                    <text x={c[0]} y={c[1]} textAnchor="middle" fontSize={sw(12)} fontWeight="500"
                      fill="hsl(220, 15%, 40%)" className="pointer-events-none select-none"
                    >
                      {outlineArea.toFixed(1)} m²
                    </text>
                  ) : null;
                })()}
                {/* Vertex handles (outline phase only) */}
                {phase === "outline" && mode === "select" && outline.map((pt, idx) => (
                  <circle key={`ov-${idx}`} cx={pt[0]} cy={pt[1]} r={sw(5)}
                    fill="hsl(220, 15%, 35%)" stroke="white" strokeWidth={sw(1.5)} className="cursor-grab"
                  />
                ))}
              </g>
            )}

            {/* Rooms */}
            {phase === "rooms" && rooms.map((room) => {
              if (room.points.length < 3) return null;
              const isSelected = selectedRoomId === room.id;
              const ft = FLOOR_TYPES.find((f) => f.value === room.floorType);
              const c = centroid(room.points);
              const area = polygonArea(room.points);
              return (
                <g key={room.id}>
                  <polygon points={pointsToSvg(room.points)} fill={ft?.color || "hsl(35, 45%, 72%)"} fillOpacity={0.6}
                    stroke={isSelected ? "hsl(var(--primary))" : "hsl(220, 10%, 40%)"} strokeWidth={sw(isSelected ? 2.5 : 1.5)}
                    className={mode === "select" ? "cursor-move" : "pointer-events-none"}
                  />
                  <text x={c[0]} y={c[1] - sw(4)} textAnchor="middle" fontSize={sw(11)} fontWeight="500" fill="hsl(220, 10%, 20%)" className="pointer-events-none select-none">{room.name}</text>
                  <text x={c[0]} y={c[1] + sw(10)} textAnchor="middle" fontSize={sw(9)} fill="hsl(220, 10%, 50%)" className="pointer-events-none select-none">{area.toFixed(1)} m²</text>

                  {/* Clickable edge hit areas for ALL rooms */}
                  {mode === "select" && room.points.map((pt, idx) => {
                    const next = room.points[(idx + 1) % room.points.length];
                    const noWallSet = new Set(room.noWallEdges || []);
                    const isNoWall = noWallSet.has(idx);
                    const isEdgeSelected = isSelected && selectedEdgeIdx === idx;
                    return (
                      <line key={`re-${idx}`} x1={pt[0]} y1={pt[1]} x2={next[0]} y2={next[1]}
                        stroke={isEdgeSelected ? "hsl(var(--primary))" : isNoWall ? "hsl(var(--destructive))" : "transparent"}
                        strokeWidth={sw(isEdgeSelected ? 4 : 8)}
                        strokeDasharray={isNoWall && !isEdgeSelected ? `${sw(4)} ${sw(4)}` : undefined}
                        opacity={isEdgeSelected ? 0.8 : isNoWall ? 0.5 : 1}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRoomId(room.id);
                          setSelectedEdgeIdx(idx);
                        }}
                      />
                    );
                  })}
                  {isSelected && mode === "select" && room.points.map((pt, idx) => (
                    <circle key={`rv-${idx}`} cx={pt[0]} cy={pt[1]} r={sw(5)} fill="hsl(var(--primary))" stroke="white" strokeWidth={sw(1.5)} className="cursor-grab" />
                  ))}
                  {isSelected && room.points.map((pt, idx) => {
                    const next = room.points[(idx + 1) % room.points.length];
                    const len = Math.hypot(next[0] - pt[0], next[1] - pt[1]);
                    const mx = (pt[0] + next[0]) / 2;
                    const my = (pt[1] + next[1]) / 2;
                    const isEdgeSelected = selectedEdgeIdx === idx;
                    return <text key={`rlen-${idx}`} x={mx} y={my - sw(5)} textAnchor="middle" fontSize={sw(isEdgeSelected ? 10 : 8)} fontWeight={isEdgeSelected ? "700" : "500"} fill="hsl(var(--primary))" className="pointer-events-none select-none">{len.toFixed(2)}m</text>;
                  })}
                </g>
              );
            })}

            {/* Drawing in progress */}
            {mode === "draw" && drawingPoints.length > 0 && (
              <g>
                <polyline points={pointsToSvg(drawingPoints)} fill="none" stroke={phase === "outline" ? "hsl(220, 15%, 35%)" : "hsl(var(--primary))"} strokeWidth={sw(2)} strokeDasharray={`${sw(6)} ${sw(3)}`} />
                {mouseWorld && (
                  <line x1={drawingPoints[drawingPoints.length - 1][0]} y1={drawingPoints[drawingPoints.length - 1][1]}
                    x2={mouseWorld[0]} y2={mouseWorld[1]}
                    stroke={phase === "outline" ? "hsl(220, 15%, 35%)" : "hsl(var(--primary))"} strokeWidth={sw(1.5)} strokeDasharray={`${sw(4)} ${sw(4)}`} opacity={0.5}
                  />
                )}
                {mouseWorld && drawingPoints.length >= 3 && (() => {
                  const d = Math.hypot(mouseWorld[0] - drawingPoints[0][0], mouseWorld[1] - drawingPoints[0][1]);
                  if (d < CLOSE_DIST) {
                    return <line x1={drawingPoints[drawingPoints.length - 1][0]} y1={drawingPoints[drawingPoints.length - 1][1]}
                      x2={drawingPoints[0][0]} y2={drawingPoints[0][1]}
                      stroke={phase === "outline" ? "hsl(220, 15%, 35%)" : "hsl(var(--primary))"} strokeWidth={sw(2)} opacity={0.7} />;
                  }
                  return null;
                })()}
                {drawingPoints.map((pt, idx) => {
                  const isFirst = idx === 0 && drawingPoints.length >= 3;
                  return <circle key={idx} cx={pt[0]} cy={pt[1]} r={sw(isFirst ? 7 : 4)}
                    fill={phase === "outline" ? "hsl(220, 15%, 35%)" : "hsl(var(--primary))"} stroke="white" strokeWidth={sw(isFirst ? 2 : 1.5)} opacity={isFirst ? 0.8 : 1} />;
                })}
              </g>
            )}

            {/* Crosshair */}
            {mode === "draw" && mouseWorld && (
              <g opacity={0.25}>
                <line x1={mouseWorld[0]} y1={vbY} x2={mouseWorld[0]} y2={vbY + vbH} stroke="hsl(var(--primary))" strokeWidth={sw(0.5)} />
                <line x1={vbX} y1={mouseWorld[1]} x2={vbX + vbW} y2={mouseWorld[1]} stroke="hsl(var(--primary))" strokeWidth={sw(0.5)} />
                <text x={mouseWorld[0] + sw(8)} y={mouseWorld[1] - sw(8)} fontSize={sw(9)} fill="hsl(var(--primary))" className="select-none">
                  {mouseWorld[0].toFixed(2)}, {mouseWorld[1].toFixed(2)}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Drawing status bar */}
        {mode === "draw" && drawingPoints.length > 0 && (
          <div className="p-3 border-t border-border bg-card flex items-center gap-2 justify-center">
            <span className="text-xs text-muted-foreground">{drawingPoints.length} Punkte</span>
            <button onClick={() => setDrawingPoints((p) => p.slice(0, -1))} className="px-3 py-1.5 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors">Rückgängig</button>
            <button onClick={() => { setDrawingPoints([]); setMode("select"); }} className="px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">
              <X className="w-3 h-3 inline mr-1" />Abbrechen
            </button>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-80 bg-card border-l border-border flex flex-col h-full overflow-hidden">
        {showSettings ? (
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Wandeinstellungen</h3>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Wandstärke (m)</label>
              <input type="number" step="0.01" min="0.1" max="0.5" value={building.wallThickness}
                onChange={(e) => onBuildingChange({ ...building, wallThickness: parseFloat(e.target.value) || 0.24 })}
                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Wandhöhe (m)</label>
              <input type="number" step="0.1" min="2" max="5" value={building.wallHeight}
                onChange={(e) => onBuildingChange({ ...building, wallHeight: parseFloat(e.target.value) || 2.6 })}
                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {outline.length >= 3 && (
              <div className="pt-2 border-t border-border">
                <button onClick={() => { setPhase("outline"); setMode("select"); setShowSettings(false); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors">
                  <Home className="w-3.5 h-3.5" />Gebäudeform bearbeiten
                </button>
              </div>
            )}
          </div>
        ) : phase === "outline" ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Home className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Gebäudeumriss</h3>
                  <p className="text-xs text-muted-foreground">Zeichne zuerst die Außenform</p>
                </div>
              </div>
              {outline.length < 3 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Zeichne die Außenform auf dem Raster oder gib die Maße ein:
                  </p>
                  <div className="p-3 rounded-lg border border-border bg-muted/50 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-foreground mb-1 block">Breite (m)</label>
                        <input type="number" step="0.25" min="1" value={outlineWidth} onChange={(e) => setOutlineWidth(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-foreground mb-1 block">Tiefe (m)</label>
                        <input type="number" step="0.25" min="1" value={outlineDepth} onChange={(e) => setOutlineDepth(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                    <button onClick={() => {
                      const w = parseFloat(outlineWidth), d = parseFloat(outlineDepth);
                      if (isNaN(w) || isNaN(d) || w <= 0 || d <= 0) return;
                      const hw = w / 2, hd = d / 2;
                      setOutline([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]);
                    }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors">
                      <Home className="w-3.5 h-3.5" />Rechteck erstellen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fläche</span>
                    <span className="font-medium text-foreground">{outlineArea.toFixed(1)} m²</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ecken</span>
                    <span className="font-medium text-foreground">{outline.length}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1" />
            {outline.length >= 3 && (
              <div className="p-4 border-t border-border">
                <button onClick={() => { setPhase("rooms"); setMode("draw"); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                  Weiter: Räume zeichnen
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border space-y-2">
              <div className="flex gap-2">
                <button onClick={() => setMode("draw")}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />Zeichnen
                </button>
                <button onClick={() => setShowAddRoom(!showAddRoom)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-xs transition-colors ${showAddRoom ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-muted"}`}>
                  <Plus className="w-3.5 h-3.5" />Maße eingeben
                </button>
              </div>
              {showAddRoom && (
                <div className="p-3 rounded-lg border border-border bg-muted/50 space-y-2">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Raumname</label>
                    <input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="z.B. Küche" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-foreground mb-1 block">Breite (m)</label>
                      <input type="number" step="0.25" min="0.5" value={newRoomWidth} onChange={(e) => setNewRoomWidth(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-foreground mb-1 block">Tiefe (m)</label>
                      <input type="number" step="0.25" min="0.5" value={newRoomDepth} onChange={(e) => setNewRoomDepth(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                  <button onClick={addRoomByDimensions}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors">
                    <Plus className="w-3.5 h-3.5" />Raum hinzufügen
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {rooms.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Zeichne Räume oder gib Maße ein.</p>
              )}
              {rooms.map((room) => {
                const area = room.points.length >= 3 ? polygonArea(room.points) : 0;
                return (
                  <div key={room.id} onClick={() => { setSelectedRoomId(room.id); setSelectedEdgeIdx(null); }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedRoomId === room.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{room.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground">{area.toFixed(1)} m² · {room.points.length} Ecken</span>
                  </div>
                );
              })}
            </div>
            {selectedRoom && (
              <div className="p-4 border-t border-border bg-secondary/50 space-y-3 max-h-[50%] overflow-y-auto">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Name</label>
                  <input value={selectedRoom.name} onChange={(e) => updateRoom(selectedRoom.id, { name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>

                {/* Wall edge dimensions */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Wände</label>
                  <div className="space-y-1">
                    {selectedRoom.points.map((pt, idx) => {
                      const next = selectedRoom.points[(idx + 1) % selectedRoom.points.length];
                      const len = Math.hypot(next[0] - pt[0], next[1] - pt[1]);
                      const noWallSet = new Set(selectedRoom.noWallEdges || []);
                      const isNoWall = noWallSet.has(idx);
                      const isEdgeSel = selectedEdgeIdx === idx;
                      const thickness = selectedRoom.edgeThickness?.[idx] ?? building.wallThickness;
                      return (
                        <div key={idx}>
                          <div
                            className={`flex items-center gap-1.5 p-1.5 rounded-md cursor-pointer transition-colors ${isEdgeSel ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"}`}
                            onClick={() => setSelectedEdgeIdx(isEdgeSel ? null : idx)}
                          >
                            <span className={`text-[10px] w-12 flex-shrink-0 font-medium ${isNoWall ? "text-destructive line-through" : "text-muted-foreground"}`}>
                              Wand {idx + 1}
                            </span>
                            <span className="text-[10px] text-foreground flex-1">{len.toFixed(2)}m</span>
                            <span className="text-[10px] text-muted-foreground">{(thickness * 100).toFixed(0)}cm</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const edges = new Set(selectedRoom.noWallEdges || []);
                                if (edges.has(idx)) edges.delete(idx);
                                else edges.add(idx);
                                updateRoom(selectedRoom.id, { noWallEdges: Array.from(edges) });
                              }}
                              className={`p-0.5 rounded text-[10px] font-medium transition-colors flex-shrink-0 ${isNoWall ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                              title={isNoWall ? "Wand wiederherstellen" : "Wand entfernen"}
                            >
                              {isNoWall ? "✕" : "🧱"}
                            </button>
                          </div>
                          {/* Expanded wall details */}
                          {isEdgeSel && (
                            <div className="ml-2 mt-1 mb-2 p-2 rounded-md border border-border bg-background space-y-2">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Länge (m)</label>
                                  <input
                                    type="number" step="0.01" min="0.01"
                                    value={parseFloat(len.toFixed(2))}
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value);
                                      if (!isNaN(v) && v > 0) updateEdgeLength(selectedRoom.id, idx, v);
                                    }}
                                    className="w-full px-2 py-1 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Dicke (m)</label>
                                  <input
                                    type="number" step="0.01" min="0.05" max="1"
                                    value={thickness}
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value);
                                      if (!isNaN(v) && v > 0) {
                                        const et = { ...(selectedRoom.edgeThickness || {}) };
                                        et[idx] = v;
                                        updateRoom(selectedRoom.id, { edgeThickness: et });
                                      }
                                    }}
                                    className="w-full px-2 py-1 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <label className="flex items-center gap-1 text-[10px] text-foreground">
                                  <input type="checkbox" checked={!isNoWall} onChange={() => {
                                    const edges = new Set(selectedRoom.noWallEdges || []);
                                    if (edges.has(idx)) edges.delete(idx);
                                    else edges.add(idx);
                                    updateRoom(selectedRoom.id, { noWallEdges: Array.from(edges) });
                                  }} className="rounded border-border w-3 h-3" />
                                  Wand aktiv
                                </label>
                                <button
                                  onClick={() => {
                                    const et = { ...(selectedRoom.edgeThickness || {}) };
                                    delete et[idx];
                                    updateRoom(selectedRoom.id, { edgeThickness: et });
                                  }}
                                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Standard-Dicke
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Bodenbelag</label>
                  <div className="flex gap-2">
                    {FLOOR_TYPES.map((ft) => (
                      <button key={ft.value} onClick={() => updateRoom(selectedRoom.id, { floorType: ft.value as RoomConfig["floorType"] })}
                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${selectedRoom.floorType === ft.value ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                        {ft.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-foreground">
                    <input type="checkbox" checked={selectedRoom.hasWindow || false} onChange={(e) => updateRoom(selectedRoom.id, { hasWindow: e.target.checked })} className="rounded border-border" />Fenster
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-foreground">
                    <input type="checkbox" checked={selectedRoom.hasDoor || false} onChange={(e) => updateRoom(selectedRoom.id, { hasDoor: e.target.checked })} className="rounded border-border" />Haustür
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        {phase === "rooms" && (
          <div className="p-4 border-t border-border">
            <button onClick={onFinish} disabled={rooms.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Eye className="w-4 h-4" />3D Vorschau & Einrichten
            </button>
          </div>
        )}
      </div>

      {/* AI Chat Panel */}
      {phase === "rooms" && (
        <ChatPanel
          rooms={rooms}
          outline={outline}
          onCreateRoom={chatCreateRoom}
          onResizeRoom={chatResizeRoom}
          onMoveRoom={chatMoveRoom}
          onRenameRoom={chatRenameRoom}
          onDeleteRoom={chatDeleteRoom}
          onSetFloorType={chatSetFloorType}
        />
      )}
    </div>
  );
};

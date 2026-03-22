import { useState, useRef, useCallback, useEffect } from "react";
import { BuildingConfig, RoomConfig } from "./types";
import { Trash2, ArrowLeft, Eye, Pencil, MousePointer, X, Settings, Plus, Minus } from "lucide-react";

interface Props {
  building: BuildingConfig;
  onBuildingChange: (b: BuildingConfig) => void;
  rooms: RoomConfig[];
  onChange: (rooms: RoomConfig[]) => void;
  onBack: () => void;
  onFinish: () => void;
}

let roomIdCounter = 0;

const FLOOR_TYPES = [
  { value: "parkett", label: "Parkett", color: "hsl(35, 45%, 72%)" },
  { value: "fliesen", label: "Fliesen", color: "hsl(220, 8%, 75%)" },
  { value: "laminat", label: "Laminat", color: "hsl(30, 20%, 66%)" },
] as const;

const SNAP = 0.25;
const CLOSE_DIST = 0.4; // meters — world-space threshold to close polygon

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

type Mode = "select" | "draw";
type DragState =
  | null
  | { type: "vertex"; roomId: string; idx: number }
  | { type: "edge"; roomId: string; idx: number; startMouse: [number, number]; origPts: [number, number][] }
  | { type: "room"; roomId: string; startMouse: [number, number]; origPts: [number, number][] }
  | { type: "pan"; startMouse: [number, number]; startCenter: [number, number] };

export const WizardStep2 = ({ building, onBuildingChange, rooms, onChange, onBack, onFinish }: Props) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("select");
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [mouseWorld, setMouseWorld] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Zoom/Pan
  const [viewCenter, setViewCenter] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState(50); // pixels per meter
  const [containerSize, setContainerSize] = useState<[number, number]>([800, 600]);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ResizeObserver
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

  // viewBox calculation
  const vbW = containerSize[0] / zoom;
  const vbH = containerSize[1] / zoom;
  const vbX = viewCenter[0] - vbW / 2;
  const vbY = viewCenter[1] - vbH / 2;
  const viewBox = `${vbX} ${vbY} ${vbW} ${vbH}`;

  // Screen to world using inverse CTM
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

  // Pixel size in world units (for consistent handle sizes)
  const px = 1 / zoom;

  // --- Event Handlers ---

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const worldBefore = screenToWorldRaw(e);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => {
      const newZ = Math.max(5, Math.min(200, z * factor));
      // Adjust center so point under mouse stays fixed
      const newVbW = containerSize[0] / newZ;
      const newVbH = containerSize[1] / newZ;
      // worldBefore should stay at same screen position
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
    // Middle mouse or Alt+Left → Pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      const raw = screenToWorldRaw(e);
      setDrag({ type: "pan", startMouse: raw, startCenter: [...viewCenter] });
      return;
    }

    if (e.button !== 0) return;
    if (mode !== "select") return;

    const world = screenToWorld(e);

    // Check vertex hit
    for (const room of rooms) {
      if (room.id !== selectedRoomId) continue;
      for (let i = 0; i < room.points.length; i++) {
        const d = Math.hypot(world[0] - room.points[i][0], world[1] - room.points[i][1]);
        if (d < 6 * px) {
          e.stopPropagation();
          setDrag({ type: "vertex", roomId: room.id, idx: i });
          return;
        }
      }
    }

    // Check edge hit (selected room)
    if (selectedRoomId) {
      const room = rooms.find((r) => r.id === selectedRoomId);
      if (room) {
        for (let i = 0; i < room.points.length; i++) {
          const j = (i + 1) % room.points.length;
          const d = distToSegment(world[0], world[1], room.points[i][0], room.points[i][1], room.points[j][0], room.points[j][1]);
          if (d < 4 * px) {
            e.stopPropagation();
            setDrag({ type: "edge", roomId: room.id, idx: i, startMouse: world, origPts: room.points.map((p) => [...p] as [number, number]) });
            return;
          }
        }
      }
    }

    // Check room hit
    for (const room of rooms) {
      if (pointInPolygon(world[0], world[1], room.points)) {
        e.stopPropagation();
        setSelectedRoomId(room.id);
        setDrag({ type: "room", roomId: room.id, startMouse: world, origPts: room.points.map((p) => [...p] as [number, number]) });
        return;
      }
    }

    // Clicked empty space
    setSelectedRoomId(null);
  }, [mode, rooms, selectedRoomId, screenToWorld, screenToWorldRaw, viewCenter, px]);

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
      return;
    }
  }, [drag, screenToWorld, screenToWorldRaw, rooms, onChange]);

  const handleMouseUp = useCallback(() => {
    setDrag(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (mode !== "draw") return;
    if (drag) return; // was dragging

    const world = screenToWorld(e);

    // Check if close to first point → close polygon
    if (drawingPoints.length >= 3) {
      const d = Math.hypot(world[0] - drawingPoints[0][0], world[1] - drawingPoints[0][1]);
      if (d < CLOSE_DIST) {
        finishRoom();
        return;
      }
    }

    setDrawingPoints((prev) => [...prev, world]);
  }, [mode, drawingPoints, screenToWorld, drag]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (mode !== "draw" || drawingPoints.length < 3) return;
    e.preventDefault();
    e.stopPropagation();
    finishRoom();
  }, [mode, drawingPoints]);

  const finishRoom = () => {
    if (drawingPoints.length < 3) return;
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
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (mode !== "select" || !selectedRoomId) return;

    const world = screenToWorld(e);
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (!room) return;

    // Check vertex → delete
    for (let i = 0; i < room.points.length; i++) {
      const d = Math.hypot(world[0] - room.points[i][0], world[1] - room.points[i][1]);
      if (d < 6 * px) {
        if (room.points.length <= 3) return; // can't delete below 3
        const newPts = room.points.filter((_, k) => k !== i);
        onChange(rooms.map((r) => (r.id === room.id ? { ...r, points: newPts } : r)));
        return;
      }
    }

    // Check edge → insert point
    for (let i = 0; i < room.points.length; i++) {
      const j = (i + 1) % room.points.length;
      const d = distToSegment(world[0], world[1], room.points[i][0], room.points[i][1], room.points[j][0], room.points[j][1]);
      if (d < 4 * px) {
        const mid: [number, number] = [
          snap((room.points[i][0] + room.points[j][0]) / 2),
          snap((room.points[i][1] + room.points[j][1]) / 2),
        ];
        const newPts = [...room.points];
        newPts.splice(j, 0, mid);
        onChange(rooms.map((r) => (r.id === room.id ? { ...r, points: newPts } : r)));
        return;
      }
    }
  }, [mode, selectedRoomId, rooms, onChange, screenToWorld, px]);

  // ESC to cancel drawing
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

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const pointsToSvg = (pts: [number, number][]) =>
    pts.map((p) => `${p[0]},${p[1]}`).join(" ");

  // Stroke width in world units for consistent visual size
  const sw = (pixels: number) => pixels * px;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Canvas area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-3 border-b border-border flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">Räume zeichnen</h1>
            <p className="text-xs text-muted-foreground">
              {mode === "draw"
                ? "Klicke um Eckpunkte zu setzen · Doppelklick oder ersten Punkt anklicken zum Schließen · ESC abbrechen"
                : "Raum anklicken zum Auswählen · Rechtsklick: Punkt einfügen/löschen · Mausrad: Zoom · Alt+Drag: Pan"}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => { setMode("select"); setDrawingPoints([]); }}
              className={`p-2 rounded-lg transition-colors ${mode === "select" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
              title="Auswählen (S)"
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode("draw")}
              className={`p-2 rounded-lg transition-colors ${mode === "draw" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
              title="Zeichnen (D)"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <div className="w-px bg-border mx-1" />
            <button onClick={() => setZoom((z) => Math.min(200, z * 1.3))} className="p-2 rounded-lg hover:bg-muted text-foreground" title="Hineinzoomen">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom((z) => Math.max(5, z / 1.3))} className="p-2 rounded-lg hover:bg-muted text-foreground" title="Herauszoomen">
              <Minus className="w-4 h-4" />
            </button>
            <div className="w-px bg-border mx-1" />
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
              title="Einstellungen"
            >
              <Settings className="w-4 h-4" />
            </button>
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
            {/* Background */}
            <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="hsl(120, 15%, 92%)" />

            {/* Grid */}
            {gridLines.map((l, i) => (
              <line
                key={i}
                x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={l.major ? "hsl(220, 10%, 60%)" : "hsl(220, 10%, 82%)"}
                strokeWidth={sw(l.major ? 1.5 : 0.5)}
                strokeDasharray={l.major ? undefined : `${sw(4)} ${sw(4)}`}
              />
            ))}

            {/* Scale labels */}
            {gridLines.filter((l) => l.x1 === l.x2 && !l.major).map((l, i) => (
              <text key={`lx-${i}`} x={l.x1} y={vbY + sw(12)} textAnchor="middle" fontSize={sw(10)} fill="hsl(220, 10%, 50%)" className="select-none">
                {l.x1}m
              </text>
            ))}
            {gridLines.filter((l) => l.y1 === l.y2 && !l.major).map((l, i) => (
              <text key={`ly-${i}`} x={vbX + sw(4)} y={l.y1 + sw(3)} fontSize={sw(10)} fill="hsl(220, 10%, 50%)" className="select-none">
                {l.y1}m
              </text>
            ))}

            {/* Existing rooms */}
            {rooms.map((room) => {
              if (room.points.length < 3) return null;
              const isSelected = selectedRoomId === room.id;
              const ft = FLOOR_TYPES.find((f) => f.value === room.floorType);
              const c = centroid(room.points);
              const area = polygonArea(room.points);

              return (
                <g key={room.id}>
                  {/* Fill */}
                  <polygon
                    points={pointsToSvg(room.points)}
                    fill={ft?.color || "hsl(35, 45%, 72%)"}
                    fillOpacity={0.6}
                    stroke={isSelected ? "hsl(var(--primary))" : "hsl(220, 10%, 40%)"}
                    strokeWidth={sw(isSelected ? 2.5 : 1.5)}
                    className={mode === "select" ? "cursor-move" : "pointer-events-none"}
                  />
                  {/* Room label */}
                  <text x={c[0]} y={c[1] - sw(4)} textAnchor="middle" fontSize={sw(11)} fontWeight="500" fill="hsl(220, 10%, 20%)" className="pointer-events-none select-none">
                    {room.name}
                  </text>
                  <text x={c[0]} y={c[1] + sw(10)} textAnchor="middle" fontSize={sw(9)} fill="hsl(220, 10%, 50%)" className="pointer-events-none select-none">
                    {area.toFixed(1)} m²
                  </text>

                  {/* Edge handles (invisible wider stroke for easier grabbing) */}
                  {isSelected && mode === "select" && room.points.map((pt, idx) => {
                    const next = room.points[(idx + 1) % room.points.length];
                    return (
                      <line
                        key={`edge-${idx}`}
                        x1={pt[0]} y1={pt[1]} x2={next[0]} y2={next[1]}
                        stroke="transparent"
                        strokeWidth={sw(8)}
                        className="cursor-ew-resize"
                      />
                    );
                  })}

                  {/* Vertex handles */}
                  {isSelected && mode === "select" && room.points.map((pt, idx) => (
                    <circle
                      key={`v-${idx}`}
                      cx={pt[0]}
                      cy={pt[1]}
                      r={sw(5)}
                      fill="hsl(var(--primary))"
                      stroke="white"
                      strokeWidth={sw(1.5)}
                      className="cursor-grab"
                    />
                  ))}

                  {/* Edge length labels */}
                  {isSelected && room.points.map((pt, idx) => {
                    const next = room.points[(idx + 1) % room.points.length];
                    const len = Math.hypot(next[0] - pt[0], next[1] - pt[1]);
                    const mx = (pt[0] + next[0]) / 2;
                    const my = (pt[1] + next[1]) / 2;
                    return (
                      <text
                        key={`len-${idx}`}
                        x={mx}
                        y={my - sw(5)}
                        textAnchor="middle"
                        fontSize={sw(8)}
                        fill="hsl(var(--primary))"
                        className="pointer-events-none select-none font-medium"
                      >
                        {len.toFixed(2)}m
                      </text>
                    );
                  })}
                </g>
              );
            })}

            {/* Drawing in progress */}
            {mode === "draw" && drawingPoints.length > 0 && (
              <g>
                <polyline
                  points={pointsToSvg(drawingPoints)}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={sw(2)}
                  strokeDasharray={`${sw(6)} ${sw(3)}`}
                />
                {mouseWorld && (
                  <line
                    x1={drawingPoints[drawingPoints.length - 1][0]}
                    y1={drawingPoints[drawingPoints.length - 1][1]}
                    x2={mouseWorld[0]}
                    y2={mouseWorld[1]}
                    stroke="hsl(var(--primary))"
                    strokeWidth={sw(1.5)}
                    strokeDasharray={`${sw(4)} ${sw(4)}`}
                    opacity={0.5}
                  />
                )}
                {/* Close preview line */}
                {mouseWorld && drawingPoints.length >= 3 && (() => {
                  const d = Math.hypot(mouseWorld[0] - drawingPoints[0][0], mouseWorld[1] - drawingPoints[0][1]);
                  if (d < CLOSE_DIST) {
                    return (
                      <line
                        x1={drawingPoints[drawingPoints.length - 1][0]}
                        y1={drawingPoints[drawingPoints.length - 1][1]}
                        x2={drawingPoints[0][0]}
                        y2={drawingPoints[0][1]}
                        stroke="hsl(var(--primary))"
                        strokeWidth={sw(2)}
                        opacity={0.7}
                      />
                    );
                  }
                  return null;
                })()}
                {drawingPoints.map((pt, idx) => {
                  const isFirst = idx === 0 && drawingPoints.length >= 3;
                  return (
                    <circle
                      key={idx}
                      cx={pt[0]}
                      cy={pt[1]}
                      r={sw(isFirst ? 7 : 4)}
                      fill="hsl(var(--primary))"
                      stroke="white"
                      strokeWidth={sw(isFirst ? 2 : 1.5)}
                      opacity={isFirst ? 0.8 : 1}
                    />
                  );
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
            <button
              onClick={() => setDrawingPoints((p) => p.slice(0, -1))}
              className="px-3 py-1.5 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              Rückgängig
            </button>
            <button
              onClick={() => { setDrawingPoints([]); setMode("select"); }}
              className="px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
            >
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
              <input
                type="number" step="0.01" min="0.1" max="0.5"
                value={building.wallThickness}
                onChange={(e) => onBuildingChange({ ...building, wallThickness: parseFloat(e.target.value) || 0.24 })}
                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Wandhöhe (m)</label>
              <input
                type="number" step="0.1" min="2" max="5"
                value={building.wallHeight}
                onChange={(e) => onBuildingChange({ ...building, wallHeight: parseFloat(e.target.value) || 2.6 })}
                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border">
              <button
                onClick={() => setMode("draw")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Raum zeichnen
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {rooms.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Zeichne deinen ersten Raum auf dem Raster.
                </p>
              )}
              {rooms.map((room) => {
                const area = room.points.length >= 3 ? polygonArea(room.points) : 0;
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRoomId === room.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{room.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground">{area.toFixed(1)} m² · {room.points.length} Ecken</span>
                  </div>
                );
              })}
            </div>

            {selectedRoom && (
              <div className="p-4 border-t border-border bg-secondary/50 space-y-3 max-h-[40%] overflow-y-auto">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Name</label>
                  <input
                    value={selectedRoom.name}
                    onChange={(e) => updateRoom(selectedRoom.id, { name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Bodenbelag</label>
                  <div className="flex gap-2">
                    {FLOOR_TYPES.map((ft) => (
                      <button
                        key={ft.value}
                        onClick={() => updateRoom(selectedRoom.id, { floorType: ft.value as RoomConfig["floorType"] })}
                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          selectedRoom.floorType === ft.value
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {ft.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-foreground">
                    <input type="checkbox" checked={selectedRoom.hasWindow || false} onChange={(e) => updateRoom(selectedRoom.id, { hasWindow: e.target.checked })} className="rounded border-border" />
                    Fenster
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-foreground">
                    <input type="checkbox" checked={selectedRoom.hasDoor || false} onChange={(e) => updateRoom(selectedRoom.id, { hasDoor: e.target.checked })} className="rounded border-border" />
                    Haustür
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        <div className="p-4 border-t border-border">
          <button
            onClick={onFinish}
            disabled={rooms.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-4 h-4" />
            3D Vorschau & Einrichten
          </button>
        </div>
      </div>
    </div>
  );
};

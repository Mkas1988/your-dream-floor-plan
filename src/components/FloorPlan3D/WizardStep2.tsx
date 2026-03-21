import { useState, useRef, useCallback } from "react";
import { BuildingConfig, RoomConfig } from "./types";
import { Trash2, ArrowLeft, Eye, Pencil, MousePointer, X, Settings } from "lucide-react";

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

const SCALE = 40; // px per meter
const SNAP = 0.1;
const CLOSE_THRESHOLD = 12;
const CANVAS_SIZE = 16; // meters total canvas

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
  return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
}

type Mode = "select" | "draw";

export const WizardStep2 = ({ building, onBuildingChange, rooms, onChange, onBack, onFinish }: Props) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("select");
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [draggingVertex, setDraggingVertex] = useState<{ roomId: string; vertexIdx: number } | null>(null);
  const [draggingRoom, setDraggingRoom] = useState<{ roomId: string; offset: [number, number] } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Canvas centered at origin: -CANVAS_SIZE/2 to +CANVAS_SIZE/2
  const halfC = CANVAS_SIZE / 2;
  const svgW = CANVAS_SIZE * SCALE;
  const svgH = CANVAS_SIZE * SCALE;
  const PAD = 30;

  // Convert pixel to world coords (centered at origin)
  const getSvgCoords = useCallback(
    (e: React.MouseEvent): [number, number] => {
      const svg = svgRef.current;
      if (!svg) return [0, 0];
      const rect = svg.getBoundingClientRect();
      const x = snap((e.clientX - rect.left - PAD) / SCALE - halfC);
      const z = snap((e.clientY - rect.top - PAD) / SCALE - halfC);
      return [x, z];
    },
    [halfC]
  );

  // World coords to SVG px
  const toSvgX = (x: number) => (x + halfC) * SCALE + PAD;
  const toSvgY = (z: number) => (z + halfC) * SCALE + PAD;

  const getRawPx = useCallback(
    (e: React.MouseEvent): [number, number] => {
      const svg = svgRef.current;
      if (!svg) return [0, 0];
      const rect = svg.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    },
    []
  );

  const handleSvgClick = (e: React.MouseEvent) => {
    if (mode !== "draw") {
      setSelectedRoomId(null);
      return;
    }
    const coords = getSvgCoords(e);

    if (drawingPoints.length >= 3) {
      const firstPx = [toSvgX(drawingPoints[0][0]), toSvgY(drawingPoints[0][1])];
      const rawPx = getRawPx(e);
      const dist = Math.hypot(rawPx[0] - firstPx[0], rawPx[1] - firstPx[1]);
      if (dist < CLOSE_THRESHOLD) {
        finishRoom();
        return;
      }
    }
    setDrawingPoints([...drawingPoints, coords]);
  };

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

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (mode !== "draw" || drawingPoints.length < 3) return;
    e.preventDefault();
    e.stopPropagation();
    finishRoom();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getSvgCoords(e);
    setMousePos(coords);

    if (draggingVertex) {
      const room = rooms.find((r) => r.id === draggingVertex.roomId);
      if (!room) return;
      const newPoints = [...room.points] as [number, number][];
      newPoints[draggingVertex.vertexIdx] = coords;
      updateRoom(draggingVertex.roomId, { points: newPoints });
    }

    if (draggingRoom) {
      const room = rooms.find((r) => r.id === draggingRoom.roomId);
      if (!room) return;
      const c = centroid(room.points);
      const dx = coords[0] - (c[0] + draggingRoom.offset[0]);
      const dz = coords[1] - (c[1] + draggingRoom.offset[1]);
      const newPoints = room.points.map((p) => [snap(p[0] + dx), snap(p[1] + dz)] as [number, number]);
      updateRoom(draggingRoom.roomId, { points: newPoints });
    }
  };

  const handleMouseUp = () => {
    setDraggingVertex(null);
    setDraggingRoom(null);
  };

  const updateRoom = (id: string, updates: Partial<RoomConfig>) => {
    onChange(rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteRoom = (id: string) => {
    onChange(rooms.filter((r) => r.id !== id));
    if (selectedRoomId === id) setSelectedRoomId(null);
  };

  const cancelDrawing = () => {
    setDrawingPoints([]);
    setMode("select");
  };

  const undoLastPoint = () => {
    setDrawingPoints((prev) => prev.slice(0, -1));
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const pointsToSvg = (pts: [number, number][]) =>
    pts.map((p) => `${toSvgX(p[0])},${toSvgY(p[1])}`).join(" ");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">Räume zeichnen</h1>
            <p className="text-xs text-muted-foreground">
              {mode === "draw"
                ? "Klicke um Punkte zu setzen · Doppelklick oder ersten Punkt anklicken zum Schließen"
                : "Wähle einen Raum oder starte eine neue Zeichnung"}
              {rooms.length > 0 && ` · ${rooms.length} Räume`}
            </p>
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
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
              title="Einstellungen"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-muted/30">
          <svg
            ref={svgRef}
            width={svgW + PAD * 2}
            height={svgH + PAD * 2}
            className={`drop-shadow-lg ${mode === "draw" ? "cursor-crosshair" : "cursor-default"}`}
            onClick={handleSvgClick}
            onDoubleClick={handleDoubleClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Background */}
            <rect x={0} y={0} width={svgW + PAD * 2} height={svgH + PAD * 2} fill="hsl(120, 15%, 92%)" />

            {/* Grid */}
            {Array.from({ length: CANVAS_SIZE + 1 }, (_, i) => (
              <g key={`grid-${i}`}>
                <line
                  x1={i * SCALE + PAD}
                  y1={PAD}
                  x2={i * SCALE + PAD}
                  y2={svgH + PAD}
                  stroke={i === Math.floor(CANVAS_SIZE / 2) ? "hsl(220, 10%, 70%)" : "hsl(220, 10%, 85%)"}
                  strokeWidth={i === Math.floor(CANVAS_SIZE / 2) ? 1 : 0.5}
                  strokeDasharray={i === Math.floor(CANVAS_SIZE / 2) ? undefined : "4,4"}
                />
                <line
                  x1={PAD}
                  y1={i * SCALE + PAD}
                  x2={svgW + PAD}
                  y2={i * SCALE + PAD}
                  stroke={i === Math.floor(CANVAS_SIZE / 2) ? "hsl(220, 10%, 70%)" : "hsl(220, 10%, 85%)"}
                  strokeWidth={i === Math.floor(CANVAS_SIZE / 2) ? 1 : 0.5}
                  strokeDasharray={i === Math.floor(CANVAS_SIZE / 2) ? undefined : "4,4"}
                />
              </g>
            ))}

            {/* Scale labels */}
            {Array.from({ length: CANVAS_SIZE + 1 }, (_, i) => {
              const val = i - halfC;
              if (val % 2 !== 0) return null;
              return (
                <g key={`label-${i}`}>
                  <text x={i * SCALE + PAD} y={PAD - 6} textAnchor="middle" className="text-[8px] fill-muted-foreground select-none">
                    {val}m
                  </text>
                  <text x={PAD - 6} y={i * SCALE + PAD + 3} textAnchor="end" className="text-[8px] fill-muted-foreground select-none">
                    {val}m
                  </text>
                </g>
              );
            })}

            {/* Existing rooms */}
            {rooms.map((room) => {
              if (room.points.length < 3) return null;
              const isSelected = selectedRoomId === room.id;
              const ft = FLOOR_TYPES.find((f) => f.value === room.floorType);
              const c = centroid(room.points);
              const area = polygonArea(room.points);

              return (
                <g key={room.id}>
                  <polygon
                    points={pointsToSvg(room.points)}
                    fill={ft?.color || "hsl(35, 45%, 72%)"}
                    fillOpacity={0.7}
                    stroke={isSelected ? "hsl(var(--primary))" : "hsl(220, 10%, 40%)"}
                    strokeWidth={isSelected ? 2.5 : 2}
                    className={mode === "select" ? "cursor-move" : "pointer-events-none"}
                    onClick={(e) => {
                      if (mode !== "select") return;
                      e.stopPropagation();
                      setSelectedRoomId(room.id);
                    }}
                    onMouseDown={(e) => {
                      if (mode !== "select") return;
                      e.stopPropagation();
                      const coords = getSvgCoords(e);
                      const rc = centroid(room.points);
                      setDraggingRoom({ roomId: room.id, offset: [coords[0] - rc[0], coords[1] - rc[1]] });
                      setSelectedRoomId(room.id);
                    }}
                  />
                  <text x={toSvgX(c[0])} y={toSvgY(c[1]) - 6} textAnchor="middle" className="text-[11px] font-medium fill-foreground pointer-events-none select-none">
                    {room.name}
                  </text>
                  <text x={toSvgX(c[0])} y={toSvgY(c[1]) + 8} textAnchor="middle" className="text-[9px] fill-muted-foreground pointer-events-none select-none">
                    {area.toFixed(1)} m²
                  </text>
                  {isSelected && mode === "select" && room.points.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={toSvgX(pt[0])}
                      cy={toSvgY(pt[1])}
                      r={5}
                      fill="hsl(var(--primary))"
                      stroke="white"
                      strokeWidth={1.5}
                      className="cursor-grab"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingVertex({ roomId: room.id, vertexIdx: idx });
                      }}
                    />
                  ))}
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
                  strokeWidth={2}
                  strokeDasharray="6,3"
                />
                {mousePos && (
                  <line
                    x1={toSvgX(drawingPoints[drawingPoints.length - 1][0])}
                    y1={toSvgY(drawingPoints[drawingPoints.length - 1][1])}
                    x2={toSvgX(mousePos[0])}
                    y2={toSvgY(mousePos[1])}
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    strokeDasharray="4,4"
                    opacity={0.5}
                  />
                )}
                {drawingPoints.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={toSvgX(pt[0])}
                    cy={toSvgY(pt[1])}
                    r={idx === 0 && drawingPoints.length >= 3 ? 7 : 4}
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth={idx === 0 && drawingPoints.length >= 3 ? 2 : 1.5}
                    opacity={idx === 0 && drawingPoints.length >= 3 ? 0.8 : 1}
                  />
                ))}
              </g>
            )}

            {/* Crosshair at mouse pos in draw mode */}
            {mode === "draw" && mousePos && (
              <g opacity={0.3}>
                <line x1={toSvgX(mousePos[0])} y1={PAD} x2={toSvgX(mousePos[0])} y2={svgH + PAD} stroke="hsl(var(--primary))" strokeWidth={0.5} />
                <line x1={PAD} y1={toSvgY(mousePos[1])} x2={svgW + PAD} y2={toSvgY(mousePos[1])} stroke="hsl(var(--primary))" strokeWidth={0.5} />
                <text x={toSvgX(mousePos[0]) + 8} y={toSvgY(mousePos[1]) - 8} className="text-[9px] fill-primary select-none">
                  {mousePos[0].toFixed(1)}, {mousePos[1].toFixed(1)}
                </text>
              </g>
            )}
          </svg>
        </div>

        {mode === "draw" && drawingPoints.length > 0 && (
          <div className="p-3 border-t border-border bg-card flex items-center gap-2 justify-center">
            <span className="text-xs text-muted-foreground">{drawingPoints.length} Punkte</span>
            <button onClick={undoLastPoint} className="px-3 py-1.5 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors">
              Rückgängig
            </button>
            <button onClick={cancelDrawing} className="px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">
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
                  Zeichne deinen ersten Raum auf dem Raster. Die Gebäudeform ergibt sich automatisch.
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

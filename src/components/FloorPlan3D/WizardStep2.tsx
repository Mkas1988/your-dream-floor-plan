import { useState, useRef, useCallback } from "react";
import { BuildingConfig, RoomConfig } from "./types";
import { Plus, Trash2, ArrowLeft, Eye, Pencil, MousePointer, X } from "lucide-react";

interface Props {
  building: BuildingConfig;
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

const SCALE = 55; // px per meter
const SNAP = 0.1; // snap to 10cm grid
const CLOSE_THRESHOLD = 12; // px to close polygon

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

export const WizardStep2 = ({ building, rooms, onChange, onBack, onFinish }: Props) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("select");
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [draggingVertex, setDraggingVertex] = useState<{ roomId: string; vertexIdx: number } | null>(null);
  const [draggingRoom, setDraggingRoom] = useState<{ roomId: string; offset: [number, number] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const svgW = building.width * SCALE;
  const svgH = building.depth * SCALE;
  const PAD = 30;

  const getSvgCoords = useCallback(
    (e: React.MouseEvent): [number, number] => {
      const svg = svgRef.current;
      if (!svg) return [0, 0];
      const rect = svg.getBoundingClientRect();
      const x = snap((e.clientX - rect.left - PAD) / SCALE);
      const z = snap((e.clientY - rect.top - PAD) / SCALE);
      return [
        Math.max(0, Math.min(building.width, x)),
        Math.max(0, Math.min(building.depth, z)),
      ];
    },
    [building]
  );

  const getRawPx = useCallback(
    (e: React.MouseEvent): [number, number] => {
      const svg = svgRef.current;
      if (!svg) return [0, 0];
      const rect = svg.getBoundingClientRect();
      return [e.clientX - rect.left - PAD, e.clientY - rect.top - PAD];
    },
    []
  );

  const handleSvgClick = (e: React.MouseEvent) => {
    if (mode !== "draw") {
      setSelectedRoomId(null);
      return;
    }

    const coords = getSvgCoords(e);

    // Check if closing the polygon
    if (drawingPoints.length >= 3) {
      const firstPx: [number, number] = [drawingPoints[0][0] * SCALE, drawingPoints[0][1] * SCALE];
      const clickPx = getRawPx(e);
      const dist = Math.hypot(clickPx[0] - firstPx[0], clickPx[1] - firstPx[1]);
      if (dist < CLOSE_THRESHOLD) {
        // Close polygon → create room
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
        return;
      }
    }

    setDrawingPoints([...drawingPoints, coords]);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (mode !== "draw" || drawingPoints.length < 3) return;
    e.preventDefault();
    e.stopPropagation();

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
      const newPoints = room.points.map(
        (p) => [snap(p[0] + dx), snap(p[1] + dz)] as [number, number]
      );
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
    pts.map((p) => `${p[0] * SCALE + PAD},${p[1] * SCALE + PAD}`).join(" ");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* 2D Editor */}
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
                : "Wähle einen Raum oder starte eine neue Zeichnung"}{" "}
              · {building.width}×{building.depth}m
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
            {/* Building outline */}
            <rect
              x={PAD}
              y={PAD}
              width={svgW}
              height={svgH}
              fill="hsl(35, 40%, 95%)"
              stroke="hsl(220, 10%, 40%)"
              strokeWidth={3}
            />

            {/* Grid lines */}
            {Array.from({ length: Math.floor(building.width) }, (_, i) => (
              <line
                key={`vg-${i}`}
                x1={(i + 1) * SCALE + PAD}
                y1={PAD}
                x2={(i + 1) * SCALE + PAD}
                y2={svgH + PAD}
                stroke="hsl(220, 10%, 85%)"
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
            ))}
            {Array.from({ length: Math.floor(building.depth) }, (_, i) => (
              <line
                key={`hg-${i}`}
                x1={PAD}
                y1={(i + 1) * SCALE + PAD}
                x2={svgW + PAD}
                y2={(i + 1) * SCALE + PAD}
                stroke="hsl(220, 10%, 85%)"
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
            ))}

            {/* Rooms */}
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
                    fillOpacity={0.65}
                    stroke={isSelected ? "hsl(var(--primary))" : "hsl(220, 10%, 50%)"}
                    strokeWidth={isSelected ? 2.5 : 1.5}
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
                  {/* Label */}
                  <text
                    x={c[0] * SCALE + PAD}
                    y={c[1] * SCALE + PAD - 6}
                    textAnchor="middle"
                    className="text-[11px] font-medium fill-foreground pointer-events-none select-none"
                  >
                    {room.name}
                  </text>
                  <text
                    x={c[0] * SCALE + PAD}
                    y={c[1] * SCALE + PAD + 8}
                    textAnchor="middle"
                    className="text-[9px] fill-muted-foreground pointer-events-none select-none"
                  >
                    {area.toFixed(1)} m²
                  </text>

                  {/* Vertex handles when selected */}
                  {isSelected &&
                    mode === "select" &&
                    room.points.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt[0] * SCALE + PAD}
                        cy={pt[1] * SCALE + PAD}
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
                {/* Lines between placed points */}
                <polyline
                  points={pointsToSvg(drawingPoints)}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="6,3"
                />
                {/* Preview line to mouse */}
                {mousePos && (
                  <line
                    x1={drawingPoints[drawingPoints.length - 1][0] * SCALE + PAD}
                    y1={drawingPoints[drawingPoints.length - 1][1] * SCALE + PAD}
                    x2={mousePos[0] * SCALE + PAD}
                    y2={mousePos[1] * SCALE + PAD}
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    strokeDasharray="4,4"
                    opacity={0.5}
                  />
                )}
                {/* Placed vertices */}
                {drawingPoints.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt[0] * SCALE + PAD}
                    cy={pt[1] * SCALE + PAD}
                    r={idx === 0 && drawingPoints.length >= 3 ? 7 : 4}
                    fill={idx === 0 && drawingPoints.length >= 3 ? "hsl(var(--primary))" : "hsl(var(--primary))"}
                    stroke="white"
                    strokeWidth={idx === 0 && drawingPoints.length >= 3 ? 2 : 1.5}
                    opacity={idx === 0 && drawingPoints.length >= 3 ? 0.8 : 1}
                  />
                ))}
              </g>
            )}

            {/* Direction labels */}
            <text x={svgW / 2 + PAD} y={PAD - 8} textAnchor="middle" className="text-[10px] fill-muted-foreground select-none">
              Nord (Garten)
            </text>
            <text x={svgW / 2 + PAD} y={svgH + PAD + 16} textAnchor="middle" className="text-[10px] fill-muted-foreground select-none">
              Süd (Eingang)
            </text>
          </svg>
        </div>

        {/* Drawing toolbar */}
        {mode === "draw" && drawingPoints.length > 0 && (
          <div className="p-3 border-t border-border bg-card flex items-center gap-2 justify-center">
            <span className="text-xs text-muted-foreground">{drawingPoints.length} Punkte</span>
            <button
              onClick={undoLastPoint}
              className="px-3 py-1.5 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              Rückgängig
            </button>
            <button
              onClick={cancelDrawing}
              className="px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
            >
              <X className="w-3 h-3 inline mr-1" />
              Abbrechen
            </button>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-80 bg-card border-l border-border flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-border">
          <button
            onClick={() => setMode("draw")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Raum zeichnen
          </button>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {rooms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Räume. Klicke auf "Raum zeichnen" und setze Punkte auf dem Grundriss.
            </p>
          )}
          {rooms.map((room) => {
            const area = room.points.length >= 3 ? polygonArea(room.points) : 0;
            return (
              <div
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedRoomId === room.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{room.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRoom(room.id);
                    }}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {area.toFixed(1)} m² · {room.points.length} Ecken · {room.floorType}
                </span>
              </div>
            );
          })}
        </div>

        {/* Selected room editor */}
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
                <input
                  type="checkbox"
                  checked={selectedRoom.hasWindow || false}
                  onChange={(e) => updateRoom(selectedRoom.id, { hasWindow: e.target.checked })}
                  className="rounded border-border"
                />
                Fenster
              </label>
              <label className="flex items-center gap-1.5 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={selectedRoom.hasDoor || false}
                  onChange={(e) => updateRoom(selectedRoom.id, { hasDoor: e.target.checked })}
                  className="rounded border-border"
                />
                Haustür
              </label>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Eckpunkte ({selectedRoom.points.length})
              </label>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {selectedRoom.points.map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-4 text-right">{idx + 1}.</span>
                    <span>x={pt[0].toFixed(1)}</span>
                    <span>z={pt[1].toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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

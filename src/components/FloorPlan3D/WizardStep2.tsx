import { useState, useRef, useCallback } from "react";
import { BuildingConfig, RoomConfig } from "./types";
import { Plus, Trash2, ArrowLeft, Eye, GripVertical } from "lucide-react";

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

const SCALE = 50; // px per meter

export const WizardStep2 = ({ building, rooms, onChange, onBack, onFinish }: Props) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ roomId: string; offsetX: number; offsetZ: number } | null>(null);
  const [resizing, setResizing] = useState<{ roomId: string; edge: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const svgW = building.width * SCALE;
  const svgH = building.depth * SCALE;

  const addRoom = () => {
    const newRoom: RoomConfig = {
      id: `room-${++roomIdCounter}`,
      name: "Neuer Raum",
      x: 0,
      z: 0,
      width: Math.min(3, building.width),
      depth: Math.min(3, building.depth),
      floorType: "parkett",
    };
    onChange([...rooms, newRoom]);
    setSelectedRoomId(newRoom.id);
  };

  const updateRoom = (id: string, updates: Partial<RoomConfig>) => {
    onChange(rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteRoom = (id: string) => {
    onChange(rooms.filter((r) => r.id !== id));
    if (selectedRoomId === id) setSelectedRoomId(null);
  };

  const getSvgCoords = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, z: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / SCALE,
      z: (e.clientY - rect.top) / SCALE,
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent, roomId: string, type: "move" | "resize", edge?: string) => {
    e.stopPropagation();
    const coords = getSvgCoords(e);
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    if (type === "move") {
      setDragging({ roomId, offsetX: coords.x - room.x, offsetZ: coords.z - room.z });
    } else if (type === "resize" && edge) {
      setResizing({ roomId, edge });
    }
    setSelectedRoomId(roomId);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getSvgCoords(e);

    if (dragging) {
      const room = rooms.find((r) => r.id === dragging.roomId);
      if (!room) return;
      let newX = Math.max(0, Math.min(building.width - room.width, coords.x - dragging.offsetX));
      let newZ = Math.max(0, Math.min(building.depth - room.depth, coords.z - dragging.offsetZ));
      // Snap to 0.1m grid
      newX = Math.round(newX * 10) / 10;
      newZ = Math.round(newZ * 10) / 10;
      updateRoom(dragging.roomId, { x: newX, z: newZ });
    }

    if (resizing) {
      const room = rooms.find((r) => r.id === resizing.roomId);
      if (!room) return;
      if (resizing.edge === "right") {
        const newW = Math.max(0.5, Math.min(building.width - room.x, coords.x - room.x));
        updateRoom(resizing.roomId, { width: Math.round(newW * 10) / 10 });
      } else if (resizing.edge === "bottom") {
        const newD = Math.max(0.5, Math.min(building.depth - room.z, coords.z - room.z));
        updateRoom(resizing.roomId, { depth: Math.round(newD * 10) / 10 });
      }
    }
  }, [dragging, resizing, rooms, building, getSvgCoords]);

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* 2D Editor */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-foreground">Räume erstellen</h1>
            <p className="text-xs text-muted-foreground">
              Räume hinzufügen, verschieben und anpassen · {building.width}×{building.depth}m
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-muted/30">
          <svg
            ref={svgRef}
            width={svgW + 2}
            height={svgH + 2}
            className="drop-shadow-lg"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedRoomId(null)}
          >
            {/* Building outline */}
            <rect
              x={1}
              y={1}
              width={svgW}
              height={svgH}
              fill="hsl(35, 40%, 95%)"
              stroke="hsl(220, 10%, 40%)"
              strokeWidth={3}
            />

            {/* Grid lines every meter */}
            {Array.from({ length: Math.floor(building.width) }, (_, i) => (
              <line
                key={`vg-${i}`}
                x1={(i + 1) * SCALE + 1}
                y1={1}
                x2={(i + 1) * SCALE + 1}
                y2={svgH + 1}
                stroke="hsl(220, 10%, 85%)"
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
            ))}
            {Array.from({ length: Math.floor(building.depth) }, (_, i) => (
              <line
                key={`hg-${i}`}
                x1={1}
                y1={(i + 1) * SCALE + 1}
                x2={svgW + 1}
                y2={(i + 1) * SCALE + 1}
                stroke="hsl(220, 10%, 85%)"
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
            ))}

            {/* Rooms */}
            {rooms.map((room) => {
              const rx = room.x * SCALE + 1;
              const ry = room.z * SCALE + 1;
              const rw = room.width * SCALE;
              const rh = room.depth * SCALE;
              const isSelected = selectedRoomId === room.id;
              const ft = FLOOR_TYPES.find((f) => f.value === room.floorType);

              return (
                <g key={room.id}>
                  <rect
                    x={rx}
                    y={ry}
                    width={rw}
                    height={rh}
                    fill={ft?.color || "hsl(35, 45%, 72%)"}
                    fillOpacity={0.7}
                    stroke={isSelected ? "hsl(var(--primary))" : "hsl(220, 10%, 50%)"}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="cursor-move"
                    onMouseDown={(e) => handleMouseDown(e, room.id, "move")}
                    onClick={(e) => { e.stopPropagation(); setSelectedRoomId(room.id); }}
                  />
                  {/* Room label */}
                  <text
                    x={rx + rw / 2}
                    y={ry + rh / 2 - 6}
                    textAnchor="middle"
                    className="text-[11px] font-medium fill-foreground pointer-events-none select-none"
                  >
                    {room.name}
                  </text>
                  <text
                    x={rx + rw / 2}
                    y={ry + rh / 2 + 8}
                    textAnchor="middle"
                    className="text-[9px] fill-muted-foreground pointer-events-none select-none"
                  >
                    {room.width.toFixed(1)}×{room.depth.toFixed(1)}m
                  </text>

                  {/* Resize handles */}
                  {isSelected && (
                    <>
                      <rect
                        x={rx + rw - 6}
                        y={ry + rh / 2 - 6}
                        width={12}
                        height={12}
                        fill="hsl(var(--primary))"
                        rx={2}
                        className="cursor-ew-resize"
                        onMouseDown={(e) => handleMouseDown(e, room.id, "resize", "right")}
                      />
                      <rect
                        x={rx + rw / 2 - 6}
                        y={ry + rh - 6}
                        width={12}
                        height={12}
                        fill="hsl(var(--primary))"
                        rx={2}
                        className="cursor-ns-resize"
                        onMouseDown={(e) => handleMouseDown(e, room.id, "resize", "bottom")}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Direction labels */}
            <text x={svgW / 2 + 1} y={14} textAnchor="middle" className="text-[10px] fill-muted-foreground select-none">
              Nord (Garten)
            </text>
            <text x={svgW / 2 + 1} y={svgH - 4} textAnchor="middle" className="text-[10px] fill-muted-foreground select-none">
              Süd (Eingang)
            </text>
          </svg>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-80 bg-card border-l border-border flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-border">
          <button
            onClick={addRoom}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Raum hinzufügen
          </button>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {rooms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Räume. Klicke oben auf "Raum hinzufügen".
            </p>
          )}
          {rooms.map((room) => (
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
                  onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                {room.width.toFixed(1)}×{room.depth.toFixed(1)}m · {room.floorType}
              </span>
            </div>
          ))}
        </div>

        {/* Selected room editor */}
        {selectedRoom && (
          <div className="p-4 border-t border-border bg-secondary/50 space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Name</label>
              <input
                value={selectedRoom.name}
                onChange={(e) => updateRoom(selectedRoom.id, { name: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Breite (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={selectedRoom.width}
                  onChange={(e) => updateRoom(selectedRoom.id, { width: parseFloat(e.target.value) || 0.5 })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Tiefe (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={selectedRoom.depth}
                  onChange={(e) => updateRoom(selectedRoom.id, { depth: parseFloat(e.target.value) || 0.5 })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">X-Pos (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={selectedRoom.x}
                  onChange={(e) => updateRoom(selectedRoom.id, { x: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Z-Pos (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={selectedRoom.z}
                  onChange={(e) => updateRoom(selectedRoom.id, { z: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
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

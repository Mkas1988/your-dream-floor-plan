import { useState } from "react";
import { BuildingConfig, RoomConfig } from "./types";
import { polygonArea, centroid } from "./geometry";
import { Trash2, Eye, Pencil, Plus, Home, Merge, Magnet } from "lucide-react";

const FLOOR_TYPES = [
  { value: "parkett", label: "Parkett", color: "hsl(35, 45%, 72%)" },
  { value: "fliesen", label: "Fliesen", color: "hsl(220, 8%, 75%)" },
  { value: "laminat", label: "Laminat", color: "hsl(30, 20%, 66%)" },
] as const;

interface EditorSidebarProps {
  phase: "outline" | "rooms";
  building: BuildingConfig;
  outline: [number, number][];
  rooms: RoomConfig[];
  selectedRoomId: string | null;
  selectedEdgeIdx: number | null;
  mergeState: null | { firstRoomId: string };
  showSettings: boolean;
  onBuildingChange: (b: BuildingConfig) => void;
  onSetOutline: (pts: [number, number][]) => void;
  onChangeRooms: (rooms: RoomConfig[]) => void;
  onSelectRoom: (id: string | null) => void;
  onSelectEdge: (idx: number | null) => void;
  onSetPhase: (phase: "outline" | "rooms") => void;
  onSetMode: (mode: "select" | "draw") => void;
  onSetShowSettings: (v: boolean) => void;
  onSetMergeState: (v: null | { firstRoomId: string }) => void;
  onMergeRooms: (idA: string, idB: string) => void;
  onAutoRemoveSharedWalls: () => void;
  onFinish: () => void;
  onAddRoomByDimensions: (name: string, width: number, depth: number) => void;
}

export const EditorSidebar = ({
  phase, building, outline, rooms,
  selectedRoomId, selectedEdgeIdx, mergeState, showSettings,
  onBuildingChange, onSetOutline, onChangeRooms,
  onSelectRoom, onSelectEdge, onSetPhase, onSetMode,
  onSetShowSettings, onSetMergeState, onMergeRooms,
  onAutoRemoveSharedWalls, onFinish, onAddRoomByDimensions,
}: EditorSidebarProps) => {
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("Neuer Raum");
  const [newRoomWidth, setNewRoomWidth] = useState("4");
  const [newRoomDepth, setNewRoomDepth] = useState("3");
  const [outlineWidth, setOutlineWidth] = useState("10");
  const [outlineDepth, setOutlineDepth] = useState("8");

  const outlineArea = outline.length >= 3 ? polygonArea(outline) : 0;
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const updateRoom = (id: string, updates: Partial<RoomConfig>) => {
    onChangeRooms(rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteRoom = (id: string) => {
    onChangeRooms(rooms.filter((r) => r.id !== id));
    if (selectedRoomId === id) onSelectRoom(null);
  };

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
    const snap = (v: number) => Math.round(v / 0.01) * 0.01;
    const newB: [number, number] = [snap(a[0] + dx * scale), snap(a[1] + dy * scale)];
    const newPts = [...pts];
    newPts[j] = newB;
    onChangeRooms(rooms.map((r) => (r.id === roomId ? { ...r, points: newPts } : r)));
  };

  const handleAddRoom = () => {
    const w = parseFloat(newRoomWidth);
    const d = parseFloat(newRoomDepth);
    if (isNaN(w) || isNaN(d) || w <= 0 || d <= 0) return;
    onAddRoomByDimensions(newRoomName || "Neuer Raum", w, d);
    setShowAddRoom(false);
    setNewRoomName("Neuer Raum");
  };

  return (
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
              <button onClick={() => { onSetPhase("outline"); onSetMode("select"); onSetShowSettings(false); }}
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
                    onSetOutline([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]);
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
              <button onClick={() => { onSetPhase("rooms"); onSetMode("draw"); }}
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
              <button onClick={() => onSetMode("draw")}
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
                <button onClick={handleAddRoom}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors">
                  <Plus className="w-3.5 h-3.5" />Raum hinzufügen
                </button>
              </div>
            )}
            {rooms.length >= 2 && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onAutoRemoveSharedWalls}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-border text-foreground font-medium text-[10px] hover:bg-muted transition-colors"
                  title="Gemeinsame Wände automatisch entfernen"
                >
                  <Magnet className="w-3 h-3" />Gem. Wände entfernen
                </button>
                <button
                  onClick={() => {
                    if (mergeState) { onSetMergeState(null); }
                    else if (selectedRoomId) { onSetMergeState({ firstRoomId: selectedRoomId }); }
                  }}
                  disabled={!selectedRoomId}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg font-medium text-[10px] transition-colors ${mergeState ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-muted"} disabled:opacity-40 disabled:cursor-not-allowed`}
                  title="Zwei Räume zu einem verschmelzen"
                >
                  <Merge className="w-3 h-3" />Verschmelzen
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {mergeState && (
              <div className="p-3 rounded-lg border border-primary bg-primary/5 mb-2">
                <p className="text-xs font-medium text-primary">Klicke auf den zweiten Raum zum Verschmelzen</p>
                <button onClick={() => onSetMergeState(null)} className="text-xs text-muted-foreground hover:text-foreground mt-1">Abbrechen</button>
              </div>
            )}
            {rooms.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Zeichne Räume oder gib Maße ein.</p>
            )}
            {rooms.map((room) => {
              const area = room.points.length >= 3 ? polygonArea(room.points) : 0;
              const isMergeTarget = mergeState && room.id !== mergeState.firstRoomId;
              const isMergeSource = mergeState && room.id === mergeState.firstRoomId;
              return (
                <div key={room.id} onClick={() => {
                  if (mergeState && room.id !== mergeState.firstRoomId) {
                    onMergeRooms(mergeState.firstRoomId, room.id);
                    return;
                  }
                  onSelectRoom(room.id); onSelectEdge(null);
                }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${isMergeSource ? "border-primary bg-primary/10 ring-2 ring-primary/30" : isMergeTarget ? "border-primary/50 bg-primary/5 hover:bg-primary/10" : selectedRoomId === room.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{room.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">{area.toFixed(1)} m² · {room.points.length} Ecken</span>
                  {isMergeTarget && <span className="text-[10px] text-primary font-medium block mt-1">→ Klicken zum Verschmelzen</span>}
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
                          onClick={() => onSelectEdge(isEdgeSel ? null : idx)}
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
                            {isNoWall ? "\u2715" : "\u{1F9F1}"}
                          </button>
                        </div>
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
  );
};

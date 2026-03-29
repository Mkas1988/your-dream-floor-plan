import { useState, useRef, useCallback, useEffect } from "react";
import { BuildingConfig, RoomConfig } from "./types";
import { snap, distToSegment, pointInPolygon, convexHull, SNAP_VERTEX_DIST, CLOSE_DIST } from "./geometry";
import { X } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import { EditorToolbar } from "./EditorToolbar";
import { Canvas2D } from "./Canvas2D";
import { EditorSidebar } from "./EditorSidebar";
import { centroid } from "./geometry";

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
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

type Phase = "outline" | "rooms";
type Mode = "select" | "draw";
type MergeState = null | { firstRoomId: string };
type DragState =
  | null
  | { type: "vertex"; roomId: string; idx: number }
  | { type: "edge"; roomId: string; idx: number; startMouse: [number, number]; origPts: [number, number][] }
  | { type: "room"; roomId: string; startMouse: [number, number]; origPts: [number, number][] }
  | { type: "outline-vertex"; idx: number }
  | { type: "outline-edge"; idx: number; startMouse: [number, number]; origPts: [number, number][] }
  | { type: "pan"; startMouse: [number, number]; startCenter: [number, number] };

export const WizardStep2 = ({
  building, onBuildingChange, rooms, onChange, onBack, onFinish,
  onSave, saving, planName, onPlanNameChange,
  canUndo, canRedo, onUndo, onRedo,
}: Props) => {
  const outline = building.outline || [];
  const [phase, setPhase] = useState<Phase>(outline.length >= 3 ? "rooms" : "outline");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedEdgeIdx, setSelectedEdgeIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [mergeState, setMergeState] = useState<MergeState>(null);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [mouseWorld, setMouseWorld] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [showSettings, setShowSettings] = useState(false);
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
  const px = 1 / zoom;

  const screenToWorld = useCallback((e: React.MouseEvent | MouseEvent): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const world = pt.matrixTransform(ctm.inverse());
    return [snap(world.x), snap(world.y)];
  }, []);

  const screenToWorldRaw = useCallback((e: React.MouseEvent | MouseEvent): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const world = pt.matrixTransform(ctm.inverse());
    return [world.x, world.y];
  }, []);

  const snapToVertices = useCallback((pt: [number, number], excludeRoomId?: string): [number, number] => {
    let best: [number, number] = pt;
    let bestDist = SNAP_VERTEX_DIST;
    for (const v of outline) {
      const d = Math.hypot(pt[0] - v[0], pt[1] - v[1]);
      if (d < bestDist) { bestDist = d; best = [...v]; }
    }
    for (const room of rooms) {
      if (room.id === excludeRoomId) continue;
      for (const v of room.points) {
        const d = Math.hypot(pt[0] - v[0], pt[1] - v[1]);
        if (d < bestDist) { bestDist = d; best = [...v]; }
      }
    }
    return best;
  }, [outline, rooms]);

  const findSharedEdges = useCallback((roomA: RoomConfig, roomB: RoomConfig) => {
    const shared: { aIdx: number; bIdx: number }[] = [];
    const EPS = 0.05;
    for (let ai = 0; ai < roomA.points.length; ai++) {
      const a1 = roomA.points[ai], a2 = roomA.points[(ai + 1) % roomA.points.length];
      for (let bi = 0; bi < roomB.points.length; bi++) {
        const b1 = roomB.points[bi], b2 = roomB.points[(bi + 1) % roomB.points.length];
        if (
          (Math.hypot(a1[0] - b1[0], a1[1] - b1[1]) < EPS && Math.hypot(a2[0] - b2[0], a2[1] - b2[1]) < EPS) ||
          (Math.hypot(a1[0] - b2[0], a1[1] - b2[1]) < EPS && Math.hypot(a2[0] - b1[0], a2[1] - b1[1]) < EPS)
        ) {
          shared.push({ aIdx: ai, bIdx: bi });
        }
      }
    }
    return shared;
  }, []);

  const autoRemoveSharedWalls = useCallback(() => {
    let updated = rooms.map(r => ({ ...r }));
    for (let i = 0; i < updated.length; i++) {
      for (let j = i + 1; j < updated.length; j++) {
        const shared = findSharedEdges(updated[i], updated[j]);
        for (const s of shared) {
          const noWallA = new Set(updated[i].noWallEdges || []);
          noWallA.add(s.aIdx);
          updated[i] = { ...updated[i], noWallEdges: Array.from(noWallA) };
          const noWallB = new Set(updated[j].noWallEdges || []);
          noWallB.add(s.bIdx);
          updated[j] = { ...updated[j], noWallEdges: Array.from(noWallB) };
        }
      }
    }
    onChange(updated);
  }, [rooms, findSharedEdges, onChange]);

  const mergeRooms = useCallback((idA: string, idB: string) => {
    const roomA = rooms.find(r => r.id === idA);
    const roomB = rooms.find(r => r.id === idB);
    if (!roomA || !roomB) return;
    const hull = convexHull([...roomA.points, ...roomB.points]);
    const merged: RoomConfig = {
      id: roomA.id, name: `${roomA.name} + ${roomB.name}`,
      points: hull, floorType: roomA.floorType, noWallEdges: [],
    };
    onChange(rooms.filter(r => r.id !== idA && r.id !== idB).concat(merged));
    setSelectedRoomId(merged.id);
    setMergeState(null);
  }, [rooms, onChange]);

  // Grid
  const gridStep = zoom > 30 ? 1 : zoom > 15 ? 2 : 5;
  const gridStartX = Math.floor(vbX / gridStep) * gridStep;
  const gridStartY = Math.floor(vbY / gridStep) * gridStep;
  const gridLines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
  for (let x = gridStartX; x <= vbX + vbW; x += gridStep) gridLines.push({ x1: x, y1: vbY, x2: x, y2: vbY + vbH, major: x === 0 });
  for (let y = gridStartY; y <= vbY + vbH; y += gridStep) gridLines.push({ x1: vbX, y1: y, x2: vbX + vbW, y2: y, major: y === 0 });

  const setOutline = (pts: [number, number][]) => onBuildingChange({ ...building, outline: pts });

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
      setViewCenter([worldBefore[0] - (screenFrac[0] - 0.5) * newVbW, worldBefore[1] - (screenFrac[1] - 0.5) * newVbH]);
      return newZ;
    });
  }, [screenToWorldRaw, containerSize, viewCenter, vbW, vbH]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setDrag({ type: "pan", startMouse: screenToWorldRaw(e), startCenter: [...viewCenter] });
      return;
    }
    if (e.button !== 0 || mode !== "select") return;
    const world = screenToWorld(e);

    if (phase === "outline" && outline.length >= 3) {
      for (let i = 0; i < outline.length; i++) {
        if (Math.hypot(world[0] - outline[i][0], world[1] - outline[i][1]) < 6 * px) {
          e.stopPropagation(); setDrag({ type: "outline-vertex", idx: i }); return;
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

    if (phase === "rooms") {
      for (const room of rooms) {
        if (room.id !== selectedRoomId) continue;
        for (let i = 0; i < room.points.length; i++) {
          if (Math.hypot(world[0] - room.points[i][0], world[1] - room.points[i][1]) < 6 * px) {
            e.stopPropagation(); setDrag({ type: "vertex", roomId: room.id, idx: i }); return;
          }
        }
      }
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
      for (const room of rooms) {
        if (pointInPolygon(world[0], world[1], room.points)) {
          e.stopPropagation(); setSelectedRoomId(room.id); setSelectedEdgeIdx(null);
          setDrag({ type: "room", roomId: room.id, startMouse: world, origPts: room.points.map((p) => [...p] as [number, number]) });
          return;
        }
      }
      setSelectedRoomId(null); setSelectedEdgeIdx(null);
    }
  }, [mode, phase, rooms, selectedRoomId, outline, screenToWorld, screenToWorldRaw, viewCenter, px]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const world = screenToWorld(e);
    const raw = screenToWorldRaw(e);
    setMouseWorld(world);
    if (!drag) return;

    if (drag.type === "pan") {
      setViewCenter([drag.startCenter[0] - (raw[0] - drag.startMouse[0]), drag.startCenter[1] - (raw[1] - drag.startMouse[1])]);
      return;
    }
    if (drag.type === "outline-vertex") {
      const pts = [...outline] as [number, number][]; pts[drag.idx] = world; setOutline(pts); return;
    }
    if (drag.type === "outline-edge") {
      const dx = world[0] - drag.startMouse[0], dy = world[1] - drag.startMouse[1];
      const i = drag.idx, j = (i + 1) % drag.origPts.length;
      setOutline(drag.origPts.map((p, k) => (k === i || k === j) ? [snap(p[0] + dx), snap(p[1] + dy)] as [number, number] : [...p] as [number, number]));
      return;
    }
    if (drag.type === "vertex") {
      const snapped = snapToVertices(world, drag.roomId);
      onChange(rooms.map((r) => r.id !== drag.roomId ? r : { ...r, points: [...r.points].map((p, k) => k === drag.idx ? snapped : p) as [number, number][] }));
      return;
    }
    if (drag.type === "edge") {
      const dx = world[0] - drag.startMouse[0], dy = world[1] - drag.startMouse[1];
      const i = drag.idx, j = (i + 1) % drag.origPts.length;
      onChange(rooms.map((r) => r.id !== drag.roomId ? r : { ...r, points: drag.origPts.map((p, k) => (k === i || k === j) ? [snap(p[0] + dx), snap(p[1] + dy)] as [number, number] : [...p] as [number, number]) }));
      return;
    }
    if (drag.type === "room") {
      const dx = world[0] - drag.startMouse[0], dy = world[1] - drag.startMouse[1];
      onChange(rooms.map((r) => r.id !== drag.roomId ? r : { ...r, points: drag.origPts.map((p) => [snap(p[0] + dx), snap(p[1] + dy)] as [number, number]) }));
    }
  }, [drag, screenToWorld, screenToWorldRaw, rooms, onChange, outline, building, onBuildingChange, snapToVertices]);

  const handleMouseUp = useCallback(() => setDrag(null), []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (mode !== "draw") {
      if (mergeState && mode === "select") {
        const world = screenToWorld(e);
        for (const room of rooms) {
          if (room.id === mergeState.firstRoomId) continue;
          if (pointInPolygon(world[0], world[1], room.points)) { mergeRooms(mergeState.firstRoomId, room.id); return; }
        }
        setMergeState(null);
      }
      return;
    }
    if (drag) return;
    let world = snapToVertices(screenToWorld(e));
    if (drawingPoints.length >= 3 && Math.hypot(world[0] - drawingPoints[0][0], world[1] - drawingPoints[0][1]) < CLOSE_DIST) {
      finishDrawing(); return;
    }
    setDrawingPoints((prev) => [...prev, world]);
  }, [mode, drawingPoints, screenToWorld, drag, snapToVertices, mergeState, rooms, mergeRooms]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (mode !== "draw" || drawingPoints.length < 3) return;
    e.preventDefault(); e.stopPropagation(); finishDrawing();
  }, [mode, drawingPoints]);

  const finishDrawing = () => {
    if (drawingPoints.length < 3) return;
    if (phase === "outline") {
      setOutline([...drawingPoints]); setDrawingPoints([]); setMode("select");
      setPhase("rooms"); setMode("draw");
    } else {
      const newRoom: RoomConfig = {
        id: crypto.randomUUID(), name: "Neuer Raum",
        points: [...drawingPoints], floorType: "parkett",
      };
      onChange([...rooms, newRoom]); setSelectedRoomId(newRoom.id);
      setDrawingPoints([]); setMode("select");
    }
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const world = screenToWorld(e);

    if (phase === "outline" && mode === "select" && outline.length >= 3) {
      for (let i = 0; i < outline.length; i++) {
        if (Math.hypot(world[0] - outline[i][0], world[1] - outline[i][1]) < 6 * px) {
          if (outline.length <= 3) return;
          setOutline(outline.filter((_, k) => k !== i)); return;
        }
      }
      for (let i = 0; i < outline.length; i++) {
        const j = (i + 1) % outline.length;
        if (distToSegment(world[0], world[1], outline[i][0], outline[i][1], outline[j][0], outline[j][1]) < 4 * px) {
          const mid: [number, number] = [snap((outline[i][0] + outline[j][0]) / 2), snap((outline[i][1] + outline[j][1]) / 2)];
          const pts = [...outline]; pts.splice(j, 0, mid); setOutline(pts); return;
        }
      }
      return;
    }

    if (phase === "rooms" && mode === "select" && selectedRoomId) {
      const room = rooms.find((r) => r.id === selectedRoomId);
      if (!room) return;
      for (let i = 0; i < room.points.length; i++) {
        if (Math.hypot(world[0] - room.points[i][0], world[1] - room.points[i][1]) < 6 * px) {
          if (room.points.length <= 3) return;
          onChange(rooms.map((r) => r.id === room.id ? { ...r, points: room.points.filter((_, k) => k !== i) } : r)); return;
        }
      }
      for (let i = 0; i < room.points.length; i++) {
        const j = (i + 1) % room.points.length;
        if (distToSegment(world[0], world[1], room.points[i][0], room.points[i][1], room.points[j][0], room.points[j][1]) < 4 * px) {
          const mid: [number, number] = [snap((room.points[i][0] + room.points[j][0]) / 2), snap((room.points[i][1] + room.points[j][1]) / 2)];
          const newPts = [...room.points]; newPts.splice(j, 0, mid);
          onChange(rooms.map((r) => r.id === room.id ? { ...r, points: newPts } : r)); return;
        }
      }
    }
  }, [mode, phase, selectedRoomId, rooms, onChange, outline, screenToWorld, px]);

  // ESC to cancel drawing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode === "draw") { setDrawingPoints([]); setMode("select"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode]);

  // Help text
  const getHelpText = () => {
    if (mergeState) return "Klicke auf einen zweiten Raum zum Verschmelzen";
    if (phase === "outline") {
      if (mode === "draw") return "Zeichne die Außenwände deines Gebäudes · Klicke um Eckpunkte zu setzen · Doppelklick zum Schließen";
      return "Passe die Gebäudeform an · Punkte ziehen · Rechtsklick: Punkt einfügen/löschen";
    }
    if (mode === "draw") return "Zeichne Räume · Punkte rasten an bestehende Ecken ein · Doppelklick zum Schließen";
    return "Raum anklicken zum Auswählen · Punkte rasten an Nachbarräume ein · Mausrad: Zoom";
  };

  // Chatbot action handlers
  const chatCreateRoom = (name: string, width: number, depth: number, x?: number, y?: number) => {
    let cx = x ?? 0, cy = y ?? 0;
    if (x === undefined && y === undefined && outline.length >= 3) {
      const c = centroid(outline); cx = c[0]; cy = c[1];
      cx = snap(cx + rooms.length * 0.5); cy = snap(cy + rooms.length * 0.5);
    }
    const hw = width / 2, hd = depth / 2;
    const points: [number, number][] = [[snap(cx - hw), snap(cy - hd)], [snap(cx + hw), snap(cy - hd)], [snap(cx + hw), snap(cy + hd)], [snap(cx - hw), snap(cy + hd)]];
    const newRoom: RoomConfig = { id: crypto.randomUUID(), name, points, floorType: "parkett" };
    onChange([...rooms, newRoom]); setSelectedRoomId(newRoom.id); setMode("select");
  };

  const chatResizeRoom = (roomName: string, width?: number, depth?: number) => {
    const room = rooms.find((r) => r.name.toLowerCase() === roomName.toLowerCase());
    if (!room) return;
    const c = centroid(room.points);
    const xs = room.points.map((p) => p[0]), ys = room.points.map((p) => p[1]);
    const newW = width ?? (Math.max(...xs) - Math.min(...xs));
    const newD = depth ?? (Math.max(...ys) - Math.min(...ys));
    const hw = newW / 2, hd = newD / 2;
    const points: [number, number][] = [[snap(c[0] - hw), snap(c[1] - hd)], [snap(c[0] + hw), snap(c[1] - hd)], [snap(c[0] + hw), snap(c[1] + hd)], [snap(c[0] - hw), snap(c[1] + hd)]];
    onChange(rooms.map((r) => r.id === room.id ? { ...r, points } : r));
  };

  const chatMoveRoom = (roomName: string, x: number, y: number) => {
    const room = rooms.find((r) => r.name.toLowerCase() === roomName.toLowerCase());
    if (!room) return;
    const c = centroid(room.points);
    onChange(rooms.map((r) => r.id === room.id ? { ...r, points: room.points.map((p) => [snap(p[0] + x - c[0]), snap(p[1] + y - c[1])] as [number, number]) } : r));
  };

  const chatRenameRoom = (roomName: string, newName: string) => {
    const room = rooms.find((r) => r.name.toLowerCase() === roomName.toLowerCase());
    if (room) onChange(rooms.map((r) => r.id === room.id ? { ...r, name: newName } : r));
  };

  const chatDeleteRoom = (roomName: string) => {
    const room = rooms.find((r) => r.name.toLowerCase() === roomName.toLowerCase());
    if (room) { onChange(rooms.filter((r) => r.id !== room.id)); if (selectedRoomId === room.id) setSelectedRoomId(null); }
  };

  const chatSetFloorType = (roomName: string, floorType: string) => {
    const room = rooms.find((r) => r.name.toLowerCase() === roomName.toLowerCase());
    if (room && ["parkett", "fliesen", "laminat"].includes(floorType)) {
      onChange(rooms.map((r) => r.id === room.id ? { ...r, floorType: floorType as RoomConfig["floorType"] } : r));
    }
  };

  const addRoomByDimensions = (name: string, width: number, depth: number) => {
    let cx = 0, cy = 0;
    if (outline.length >= 3) { const c = centroid(outline); cx = c[0]; cy = c[1]; }
    cx = snap(cx + rooms.length * 0.5); cy = snap(cy + rooms.length * 0.5);
    const hw = width / 2, hd = depth / 2;
    const points: [number, number][] = [[snap(cx - hw), snap(cy - hd)], [snap(cx + hw), snap(cy - hd)], [snap(cx + hw), snap(cy + hd)], [snap(cx - hw), snap(cy + hd)]];
    const newRoom: RoomConfig = { id: crypto.randomUUID(), name, points, floorType: "parkett" };
    onChange([...rooms, newRoom]); setSelectedRoomId(newRoom.id); setMode("select");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col">
        <EditorToolbar
          phase={phase} mode={mode} helpText={getHelpText()} showSettings={showSettings}
          saving={saving} planName={planName}
          canUndo={canUndo} canRedo={canRedo}
          onBack={onBack} onSetMode={setMode} onClearDrawing={() => setDrawingPoints([])}
          onZoomIn={() => setZoom((z) => Math.min(200, z * 1.3))}
          onZoomOut={() => setZoom((z) => Math.max(5, z / 1.3))}
          onToggleSettings={() => setShowSettings(!showSettings)}
          onSave={onSave} onPlanNameChange={onPlanNameChange}
          onUndo={onUndo} onRedo={onRedo}
        />

        <Canvas2D
          ref={containerRef}
          svgRef={svgRef} viewBox={viewBox} vbX={vbX} vbY={vbY} vbW={vbW} vbH={vbH} zoom={zoom}
          phase={phase} mode={mode} outline={outline} rooms={rooms}
          drawingPoints={drawingPoints} mouseWorld={mouseWorld}
          selectedRoomId={selectedRoomId} selectedEdgeIdx={selectedEdgeIdx} mergeState={mergeState}
          gridLines={gridLines} snapToVertices={snapToVertices}
          onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp} onClick={handleClick} onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onSelectRoom={(id) => { setSelectedRoomId(id); setSelectedEdgeIdx(null); }}
          onSelectEdge={(roomId, idx) => { setSelectedRoomId(roomId); setSelectedEdgeIdx(idx); }}
        />

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

      <EditorSidebar
        phase={phase} building={building} outline={outline} rooms={rooms}
        selectedRoomId={selectedRoomId} selectedEdgeIdx={selectedEdgeIdx}
        mergeState={mergeState} showSettings={showSettings}
        onBuildingChange={onBuildingChange}
        onSetOutline={setOutline} onChangeRooms={onChange}
        onSelectRoom={setSelectedRoomId} onSelectEdge={setSelectedEdgeIdx}
        onSetPhase={setPhase} onSetMode={setMode}
        onSetShowSettings={setShowSettings} onSetMergeState={setMergeState}
        onMergeRooms={mergeRooms} onAutoRemoveSharedWalls={autoRemoveSharedWalls}
        onFinish={onFinish} onAddRoomByDimensions={addRoomByDimensions}
      />

      {phase === "rooms" && (
        <ChatPanel
          rooms={rooms} outline={outline}
          onCreateRoom={chatCreateRoom} onResizeRoom={chatResizeRoom}
          onMoveRoom={chatMoveRoom} onRenameRoom={chatRenameRoom}
          onDeleteRoom={chatDeleteRoom} onSetFloorType={chatSetFloorType}
        />
      )}
    </div>
  );
};

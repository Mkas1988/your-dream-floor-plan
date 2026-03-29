import { forwardRef } from "react";
import { RoomConfig } from "./types";
import { polygonArea, centroid, CLOSE_DIST, SNAP_VERTEX_DIST } from "./geometry";

const FLOOR_TYPES = [
  { value: "parkett", color: "hsl(35, 45%, 72%)" },
  { value: "fliesen", color: "hsl(220, 8%, 75%)" },
  { value: "laminat", color: "hsl(30, 20%, 66%)" },
] as const;

interface Canvas2DProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  viewBox: string;
  vbX: number;
  vbY: number;
  vbW: number;
  vbH: number;
  zoom: number;
  phase: "outline" | "rooms";
  mode: "select" | "draw";
  outline: [number, number][];
  rooms: RoomConfig[];
  drawingPoints: [number, number][];
  mouseWorld: [number, number] | null;
  selectedRoomId: string | null;
  selectedEdgeIdx: number | null;
  mergeState: null | { firstRoomId: string };
  gridLines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[];
  snapToVertices: (pt: [number, number], excludeRoomId?: string) => [number, number];
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onSelectRoom: (id: string) => void;
  onSelectEdge: (roomId: string, idx: number) => void;
}

const pointsToSvg = (pts: [number, number][]) => pts.map((p) => `${p[0]},${p[1]}`).join(" ");

export const Canvas2D = forwardRef<HTMLDivElement, Canvas2DProps>(({
  svgRef, viewBox, vbX, vbY, vbW, vbH, zoom,
  phase, mode, outline, rooms, drawingPoints, mouseWorld,
  selectedRoomId, selectedEdgeIdx, mergeState,
  gridLines, snapToVertices,
  onWheel, onMouseDown, onMouseMove, onMouseUp,
  onClick, onDoubleClick, onContextMenu,
  onSelectRoom, onSelectEdge,
}, containerRef) => {
  const px = 1 / zoom;
  const sw = (pixels: number) => pixels * px;
  const outlineArea = outline.length >= 3 ? polygonArea(outline) : 0;

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-muted/30">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={viewBox}
        className={mode === "draw" ? "cursor-crosshair" : "cursor-default"}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
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

        {/* Building outline */}
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
            {outline.map((pt, idx) => {
              const next = outline[(idx + 1) % outline.length];
              const len = Math.hypot(next[0] - pt[0], next[1] - pt[1]);
              const mx = (pt[0] + next[0]) / 2;
              const my = (pt[1] + next[1]) / 2;
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
            {phase === "outline" && (() => {
              const c = centroid(outline);
              return (
                <text x={c[0]} y={c[1]} textAnchor="middle" fontSize={sw(12)} fontWeight="500"
                  fill="hsl(220, 15%, 40%)" className="pointer-events-none select-none"
                >
                  {outlineArea.toFixed(1)} m²
                </text>
              );
            })()}
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
                      onSelectEdge(room.id, idx);
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
                const isEdgeSel = selectedEdgeIdx === idx;
                return <text key={`rlen-${idx}`} x={mx} y={my - sw(5)} textAnchor="middle" fontSize={sw(isEdgeSel ? 10 : 8)} fontWeight={isEdgeSel ? "700" : "500"} fill="hsl(var(--primary))" className="pointer-events-none select-none">{len.toFixed(2)}m</text>;
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

        {/* Crosshair + snap indicator */}
        {mode === "draw" && mouseWorld && (() => {
          const snapped = snapToVertices(mouseWorld);
          const isSnapping = snapped[0] !== mouseWorld[0] || snapped[1] !== mouseWorld[1];
          return (
            <g>
              <g opacity={0.25}>
                <line x1={mouseWorld[0]} y1={vbY} x2={mouseWorld[0]} y2={vbY + vbH} stroke="hsl(var(--primary))" strokeWidth={sw(0.5)} />
                <line x1={vbX} y1={mouseWorld[1]} x2={vbX + vbW} y2={mouseWorld[1]} stroke="hsl(var(--primary))" strokeWidth={sw(0.5)} />
                <text x={mouseWorld[0] + sw(8)} y={mouseWorld[1] - sw(8)} fontSize={sw(9)} fill="hsl(var(--primary))" className="select-none">
                  {mouseWorld[0].toFixed(2)}, {mouseWorld[1].toFixed(2)}
                </text>
              </g>
              {isSnapping && (
                <g>
                  <circle cx={snapped[0]} cy={snapped[1]} r={sw(8)} fill="none" stroke="hsl(var(--primary))" strokeWidth={sw(2)} opacity={0.7} />
                  <circle cx={snapped[0]} cy={snapped[1]} r={sw(3)} fill="hsl(var(--primary))" opacity={0.8} />
                  <text x={snapped[0] + sw(12)} y={snapped[1] - sw(4)} fontSize={sw(8)} fill="hsl(var(--primary))" fontWeight="600" className="select-none pointer-events-none">SNAP</text>
                </g>
              )}
            </g>
          );
        })()}
      </svg>
    </div>
  );
});

Canvas2D.displayName = "Canvas2D";

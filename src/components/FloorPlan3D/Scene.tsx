import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html } from "@react-three/drei";
import { walls, roomLabels } from "./constants";
import { Wall } from "./Wall";
import { Floor } from "./Floor";
import { FurniturePiece } from "./FurniturePiece";
import { FurnitureItem } from "./types";
import * as THREE from "three";

interface SceneProps {
  furniture: FurnitureItem[];
  selectedId: string | null;
  selectedCatalogType: string | null;
  onSelectFurniture: (id: string) => void;
  onMoveFurniture: (id: string, position: [number, number, number]) => void;
  onPlaceFurniture: (point: THREE.Vector3) => void;
}

const RoomLabels = () => (
  <>
    {roomLabels.map((label) => (
      <Html
        key={label.text}
        position={[label.position[0], 0.05, label.position[1]]}
        center
        distanceFactor={10}
        style={{ pointerEvents: "none" }}
      >
        <div className="text-center select-none">
          <div className="text-xs font-medium text-foreground/60">{label.text}</div>
          <div className="text-[10px] text-muted-foreground">{label.area}</div>
        </div>
      </Html>
    ))}
  </>
);

export const Scene = ({
  furniture,
  selectedId,
  selectedCatalogType,
  onSelectFurniture,
  onMoveFurniture,
  onPlaceFurniture,
}: SceneProps) => {
  return (
    <Canvas shadows style={{ background: "hsl(220, 20%, 95%)" }}>
      <PerspectiveCamera makeDefault position={[0, 12, 10]} fov={50} />
      <OrbitControls
        maxPolarAngle={Math.PI / 2.1}
        minDistance={3}
        maxDistance={25}
        target={[0, 0, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[8, 12, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 8, -3]} intensity={0.3} />

      {/* Floor */}
      <Floor onFloorClick={onPlaceFurniture} />

      {/* Walls */}
      {walls.map((wall, i) => (
        <Wall key={i} wall={wall} />
      ))}

      {/* Room Labels */}
      <RoomLabels />

      {/* Furniture */}
      {furniture.map((item) => (
        <FurniturePiece
          key={item.id}
          item={item}
          isSelected={selectedId === item.id}
          onSelect={onSelectFurniture}
          onMove={onMoveFurniture}
        />
      ))}

      {/* Grid helper */}
      <gridHelper args={[20, 20, "hsl(220, 10%, 80%)", "hsl(220, 10%, 90%)"]} position={[0, 0.01, 0]} />
    </Canvas>
  );
};

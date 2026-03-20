import { useRef, useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { FurnitureItem } from "./types";

interface FurniturePieceProps {
  item: FurnitureItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, position: [number, number, number]) => void;
}

export const FurniturePiece = ({ item, isSelected, onSelect, onMove }: FurniturePieceProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect(item.id);
    setIsDragging(true);
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();
    // Project to floor plane
    const point = e.point;
    onMove(item.id, [point.x, item.position[1], point.z]);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Special shapes for different furniture types
  const renderShape = () => {
    switch (item.type) {
      case "plant":
        return (
          <group>
            {/* pot */}
            <mesh position={[0, -item.size[1] / 2 + 0.15, 0]}>
              <cylinderGeometry args={[0.15, 0.12, 0.3, 8]} />
              <meshStandardMaterial color="hsl(15, 50%, 45%)" />
            </mesh>
            {/* foliage */}
            <mesh position={[0, 0.1, 0]}>
              <sphereGeometry args={[0.2, 8, 8]} />
              <meshStandardMaterial color={item.color} />
            </mesh>
          </group>
        );
      case "rug":
        return (
          <mesh>
            <boxGeometry args={item.size} />
            <meshStandardMaterial color={item.color} transparent opacity={0.7} />
          </mesh>
        );
      default:
        return (
          <mesh>
            <boxGeometry args={item.size} />
            <meshStandardMaterial color={item.color} />
          </mesh>
        );
    }
  };

  return (
    <group
      position={item.position}
      rotation={[0, item.rotation, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <group ref={meshRef as any}>
        {renderShape()}
        {isSelected && (
          <mesh position={[0, item.size[1] / 2 + 0.02, 0]}>
            <boxGeometry args={[item.size[0] + 0.08, 0.02, item.size[2] + 0.08]} />
            <meshStandardMaterial color="hsl(200, 80%, 50%)" transparent opacity={0.5} />
          </mesh>
        )}
      </group>
    </group>
  );
};

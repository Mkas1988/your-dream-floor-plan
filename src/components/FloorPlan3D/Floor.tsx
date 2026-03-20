import { useRef } from "react";
import * as THREE from "three";

interface FloorProps {
  onFloorClick: (point: THREE.Vector3) => void;
}

export const Floor = ({ onFloorClick }: FloorProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onFloorClick(e.point);
      }}
    >
      <planeGeometry args={[10, 8]} />
      <meshStandardMaterial color="hsl(35, 40%, 75%)" />
    </mesh>
  );
};

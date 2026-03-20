interface FloorProps {
  onFloorClick: (point: THREE.Vector3) => void;
}

import * as THREE from "three";

export const Floor = ({ onFloorClick }: FloorProps) => {
  return (
    <group>
      {/* Main floor - wood color */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onFloorClick(e.point);
        }}
      >
        <planeGeometry args={[10.5, 7.5]} />
        <meshStandardMaterial color="hsl(35, 45%, 72%)" />
      </mesh>

      {/* Kitchen floor - tile color */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-3.5, 0.005, 2.45]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onFloorClick(e.point);
        }}
      >
        <planeGeometry args={[3.5, 2.6]} />
        <meshStandardMaterial color="hsl(220, 8%, 65%)" />
      </mesh>

      {/* Bathroom floor - tile color */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[3.25, 0.005, 0.15]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onFloorClick(e.point);
        }}
      >
        <planeGeometry args={[1.0, 1.8]} />
        <meshStandardMaterial color="hsl(200, 10%, 78%)" />
      </mesh>

      {/* Ground plane outside the building */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[25, 20]} />
        <meshStandardMaterial color="hsl(120, 15%, 78%)" />
      </mesh>
    </group>
  );
};

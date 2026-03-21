import * as THREE from "three";
import { FloorTile } from "./types";

interface FloorProps {
  onFloorClick: (point: THREE.Vector3) => void;
  floorTiles: FloorTile[];
}

export const Floor = ({ onFloorClick, floorTiles }: FloorProps) => {
  return (
    <group>
      {/* Room floor tiles */}
      {floorTiles.map((tile, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[tile.position[0], 0.005 + i * 0.001, tile.position[1]]}
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            onFloorClick(e.point);
          }}
        >
          <planeGeometry args={[tile.size[0], tile.size[1]]} />
          <meshStandardMaterial color={tile.color} />
        </mesh>
      ))}

      {/* Main floor base */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onFloorClick(e.point);
        }}
      >
        <planeGeometry args={[8, 9.5]} />
        <meshStandardMaterial color="hsl(35, 40%, 70%)" />
      </mesh>

      {/* Ground plane outside */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial color="hsl(120, 15%, 78%)" />
      </mesh>
    </group>
  );
};

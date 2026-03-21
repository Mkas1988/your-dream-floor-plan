import { useMemo } from "react";
import * as THREE from "three";
import { FloorTile } from "./types";

interface FloorProps {
  onFloorClick: (point: THREE.Vector3) => void;
  floorTiles: FloorTile[];
  buildingWidth?: number;
  buildingDepth?: number;
}

const PolygonFloor = ({ tile, index, onClick }: { tile: FloorTile; index: number; onClick: (e: any) => void }) => {
  const geometry = useMemo(() => {
    if (!tile.polygon || tile.polygon.length < 3) return null;
    const shape = new THREE.Shape();
    // SVG coords: X stays X, Z becomes Y in Shape (we'll rotate to XZ plane)
    shape.moveTo(tile.polygon[0][0], -tile.polygon[0][1]);
    for (let i = 1; i < tile.polygon.length; i++) {
      shape.lineTo(tile.polygon[i][0], -tile.polygon[i][1]);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [tile.polygon]);

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.005 + index * 0.001, 0]}
      receiveShadow
      onClick={onClick}
    >
      <meshStandardMaterial color={tile.color} />
    </mesh>
  );
};

export const Floor = ({ onFloorClick, floorTiles, buildingWidth = 9.5, buildingDepth = 8.0 }: FloorProps) => {
  const handleClick = (e: any) => {
    e.stopPropagation();
    onFloorClick(e.point);
  };

  return (
    <group>
      {/* Main floor base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow onClick={handleClick}>
        <planeGeometry args={[buildingWidth, buildingDepth]} />
        <meshStandardMaterial color="hsl(35, 40%, 70%)" />
      </mesh>

      {/* Room floor tiles */}
      {floorTiles.map((tile, i) =>
        tile.polygon ? (
          <PolygonFloor key={i} tile={tile} index={i} onClick={handleClick} />
        ) : (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[tile.position[0], 0.005 + i * 0.001, tile.position[1]]}
            receiveShadow
            onClick={handleClick}
          >
            <planeGeometry args={[tile.size[0], tile.size[1]]} />
            <meshStandardMaterial color={tile.color} />
          </mesh>
        )
      )}

      {/* Ground plane outside */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial color="hsl(120, 15%, 78%)" />
      </mesh>
    </group>
  );
};

import { useMemo } from "react";
import { WallSegment } from "./types";

interface WallProps {
  wall: WallSegment;
}

export const Wall = ({ wall }: WallProps) => {
  const { position, rotation, length } = useMemo(() => {
    const dx = wall.end[0] - wall.start[0];
    const dz = wall.end[1] - wall.start[1];
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    const cx = (wall.start[0] + wall.end[0]) / 2;
    const cz = (wall.start[1] + wall.end[1]) / 2;
    return {
      position: [cx, wall.height / 2, cz] as [number, number, number],
      rotation: -angle,
      length: len,
    };
  }, [wall]);

  if (wall.hasDoor) {
    // Render wall with a door gap in the middle
    const doorWidth = 0.9;
    const sideLen = (length - doorWidth) / 2;
    const doorHeight = 2.1;
    const aboveDoorH = wall.height - doorHeight;
    const dx = wall.end[0] - wall.start[0];
    const dz = wall.end[1] - wall.start[1];
    const dirX = dx / length;
    const dirZ = dz / length;

    const leftCenter: [number, number, number] = [
      wall.start[0] + dirX * sideLen / 2,
      wall.height / 2,
      wall.start[1] + dirZ * sideLen / 2,
    ];
    const rightCenter: [number, number, number] = [
      wall.end[0] - dirX * sideLen / 2,
      wall.height / 2,
      wall.end[1] - dirZ * sideLen / 2,
    ];
    const aboveDoor: [number, number, number] = [
      (wall.start[0] + wall.end[0]) / 2,
      doorHeight + aboveDoorH / 2,
      (wall.start[1] + wall.end[1]) / 2,
    ];

    return (
      <group>
        <mesh position={leftCenter} rotation={[0, rotation, 0]} castShadow receiveShadow>
          <boxGeometry args={[sideLen, wall.height, wall.thickness]} />
          <meshStandardMaterial color="hsl(220, 10%, 85%)" />
        </mesh>
        <mesh position={rightCenter} rotation={[0, rotation, 0]} castShadow receiveShadow>
          <boxGeometry args={[sideLen, wall.height, wall.thickness]} />
          <meshStandardMaterial color="hsl(220, 10%, 85%)" />
        </mesh>
        {aboveDoorH > 0 && (
          <mesh position={aboveDoor} rotation={[0, rotation, 0]} castShadow receiveShadow>
            <boxGeometry args={[doorWidth, aboveDoorH, wall.thickness]} />
            <meshStandardMaterial color="hsl(220, 10%, 85%)" />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <mesh position={position} rotation={[0, rotation, 0]} castShadow receiveShadow>
      <boxGeometry args={[length, wall.height, wall.thickness]} />
      <meshStandardMaterial color="hsl(220, 10%, 85%)" />
    </mesh>
  );
};

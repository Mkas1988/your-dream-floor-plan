import { useState, useCallback, useMemo } from "react";
import { Scene } from "./Scene";
import { Sidebar } from "./Sidebar";
import { WizardStep1 } from "./WizardStep1";
import { WizardStep2 } from "./WizardStep2";
import { FurnitureItem, BuildingConfig, RoomConfig } from "./types";
import { furnitureCatalog } from "./constants";
import { generateWalls, generateFloorTiles, generateRoomLabels } from "./generatePlan";
import * as THREE from "three";
import { ArrowLeft } from "lucide-react";

let idCounter = 0;

type WizardStep = "dimensions" | "rooms" | "3d";

export const FloorPlanEditor = () => {
  const [step, setStep] = useState<WizardStep>("dimensions");
  const [building, setBuilding] = useState<BuildingConfig>({
    width: 9.5,
    depth: 8.0,
    wallThickness: 0.24,
    wallHeight: 2.6,
  });
  const [rooms, setRooms] = useState<RoomConfig[]>([]);
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCatalogType, setSelectedCatalogType] = useState<string | null>(null);

  // Generate 3D data from wizard config
  const walls = useMemo(() => generateWalls(building, rooms), [building, rooms]);
  const floorTiles = useMemo(() => generateFloorTiles(building, rooms), [building, rooms]);
  const roomLabels = useMemo(() => generateRoomLabels(building, rooms), [building, rooms]);

  const handlePlaceFurniture = useCallback(
    (point: THREE.Vector3) => {
      if (!selectedCatalogType) return;
      const catalogItem = furnitureCatalog.find((c) => c.type === selectedCatalogType);
      if (!catalogItem) return;

      const newItem: FurnitureItem = {
        id: `furniture-${++idCounter}`,
        type: catalogItem.type,
        label: catalogItem.label,
        position: [point.x, catalogItem.size[1] / 2, point.z],
        rotation: 0,
        size: catalogItem.size,
        color: catalogItem.color,
      };

      setFurniture((prev) => [...prev, newItem]);
      setSelectedId(newItem.id);
    },
    [selectedCatalogType]
  );

  const handleMoveFurniture = useCallback((id: string, position: [number, number, number]) => {
    setFurniture((prev) =>
      prev.map((f) => (f.id === id ? { ...f, position } : f))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setFurniture((prev) => prev.filter((f) => f.id !== id));
    setSelectedId(null);
  }, []);

  const handleRotate = useCallback((id: string) => {
    setFurniture((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, rotation: f.rotation + Math.PI / 4 } : f
      )
    );
  }, []);

  if (step === "dimensions") {
    return (
      <WizardStep1
        config={building}
        onChange={setBuilding}
        onNext={() => setStep("rooms")}
      />
    );
  }

  if (step === "rooms") {
    return (
      <WizardStep2
        building={building}
        rooms={rooms}
        onChange={setRooms}
        onBack={() => setStep("dimensions")}
        onFinish={() => setStep("3d")}
      />
    );
  }

  // 3D view
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 relative">
        <Scene
          furniture={furniture}
          selectedId={selectedId}
          selectedCatalogType={selectedCatalogType}
          onSelectFurniture={setSelectedId}
          onMoveFurniture={handleMoveFurniture}
          onPlaceFurniture={handlePlaceFurniture}
          walls={walls}
          roomLabels={roomLabels}
          floorTiles={floorTiles}
          buildingWidth={building.width}
          buildingDepth={building.depth}
        />

        <div className="absolute top-4 left-4 flex items-center gap-2">
          <button
            onClick={() => setStep("rooms")}
            className="p-2.5 bg-card/90 backdrop-blur-sm border border-border rounded-xl shadow-lg hover:bg-accent/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg">
            <h1 className="text-base font-semibold text-foreground">3D Planer</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {building.width}×{building.depth}m · {rooms.length} Räume · Mausrad: Zoom · Rechtsklick: Drehen
            </p>
          </div>
        </div>

        {selectedCatalogType && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2">
            Klicke auf den Boden um{" "}
            {furnitureCatalog.find((c) => c.type === selectedCatalogType)?.label} zu platzieren
          </div>
        )}
      </div>

      <Sidebar
        selectedCatalogType={selectedCatalogType}
        onSelectCatalogType={setSelectedCatalogType}
        furniture={furniture}
        selectedId={selectedId}
        onDelete={handleDelete}
        onRotate={handleRotate}
      />
    </div>
  );
};

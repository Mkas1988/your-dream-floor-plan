import { useState, useCallback, useMemo } from "react";
import { Scene } from "./Scene";
import { Sidebar } from "./Sidebar";
import { FurnitureItem, FloorId } from "./types";
import { furnitureCatalog, floors } from "./constants";
import * as THREE from "three";

let idCounter = 0;

export const FloorPlanEditor = () => {
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCatalogType, setSelectedCatalogType] = useState<string | null>(null);
  const [currentFloor, setCurrentFloor] = useState<FloorId>("EG");

  const floorData = useMemo(() => floors.find((f) => f.id === currentFloor)!, [currentFloor]);
  const floorFurniture = useMemo(() => furniture.filter((f) => f.floor === currentFloor), [furniture, currentFloor]);

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
        floor: currentFloor,
      };

      setFurniture((prev) => [...prev, newItem]);
      setSelectedId(newItem.id);
    },
    [selectedCatalogType, currentFloor]
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

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Scene
          floorData={floorData}
          furniture={floorFurniture}
          selectedId={selectedId}
          selectedCatalogType={selectedCatalogType}
          onSelectFurniture={setSelectedId}
          onMoveFurniture={handleMoveFurniture}
          onPlaceFurniture={handlePlaceFurniture}
        />

        {/* Floor tabs */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg">
            <h1 className="text-base font-semibold text-foreground">Grundriss — 3D Planer</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rechte Doppelhaushälfte · 8,00 × 9,50 m
            </p>
          </div>
          <div className="flex bg-card/90 backdrop-blur-sm border border-border rounded-xl shadow-lg overflow-hidden">
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => {
                  setCurrentFloor(floor.id);
                  setSelectedId(null);
                }}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  currentFloor === floor.id
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {floor.id}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground bg-card/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border shadow">
            {floorData.label}
          </div>
        </div>

        {selectedCatalogType && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2">
            Klicke auf den Boden um{" "}
            {furnitureCatalog.find((c) => c.type === selectedCatalogType)?.label} zu platzieren
          </div>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar
        selectedCatalogType={selectedCatalogType}
        onSelectCatalogType={setSelectedCatalogType}
        furniture={floorFurniture}
        selectedId={selectedId}
        onDelete={handleDelete}
        onRotate={handleRotate}
      />
    </div>
  );
};

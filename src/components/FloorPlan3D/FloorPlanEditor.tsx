import { useState, useCallback } from "react";
import { Scene } from "./Scene";
import { Sidebar } from "./Sidebar";
import { FurnitureItem } from "./types";
import { furnitureCatalog } from "./constants";
import * as THREE from "three";

let idCounter = 0;

export const FloorPlanEditor = () => {
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCatalogType, setSelectedCatalogType] = useState<string | null>(null);

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
        />

        <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg">
          <h1 className="text-base font-semibold text-foreground">Erdgeschoss — 3D Planer</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rechte DHH · 9,50 × 8,00 m · Mausrad: Zoom · Rechtsklick: Drehen
          </p>
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

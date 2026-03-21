import { useState, useCallback, useMemo, useEffect } from "react";
import { Scene } from "./Scene";
import { Sidebar } from "./Sidebar";
import { WizardStep2 } from "./WizardStep2";
import { FurnitureItem, BuildingConfig, RoomConfig } from "./types";
import { furnitureCatalog } from "./constants";
import { generateWalls, generateFloorTiles, generateRoomLabels, computeBuildingBounds } from "./generatePlan";
import { supabase } from "@/integrations/supabase/client";
import * as THREE from "three";
import { ArrowLeft, Save, FolderOpen, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

let idCounter = 0;

type WizardStep = "home" | "rooms" | "3d";

interface SavedPlan {
  id: string;
  name: string;
  building_config: BuildingConfig;
  rooms: RoomConfig[];
  furniture: FurnitureItem[];
  updated_at: string;
}

export const FloorPlanEditor = () => {
  const [step, setStep] = useState<WizardStep>("home");
  const [planId, setPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("Mein Grundriss");
  const [building, setBuilding] = useState<BuildingConfig>({
    wallThickness: 0.24,
    wallHeight: 2.6,
  });
  const [rooms, setRooms] = useState<RoomConfig[]>([]);
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCatalogType, setSelectedCatalogType] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("floor_plans")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast.error("Fehler beim Laden: " + error.message);
    else setSavedPlans((data || []).map((d) => ({
      id: d.id, name: d.name,
      building_config: d.building_config as unknown as BuildingConfig,
      rooms: d.rooms as unknown as RoomConfig[],
      furniture: d.furniture as unknown as FurnitureItem[],
      updated_at: d.updated_at,
    })));
    setLoading(false);
  };

  const savePlan = async () => {
    setSaving(true);
    const payload = {
      name: planName,
      building_config: JSON.parse(JSON.stringify(building)),
      rooms: JSON.parse(JSON.stringify(rooms)),
      furniture: JSON.parse(JSON.stringify(furniture)),
    };
    let error;
    if (planId) {
      ({ error } = await supabase.from("floor_plans").update(payload).eq("id", planId));
    } else {
      const result = await supabase.from("floor_plans").insert(payload).select("id").single();
      error = result.error;
      if (result.data) setPlanId(result.data.id);
    }
    if (error) toast.error("Fehler beim Speichern: " + error.message);
    else { toast.success("Grundriss gespeichert!"); loadPlans(); }
    setSaving(false);
  };

  const loadPlan = (plan: SavedPlan) => {
    setPlanId(plan.id); setPlanName(plan.name);
    setBuilding(plan.building_config); setRooms(plan.rooms); setFurniture(plan.furniture);
    setStep("3d");
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from("floor_plans").delete().eq("id", id);
    if (error) toast.error("Fehler: " + error.message);
    else { toast.success("Gelöscht"); if (planId === id) { setPlanId(null); setPlanName("Mein Grundriss"); } loadPlans(); }
  };

  const startNew = () => {
    setPlanId(null); setPlanName("Mein Grundriss");
    setBuilding({ wallThickness: 0.24, wallHeight: 2.6 });
    setRooms([]); setFurniture([]);
    setStep("rooms");
  };

  const bounds = useMemo(() => computeBuildingBounds(rooms), [rooms]);
  const walls = useMemo(() => generateWalls(building, rooms), [building, rooms]);
  const floorTiles = useMemo(() => generateFloorTiles(building, rooms), [building, rooms]);
  const roomLabels = useMemo(() => generateRoomLabels(building, rooms), [building, rooms]);

  const handlePlaceFurniture = useCallback((point: THREE.Vector3) => {
    if (!selectedCatalogType) return;
    const catalogItem = furnitureCatalog.find((c) => c.type === selectedCatalogType);
    if (!catalogItem) return;
    const newItem: FurnitureItem = {
      id: `furniture-${++idCounter}`, type: catalogItem.type, label: catalogItem.label,
      position: [point.x, catalogItem.size[1] / 2, point.z], rotation: 0, size: catalogItem.size, color: catalogItem.color,
    };
    setFurniture((prev) => [...prev, newItem]); setSelectedId(newItem.id);
  }, [selectedCatalogType]);

  const handleMoveFurniture = useCallback((id: string, position: [number, number, number]) => {
    setFurniture((prev) => prev.map((f) => (f.id === id ? { ...f, position } : f)));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setFurniture((prev) => prev.filter((f) => f.id !== id)); setSelectedId(null);
  }, []);

  const handleRotate = useCallback((id: string) => {
    setFurniture((prev) => prev.map((f) => f.id === id ? { ...f, rotation: f.rotation + Math.PI / 4 } : f));
  }, []);

  if (step === "home") {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="w-full max-w-lg mx-auto p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">3D Grundriss Planer</h1>
              <p className="text-sm text-muted-foreground">Erstelle und verwalte deine Grundrisse</p>
            </div>
          </div>
          <button onClick={startNew} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors mb-6">
            <Plus className="w-4 h-4" /> Neuen Grundriss erstellen
          </button>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : savedPlans.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Gespeicherte Grundrisse</h2>
              {savedPlans.map((plan) => (
                <div key={plan.id} className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors cursor-pointer group" onClick={() => loadPlan(plan)}>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{plan.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {plan.rooms.length} Räume · {new Date(plan.updated_at).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Noch keine gespeicherten Grundrisse.</p>
          )}
        </div>
      </div>
    );
  }

  if (step === "rooms") {
    return (
      <WizardStep2
        building={building}
        onBuildingChange={setBuilding}
        rooms={rooms}
        onChange={setRooms}
        onBack={() => setStep("home")}
        onFinish={() => setStep("3d")}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 relative">
        <Scene
          furniture={furniture} selectedId={selectedId} selectedCatalogType={selectedCatalogType}
          onSelectFurniture={setSelectedId} onMoveFurniture={handleMoveFurniture} onPlaceFurniture={handlePlaceFurniture}
          walls={walls} roomLabels={roomLabels} floorTiles={floorTiles}
          buildingWidth={bounds.width + 2} buildingDepth={bounds.depth + 2}
        />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <button onClick={() => setStep("rooms")} className="p-2.5 bg-card/90 backdrop-blur-sm border border-border rounded-xl shadow-lg hover:bg-accent/10 transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg">
            <input value={planName} onChange={(e) => setPlanName(e.target.value)} className="text-base font-semibold text-foreground bg-transparent border-none outline-none w-48" placeholder="Grundriss Name" />
            <p className="text-xs text-muted-foreground mt-0.5">{rooms.length} Räume · {bounds.width.toFixed(1)}×{bounds.depth.toFixed(1)}m</p>
          </div>
          <button onClick={savePlan} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl shadow-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
          </button>
          <button onClick={() => setStep("home")} className="px-3 py-2.5 bg-card/90 backdrop-blur-sm border border-border rounded-xl shadow-lg text-xs font-medium text-foreground hover:bg-accent/10 transition-colors">
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>
        {selectedCatalogType && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2">
            Klicke auf den Boden um {furnitureCatalog.find((c) => c.type === selectedCatalogType)?.label} zu platzieren
          </div>
        )}
      </div>
      <Sidebar selectedCatalogType={selectedCatalogType} onSelectCatalogType={setSelectedCatalogType} furniture={furniture} selectedId={selectedId} onDelete={handleDelete} onRotate={handleRotate} />
    </div>
  );
};

import { furnitureCatalog } from "./constants";
import { FurnitureItem } from "./types";
import { Trash2, RotateCw } from "lucide-react";

interface SidebarProps {
  selectedCatalogType: string | null;
  onSelectCatalogType: (type: string | null) => void;
  furniture: FurnitureItem[];
  selectedId: string | null;
  onDelete: (id: string) => void;
  onRotate: (id: string) => void;
}

export const Sidebar = ({
  selectedCatalogType,
  onSelectCatalogType,
  furniture,
  selectedId,
  onDelete,
  onRotate,
}: SidebarProps) => {
  const selectedItem = furniture.find((f) => f.id === selectedId);

  return (
    <div className="w-72 bg-card border-l border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Möbel-Katalog</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Wähle ein Möbelstück, dann klicke auf den Boden
        </p>
      </div>

      {/* Catalog */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {furnitureCatalog.map((item) => (
            <button
              key={item.type}
              onClick={() =>
                onSelectCatalogType(selectedCatalogType === item.type ? null : item.type)
              }
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all duration-150 active:scale-[0.97] ${
                selectedCatalogType === item.type
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-background hover:border-primary/40 hover:shadow-sm"
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-medium text-foreground">{item.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {item.size[0]}×{item.size[2]}m
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected furniture controls */}
      {selectedItem && (
        <div className="p-4 border-t border-border bg-secondary/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {furnitureCatalog.find((c) => c.type === selectedItem.type)?.icon}{" "}
              {furnitureCatalog.find((c) => c.type === selectedItem.type)?.label}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onRotate(selectedItem.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-background border border-border text-xs font-medium text-foreground hover:bg-accent/10 transition-colors active:scale-[0.97]"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Drehen
            </button>
            <button
              onClick={() => onDelete(selectedItem.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors active:scale-[0.97]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Löschen
            </button>
          </div>
        </div>
      )}

      {/* Placed items count */}
      <div className="p-3 border-t border-border bg-muted/50">
        <span className="text-xs text-muted-foreground">
          {furniture.length} Möbelstück{furniture.length !== 1 ? "e" : ""} platziert
        </span>
      </div>
    </div>
  );
};

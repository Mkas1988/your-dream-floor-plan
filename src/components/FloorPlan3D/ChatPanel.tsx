import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, X, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoomConfig } from "./types";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RoomSummary {
  name: string;
  width: number;
  depth: number;
  cx: number;
  cy: number;
  floorType: string;
}

interface ChatAction {
  action: string;
  message: string;
  name?: string;
  room_name?: string;
  new_name?: string;
  width?: number;
  depth?: number;
  x?: number;
  y?: number;
  floor_type?: string;
  error?: string;
}

interface ChatPanelProps {
  rooms: RoomConfig[];
  outline: [number, number][];
  onCreateRoom: (name: string, width: number, depth: number, x?: number, y?: number) => void;
  onResizeRoom: (roomName: string, width?: number, depth?: number) => void;
  onMoveRoom: (roomName: string, x: number, y: number) => void;
  onRenameRoom: (roomName: string, newName: string) => void;
  onDeleteRoom: (roomName: string) => void;
  onSetFloorType: (roomName: string, floorType: string) => void;
}

function polygonArea(pts: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return Math.abs(area) / 2;
}

function centroid(pts: [number, number][]): [number, number] {
  const n = pts.length;
  return [
    pts.reduce((s, p) => s + p[0], 0) / n,
    pts.reduce((s, p) => s + p[1], 0) / n,
  ];
}

function roomToSummary(room: RoomConfig): RoomSummary {
  const c = centroid(room.points);
  const xs = room.points.map((p) => p[0]);
  const ys = room.points.map((p) => p[1]);
  return {
    name: room.name,
    width: Math.max(...xs) - Math.min(...xs),
    depth: Math.max(...ys) - Math.min(...ys),
    cx: c[0],
    cy: c[1],
    floorType: room.floorType,
  };
}

export const ChatPanel = ({
  rooms,
  outline,
  onCreateRoom,
  onResizeRoom,
  onMoveRoom,
  onRenameRoom,
  onDeleteRoom,
  onSetFloorType,
}: ChatPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hallo! Ich helfe dir beim Grundriss. Sag mir z.B. \"Erstelle eine Küche 3×4m\" oder \"Mache das Wohnzimmer 1m breiter\"." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const executeAction = (action: ChatAction) => {
    switch (action.action) {
      case "create_room":
        if (action.name && action.width && action.depth) {
          onCreateRoom(action.name, action.width, action.depth, action.x, action.y);
          toast.success(`Raum "${action.name}" erstellt`);
        }
        break;
      case "resize_room":
        if (action.room_name) {
          onResizeRoom(action.room_name, action.width, action.depth);
          toast.success(`"${action.room_name}" angepasst`);
        }
        break;
      case "move_room":
        if (action.room_name && action.x !== undefined && action.y !== undefined) {
          onMoveRoom(action.room_name, action.x, action.y);
          toast.success(`"${action.room_name}" verschoben`);
        }
        break;
      case "rename_room":
        if (action.room_name && action.new_name) {
          onRenameRoom(action.room_name, action.new_name);
          toast.success(`"${action.room_name}" → "${action.new_name}"`);
        }
        break;
      case "delete_room":
        if (action.room_name) {
          onDeleteRoom(action.room_name);
          toast.success(`"${action.room_name}" gelöscht`);
        }
        break;
      case "set_floor_type":
        if (action.room_name && action.floor_type) {
          onSetFloorType(action.room_name, action.floor_type);
          toast.success(`Bodenbelag von "${action.room_name}" geändert`);
        }
        break;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const roomSummaries = rooms.map(roomToSummary);
      const { data, error } = await supabase.functions.invoke("floor-plan-chat", {
        body: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          rooms: roomSummaries,
        },
      });

      if (error) throw error;

      const action = data as ChatAction;
      if (action.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Fehler: ${action.error}` }]);
      } else {
        if (action.action !== "info") {
          executeAction(action);
        }
        setMessages((prev) => [...prev, { role: "assistant", content: action.message }]);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Fehler bei der Verarbeitung. Bitte versuche es nochmal." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center hover:scale-105 active:scale-95"
        title="KI-Assistent"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">KI-Assistent</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-center">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-sm">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="z.B. Erstelle Küche 3×4m..."
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

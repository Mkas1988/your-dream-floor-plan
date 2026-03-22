import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist ein Assistent für einen 2D-Grundriss-Editor. Du hilfst dem Benutzer, Räume zu erstellen und zu bearbeiten.

Du hast Zugriff auf die aktuelle Raumliste und kannst folgende Aktionen ausführen:

AKTIONEN (als JSON im tool call):
1. "create_room" - Neuen Raum erstellen
   - name: string (z.B. "Küche")
   - width: number (Breite in Metern)
   - depth: number (Tiefe in Metern)
   - x?: number (optionale X-Position, default: 0)
   - y?: number (optionale Y-Position, default: 0)

2. "resize_room" - Raumgröße ändern
   - room_name: string (Name des Raums)
   - width?: number (neue Breite)
   - depth?: number (neue Tiefe)

3. "move_room" - Raum verschieben
   - room_name: string
   - x: number (neue X-Position)
   - y: number (neue Y-Position)

4. "rename_room" - Raum umbenennen
   - room_name: string (aktueller Name)
   - new_name: string

5. "delete_room" - Raum löschen
   - room_name: string

6. "set_floor_type" - Bodenbelag ändern
   - room_name: string
   - floor_type: "parkett" | "fliesen" | "laminat"

7. "info" - Nur Text-Antwort, keine Aktion

Antworte IMMER freundlich auf Deutsch. Wenn der Benutzer einen Raum erstellen will, verwende create_room. Bei Änderungen verwende die passende Aktion.

Aktuelle Räume werden dir als Kontext mitgegeben.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, rooms } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const roomContext = rooms && rooms.length > 0
      ? `\n\nAktuelle Räume:\n${rooms.map((r: any) => `- ${r.name}: ${r.width?.toFixed(1) || "?"}×${r.depth?.toFixed(1) || "?"}m bei Position (${r.cx?.toFixed(1)}, ${r.cy?.toFixed(1)}), Boden: ${r.floorType}`).join("\n")}`
      : "\n\nEs gibt noch keine Räume.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + roomContext },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "floor_plan_action",
              description: "Execute an action on the floor plan (create, resize, move, rename, delete rooms)",
              parameters: {
                type: "object",
                properties: {
                  action: {
                    type: "string",
                    enum: ["create_room", "resize_room", "move_room", "rename_room", "delete_room", "set_floor_type", "info"],
                  },
                  name: { type: "string", description: "Room name for create_room" },
                  room_name: { type: "string", description: "Existing room name to modify" },
                  new_name: { type: "string", description: "New name for rename" },
                  width: { type: "number", description: "Width in meters" },
                  depth: { type: "number", description: "Depth in meters" },
                  x: { type: "number", description: "X position" },
                  y: { type: "number", description: "Y position" },
                  floor_type: { type: "string", enum: ["parkett", "fliesen", "laminat"] },
                  message: { type: "string", description: "Response message to user" },
                },
                required: ["action", "message"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "floor_plan_action" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht, bitte versuche es gleich nochmal." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits aufgebraucht." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI Fehler" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: plain text response
    const content = data.choices?.[0]?.message?.content || "Ich konnte die Anfrage nicht verarbeiten.";
    return new Response(JSON.stringify({ action: "info", message: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("floor-plan-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

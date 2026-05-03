// Generate a Mermaid.js flowchart from a note's summary
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a diagram generator. Given study material key points, return ONLY valid Mermaid.js flowchart code — nothing else. No markdown fences, no explanation. Start directly with 'flowchart TD'. Use concise node labels (max 6 words each). Connect ideas logically showing how concepts relate, cause each other, or flow into each other. Use these node shapes: rectangles for main concepts [Label], rounded rectangles for processes (Label), diamonds for decisions {Label?}, and stadium shapes for outcomes ([Label]). Add subgraphs to group related concepts when there are 6 or more nodes. Max 12 nodes total. Make the diagram genuinely useful for understanding the topic, not just a list.`;

// Strip markdown code fences if the model adds them anyway
const cleanMermaid = (raw: string): string => {
  let s = raw.trim();
  s = s.replace(/^```(?:mermaid)?\s*/i, "");
  s = s.replace(/```\s*$/i, "");
  return s.trim();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, keyPoints, title } = await req.json();
    if (!Array.isArray(keyPoints) || keyPoints.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing keyPoints — generate a summary first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const userApiKey = req.headers.get("x-user-api-key");
    const apiKey = userApiKey || LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = [
      title ? `Topic: ${title}` : "",
      `Key points:\n${keyPoints.map((k: string, i: number) => `${i + 1}. ${k}`).join("\n")}`,
      content ? `\nContext summary:\n${String(content).slice(0, 2000)}` : "",
    ].filter(Boolean).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content as string | undefined;
    if (!raw) {
      return new Response(JSON.stringify({ error: "No diagram returned from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mermaidCode = cleanMermaid(raw);
    return new Response(JSON.stringify({ mermaidCode }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-flowchart error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

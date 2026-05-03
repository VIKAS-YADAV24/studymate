// Interpret a medical report (text or image) and return a structured, plain-English summary.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a medical-report interpreter for laypeople.
You are given the contents (text or image) of a medical report. Produce a structured, easy-to-understand summary.

Rules:
- Use plain English, no medical jargon (or define jargon in parentheses).
- Be cautious. Never diagnose. Never recommend specific treatments. Suggest seeing a doctor.
- For each finding/test value, classify status as one of: "normal" | "borderline" | "abnormal".
- "abnormalFlags" should list values clearly out-of-range with a 1-2 sentence plain-English explanation.
- "nextSteps" is general guidance only. NEVER prescribe medication or doses.
- If the input does not look like a medical report, explain that and leave other arrays empty.

Return ONLY valid JSON (no markdown fences) in this exact shape:
{
  "reportType": "...",
  "about": "...",
  "keyFindings": ["..."],
  "values": [{"name":"...","value":"...","referenceRange":"...","status":"normal|borderline|abnormal","plainExplanation":"..."}],
  "abnormalFlags": [{"label":"...","explanation":"..."}],
  "nextSteps": ["..."]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const text: string | undefined = body.text;
    const imageDataUrl: string | undefined = body.imageDataUrl;

    if (!text && !imageDataUrl) {
      return new Response(
        JSON.stringify({ error: "Provide either text or an imageDataUrl from a medical report." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (text && text.length > 30000) {
      return new Response(
        JSON.stringify({ error: "Text is too long. Please paste up to 30,000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const userApiKey = req.headers.get("x-user-api-key");
    const apiKey = userApiKey || ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Build content array for Anthropic API (supports vision)
    const userContent: Array<Record<string, unknown>> = [];
    if (text) {
      userContent.push({ type: "text", text: `Medical report text:\n\n${text}` });
    }
    if (imageDataUrl) {
      // Extract base64 and media type from data URL
      const matches = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        userContent.push({
          type: "text",
          text: "Here is an image of a medical report. Please read its contents and interpret.",
        });
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: matches[1],
            data: matches[2],
          },
        });
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Use sonnet for image analysis (haiku may have weaker vision), haiku for text
        model: imageDataUrl ? "claude-sonnet-4-6" : "claude-haiku-4-5",
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI API error: " + response.status }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text ?? "";
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("medical-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

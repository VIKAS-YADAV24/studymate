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
  • normal: clearly within the standard reference range or explicitly stated as normal.
  • borderline: just outside the reference range or marked "high-normal", "low-normal", "borderline".
  • abnormal: clearly outside the reference range or flagged as abnormal/critical.
- "abnormalFlags" should list values that are clearly out-of-range with a 1-2 sentence plain-English explanation of what that value means.
- "nextSteps" is general guidance only (e.g., "discuss with your physician", "follow up in X weeks if directed", "track symptoms"). NEVER prescribe or recommend medication or doses.
- If the input does not look like a medical report, fill the summary explaining that and leave other arrays empty.
- Return ONLY the tool call.`;

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const userApiKey = req.headers.get("x-user-api-key");
    const apiKey = userApiKey || LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const userContent: Array<Record<string, unknown>> = [];
    if (text) {
      userContent.push({ type: "text", text: `Medical report text:\n\n${text}` });
    }
    if (imageDataUrl) {
      userContent.push({
        type: "text",
        text: "Here is an image of a medical report. Please read its contents and interpret.",
      });
      userContent.push({ type: "image_url", image_url: { url: imageDataUrl } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: imageDataUrl ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "interpret_medical_report",
              description: "Return a structured plain-English interpretation of a medical report",
              parameters: {
                type: "object",
                properties: {
                  reportType: { type: "string" },
                  about: { type: "string" },
                  keyFindings: { type: "array", items: { type: "string" } },
                  values: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        value: { type: "string" },
                        referenceRange: { type: "string" },
                        status: { type: "string", enum: ["normal", "borderline", "abnormal"] },
                        plainExplanation: { type: "string" },
                      },
                      required: ["name", "value", "referenceRange", "status", "plainExplanation"],
                      additionalProperties: false,
                    },
                  },
                  abnormalFlags: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        explanation: { type: "string" },
                      },
                      required: ["label", "explanation"],
                      additionalProperties: false,
                    },
                  },
                  nextSteps: { type: "array", items: { type: "string" } },
                },
                required: ["reportType", "about", "keyFindings", "values", "abnormalFlags", "nextSteps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "interpret_medical_report" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds to your workspace." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);
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

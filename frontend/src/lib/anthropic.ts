import { getUserApiKey } from "@/hooks/use-api-key";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5";
const SONNET_MODEL = "claude-sonnet-4-6";

function getApiKey(): string {
  const key = getUserApiKey();
  if (!key) {
    throw new Error(
      "No Anthropic API key found. Please add your API key in Settings."
    );
  }
  return key;
}

async function callAnthropic(opts: {
  model?: string;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: unknown }>;
  max_tokens: number;
}): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: opts.max_tokens,
      system: opts.system,
      messages: opts.messages,
    }),
  });

  if (response.status === 401) {
    throw new Error(
      "Invalid API key. Please check your Anthropic API key in Settings."
    );
  }
  if (response.status === 429) {
    throw new Error("Rate limit reached. Please wait a moment and try again.");
  }
  if (response.status === 402) {
    throw new Error(
      "Your Anthropic API account has insufficient credits. Please add credits at console.anthropic.com."
    );
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`AI API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const raw: string = data.content?.[0]?.text ?? "";
  return raw;
}

function parseJson<T>(raw: string): T {
  const clean = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(clean) as T;
}

// ─── Summarize ───────────────────────────────────────────────────────────────

const SUMMARIZE_SYSTEM = `You are StudyMate, a friendly study assistant for students.
Given a piece of study material, return a JSON object with these fields:
- summary: 2-3 short paragraphs in plain student-friendly language explaining the material.
- keyPoints: array of 5-8 short bullet strings (most important takeaways).
- keywords: array of 5-10 single-word or short-phrase technical terms.
- revisionBullets: array of 4-6 ultra-short revision flashcards (single sentences a student can quickly read before an exam).
- difficultWords: array of objects {word, meaning} for 3-6 hard or technical words a student might not know (meaning <= 15 words, plain language).
Return ONLY valid JSON matching this structure, no markdown fences, no extra text. Be accurate to the source material — do NOT invent facts.`;

export async function summarizeContent(content: string) {
  if (!content || content.trim().length < 20) {
    throw new Error("Please provide at least 20 characters of study material.");
  }
  const trimmed = content.length > 16000 ? content.slice(0, 16000) : content;
  const raw = await callAnthropic({
    system: SUMMARIZE_SYSTEM,
    messages: [{ role: "user", content: `Study material:\n\n${trimmed}` }],
    max_tokens: 2048,
  });
  return parseJson(raw);
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function chatWithNotes(
  sourceContent: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  if (!messages.length) throw new Error("No messages provided.");

  const systemPrompt = `You are StudyMate, a helpful study assistant. Answer the user's questions using ONLY the study material provided below. If the answer isn't in the material, say so honestly. Keep answers concise and student-friendly. Use markdown formatting.

Study material:
${(sourceContent || "").slice(0, 12000)}`;

  const anthropicMessages = messages.map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as
      | "user"
      | "assistant",
    content: m.content,
  }));

  return callAnthropic({
    system: systemPrompt,
    messages: anthropicMessages,
    max_tokens: 1024,
  });
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const DIFFICULTY_GUIDE: Record<string, string> = {
  easy: "Easy: focus on recall — definitions, names, simple facts. Plain language. Distractors should be obviously different. Explanations are 1 sentence.",
  medium:
    "Medium: focus on understanding — applying concepts, simple comparisons, cause-and-effect. Distractors should be plausible. Explanations are 1-2 sentences.",
  hard: "Hard: focus on analysis and synthesis — multi-step reasoning, edge cases, subtle distinctions, scenario application. Distractors should be tempting and similar. Explanations are 2-3 sentences and include the underlying principle.",
};

export async function generateQuiz(
  topic: string,
  difficulty: string,
  numQuestions: number
) {
  if (!topic || topic.trim().length < 3) {
    throw new Error(
      "Please provide a topic or some study text (at least 3 characters)."
    );
  }
  const diffKey = difficulty.toLowerCase();
  if (!DIFFICULTY_GUIDE[diffKey]) {
    throw new Error("difficulty must be easy | medium | hard");
  }
  const n = Math.max(3, Math.min(20, numQuestions || 5));
  const trimmed = topic.length > 14000 ? topic.slice(0, 14000) : topic;

  const systemPrompt = `You are an expert quiz writer for students. Generate exactly ${n} multiple-choice questions about the user's topic or text.

Difficulty rules:
${DIFFICULTY_GUIDE[diffKey]}

Hard requirements:
- Each question has EXACTLY 4 options.
- Exactly ONE correct option. Set "correctIndex" to the 0-based index of the correct option.
- Options must be distinct and not contain the letters A) B) C) D) — they're plain strings.
- Provide a brief "explanation" describing why the correct option is right.
- Stay accurate. Don't invent facts about a specific text — only ask about what's in it.
- Return ONLY valid JSON in this exact shape, no markdown fences:
{"title":"...","questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}`;

  const raw = await callAnthropic({
    system: systemPrompt,
    messages: [{ role: "user", content: `Topic / source text:\n\n${trimmed}` }],
    max_tokens: 4096,
  });
  const parsed = parseJson<{ title: string; questions: unknown[] }>(raw);
  return { ...parsed, difficulty: diffKey };
}

// ─── Revision ─────────────────────────────────────────────────────────────────

const REVISION_SYSTEM = `You are StudyMate's Last Minute Revision coach for students who must revise quickly before an exam.
Given study material, return a structured revision in THREE progressively detailed time-boxed formats.

Return ONLY valid JSON (no markdown fences) in this exact shape:
{
  "thirtySecond": ["bullet1","bullet2",...],
  "twoMinute": ["bullet1","bullet2",...],
  "fiveMinute": [{"heading":"...","bullets":["...","..."]},...],
  "memoryHooks": ["Concept = catchy hook",...],
  "keywords": ["term1","term2",...],
  "definitions": [{"term":"...","definition":"..."},...]
}

Rules:
- thirtySecond: 3-5 ultra-short bullets, absolute must-know facts only.
- twoMinute: 5-8 bullets, each a short concept + 1-line plain explanation.
- fiveMinute: 4-6 mini-sections with heading + 2-4 bullets covering all major ideas.
- memoryHooks: 4-7 punchy exam shortcuts/mnemonics. Format like "Concept = catchy hook".
- keywords: 6-12 short technical terms students must recognise.
- definitions: 3-6 objects for the most important named concepts (definition <= 20 words).
- Be FAITHFUL to the source material. Do not invent facts.
- Use plain student-friendly language. Keep every bullet short and skimmable.`;

export async function generateRevision(content: string) {
  if (!content || content.trim().length < 20) {
    throw new Error("Please provide at least 20 characters of study material.");
  }
  const trimmed = content.length > 16000 ? content.slice(0, 16000) : content;
  const raw = await callAnthropic({
    system: REVISION_SYSTEM,
    messages: [{ role: "user", content: `Study material:\n\n${trimmed}` }],
    max_tokens: 3000,
  });
  return parseJson(raw);
}

// ─── Medical Report ───────────────────────────────────────────────────────────

const MEDICAL_SYSTEM = `You are a medical-report interpreter for laypeople.
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

export async function interpretMedicalReport(opts: {
  text?: string;
  imageDataUrl?: string;
}) {
  if (!opts.text && !opts.imageDataUrl) {
    throw new Error(
      "Provide either text or an imageDataUrl from a medical report."
    );
  }
  if (opts.text && opts.text.length > 30000) {
    throw new Error("Text is too long. Please paste up to 30,000 characters.");
  }

  const userContent: Array<Record<string, unknown>> = [];
  if (opts.text) {
    userContent.push({
      type: "text",
      text: `Medical report text:\n\n${opts.text}`,
    });
  }
  if (opts.imageDataUrl) {
    const matches = opts.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      userContent.push({
        type: "text",
        text: "Here is an image of a medical report. Please read its contents and interpret.",
      });
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: matches[1], data: matches[2] },
      });
    }
  }

  const raw = await callAnthropic({
    model: opts.imageDataUrl ? SONNET_MODEL : DEFAULT_MODEL,
    system: MEDICAL_SYSTEM,
    messages: [{ role: "user", content: userContent as unknown as string }],
    max_tokens: 3000,
  });
  return parseJson(raw);
}

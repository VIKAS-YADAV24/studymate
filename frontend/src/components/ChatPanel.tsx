import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SpeakButton } from "./SpeakButton";
import type { ChatMessage } from "@/lib/study-types";
import { getUserApiKey } from "@/hooks/use-api-key";

interface ChatPanelProps {
  messages: ChatMessage[];
  sourceContent: string;
  onMessagesChange: (msgs: ChatMessage[]) => void;
}

const SUGGESTIONS = [
  "Summarize this in 3 bullet points",
  "Quiz me on the key concepts",
  "Explain the hardest part simply",
  "What should I memorize for an exam?",
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const ChatPanel = ({ messages, sourceContent, onMessagesChange }: ChatPanelProps) => {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || streaming) return;
    setInput("");

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: userText };
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
    const newMsgs = [...messages, userMsg, assistantMsg];
    onMessagesChange(newMsgs);
    setStreaming(true);

    try {
      const userApiKey = getUserApiKey();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          ...(userApiKey ? { "x-user-api-key": userApiKey } : {}),
        },
        body: JSON.stringify({
          sourceContent,
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (resp.status === 429) {
        toast.error("Rate limit reached. Please wait a moment.");
        onMessagesChange([...messages, userMsg]);
        return;
      }
      if (resp.status === 402) {
        toast.error("AI credits exhausted. Add funds to your workspace.");
        onMessagesChange([...messages, userMsg]);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantSoFar = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantSoFar += delta;
              onMessagesChange([
                ...messages,
                userMsg,
                { ...assistantMsg, content: assistantSoFar },
              ]);
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Couldn't reach the AI. Please try again.");
      onMessagesChange([...messages, userMsg]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Chat with your notes</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Answers come only from your uploaded material
            </p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold">Ask anything about your notes</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Try one of these starters or write your own question.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-primary hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => (
              <li key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary-soft text-primary"
                  }`}
                >
                  {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    m.content ? (
                      <>
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                        <div className="mt-1 -mb-1">
                          <SpeakButton text={m.content} compact size="sm" />
                        </div>
                      </>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background focus-within:border-primary transition-colors p-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask a question about your notes…"
            className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
            rows={1}
          />
          <Button
            onClick={() => send()}
            disabled={!input.trim() || streaming}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg bg-primary hover:bg-primary/90"
            aria-label="Send"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

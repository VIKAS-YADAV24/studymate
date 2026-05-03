import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { RevisionSetup } from "@/components/RevisionSetup";
import { RevisionPanel } from "@/components/RevisionPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { generateRevision } from "@/lib/anthropic";
import type { ChatMessage, Revision } from "@/lib/study-types";

type Session = {
  title: string;
  content: string;
  revision: Revision;
  messages: ChatMessage[];
};

const RevisionPage = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generate = async (title: string, content: string) => {
    setIsLoading(true);
    try {
      const data = await generateRevision(content);
      setSession((prev) => ({
        title,
        content,
        revision: data as Revision,
        messages: prev?.content === content ? prev.messages : [],
      }));
      toast.success("Revision ready!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't reach the AI. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const regenerate = () => {
    if (!session) return;
    generate(session.title, session.content);
  };

  return (
    <AppShell>
      {() => (
        <div className="h-full overflow-hidden">
          {!session ? (
            <div className="h-full overflow-y-auto scrollbar-thin">
              <RevisionSetup isLoading={isLoading} onGenerate={generate} />
            </div>
          ) : (
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-2.5 bg-card/40 backdrop-blur">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSession(null)}
                  className="gap-1.5 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  New revision
                </Button>
                <span className="text-[11px] text-muted-foreground hidden md:inline">
                  Tip: Switch between 30s / 2min / 5min for progressive depth
                </span>
              </div>
              <div className="hidden lg:grid flex-1 min-h-0 grid-cols-5 gap-5 p-6 overflow-hidden">
                <div className="col-span-3 overflow-y-auto scrollbar-thin pr-2">
                  <RevisionPanel
                    title={session.title}
                    revision={session.revision}
                    isRegenerating={isLoading}
                    onRegenerate={regenerate}
                  />
                </div>
                <div className="col-span-2 min-h-0">
                  <ChatPanel
                    messages={session.messages}
                    sourceContent={session.content}
                    onMessagesChange={(msgs) =>
                      setSession((s) => (s ? { ...s, messages: msgs } : s))
                    }
                  />
                </div>
              </div>
              <div className="lg:hidden flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 space-y-5">
                <RevisionPanel
                  title={session.title}
                  revision={session.revision}
                  isRegenerating={isLoading}
                  onRegenerate={regenerate}
                />
                <div className="h-[420px]">
                  <ChatPanel
                    messages={session.messages}
                    sourceContent={session.content}
                    onMessagesChange={(msgs) =>
                      setSession((s) => (s ? { ...s, messages: msgs } : s))
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
};

export default RevisionPage;

import { useState, useEffect } from "react";
import { Settings, Eye, EyeOff, ExternalLink, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getUserApiKey, setUserApiKey, clearUserApiKey } from "@/hooks/use-api-key";
import { toast } from "sonner";

function detectProvider(key: string): "anthropic" | "openrouter" | null {
  if (!key) return null;
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("sk-or-")) return "openrouter";
  return "openrouter"; // treat anything else as openrouter
}

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    if (open) {
      const stored = getUserApiKey();
      setKey(stored ?? "");
      setHasKey(!!stored);
      setShowKey(false);
    }
  }, [open]);

  const provider = detectProvider(key.trim());

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) {
      toast.error("Please enter an API key.");
      return;
    }
    setUserApiKey(trimmed);
    setHasKey(true);
    setShowKey(false);
    const label = trimmed.startsWith("sk-ant-") ? "Anthropic" : "OpenRouter";
    toast.success(`${label} API key saved!`);
    setOpen(false);
  };

  const handleClear = () => {
    clearUserApiKey();
    setKey("");
    setHasKey(false);
    toast.success("API key removed.");
  };

  const storedProvider = detectProvider(getUserApiKey() ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            API Key Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Status badge */}
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/40">
            <span className={`h-2 w-2 rounded-full shrink-0 ${hasKey ? "bg-green-500" : "bg-yellow-500"}`} />
            <p className="text-sm text-muted-foreground">
              {hasKey
                ? `Using your ${storedProvider === "anthropic" ? "Anthropic" : "OpenRouter"} key`
                : "No API key set — add yours below to use the app"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="api-key-input">
              API Key{" "}
              {provider && (
                <span className={`ml-1 text-xs font-normal px-1.5 py-0.5 rounded-md ${
                  provider === "anthropic"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                }`}>
                  {provider === "anthropic" ? "Anthropic" : "OpenRouter"} detected
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="api-key-input"
                type={showKey ? "text" : "password"}
                placeholder="sk-ant-... or sk-or-..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="pr-10 font-mono text-sm"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Stored only in your browser. Never sent to our servers.
            </p>
          </div>

          {/* Provider options */}
          <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border text-xs">
            <div className="flex items-center justify-between px-3 py-2.5 gap-3">
              <div>
                <p className="font-medium text-foreground">OpenRouter <span className="text-green-600 dark:text-green-400 font-normal">(recommended · free tier)</span></p>
                <p className="text-muted-foreground mt-0.5">Free credits on signup. Starts with <span className="font-mono">sk-or-</span></p>
              </div>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline shrink-0"
              >
                Get key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 gap-3">
              <div>
                <p className="font-medium text-foreground">Anthropic <span className="text-muted-foreground font-normal">(pay-as-you-go)</span></p>
                <p className="text-muted-foreground mt-0.5">Requires credits. Starts with <span className="font-mono">sk-ant-</span></p>
              </div>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline shrink-0"
              >
                Get key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} className="flex-1">
              Save Key
            </Button>
            {hasKey && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleClear}
                className="shrink-0 hover:text-destructive hover:border-destructive"
                aria-label="Remove API key"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

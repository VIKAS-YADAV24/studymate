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

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) {
      toast.error("Please enter an API key.");
      return;
    }
    setUserApiKey(trimmed);
    setHasKey(true);
    setShowKey(false);
    toast.success("API key saved! Your requests will now use your own key.");
    setOpen(false);
  };

  const handleClear = () => {
    clearUserApiKey();
    setKey("");
    setHasKey(false);
    toast.success("API key removed.");
  };

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
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                hasKey ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <p className="text-sm text-muted-foreground">
              {hasKey
                ? "Using your personal API key"
                : "No API key set — add yours below to use the app"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="api-key-input">Your Anthropic API Key</Label>
            <div className="relative">
              <Input
                id="api-key-input"
                type={showKey ? "text" : "password"}
                placeholder="sk-ant-..."
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
              Your key is stored only in your browser and never sent to our servers.
            </p>
          </div>

          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Get an API key from Anthropic Console
          </a>

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

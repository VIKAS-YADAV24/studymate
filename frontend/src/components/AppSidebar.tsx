import { Link, useLocation } from "react-router-dom";
import { Sparkles, Moon, Sun, BookOpen, Plus, Trash2, FileText, Brain, Stethoscope, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/study-types";
import { SettingsDialog } from "./SettingsDialog";

interface AppSidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onDeleteNote: (id: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

const NAV = [
  { to: "/", label: "Notes", icon: FileText },
  { to: "/revision", label: "Last Minute Revision", icon: Zap },
  { to: "/quiz", label: "Quiz", icon: Brain },
  { to: "/medical-report", label: "Medical Report", icon: Stethoscope },
] as const;

export const AppSidebar = ({
  notes,
  activeNoteId,
  onSelectNote,
  onNewNote,
  onDeleteNote,
  theme,
  onToggleTheme,
}: AppSidebarProps) => {
  const location = useLocation();
  const onNotesRoute = location.pathname === "/";

  return (
    <aside className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow group-hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-none">StudyMate</h1>
            <p className="text-[11px] text-muted-foreground mt-1">AI study companion</p>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          className="h-8 w-8 rounded-lg"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="px-3 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {onNotesRoute && (
        <>
          <div className="px-3 mt-4">
            <Button
              onClick={onNewNote}
              className="w-full justify-start gap-2 rounded-xl bg-primary text-primary-foreground shadow-soft hover:shadow-glow transition-all"
            >
              <Plus className="h-4 w-4" />
              New note
            </Button>
          </div>

          <div className="mt-5 px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your notes
            </p>
          </div>

          <ScrollArea className="flex-1 px-2 py-2">
            {notes.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-xs text-muted-foreground">No notes yet</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {notes.map((note) => {
                  const active = note.id === activeNoteId;
                  return (
                    <li key={note.id}>
                      <button
                        onClick={() => onSelectNote(note.id)}
                        className={cn(
                          "group flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-all",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                            : "hover:bg-sidebar-accent/50",
                        )}
                      >
                        <BookOpen
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{note.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                            {new Date(note.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                            {note.summary ? " · summarized" : " · draft"}
                          </p>
                        </div>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(note.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteNote(note.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </>
      )}

      <div className="mt-auto border-t border-sidebar-border px-3 py-3 space-y-1">
        <SettingsDialog />
        <p className="text-[10px] text-muted-foreground px-3">
          Built for students · AI-powered
        </p>
      </div>
    </aside>
  );
};

import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Trash2,
  Copy,
  Check,
  X,
  FileText,
  Calendar,
  User,
} from "lucide-react";
import { PromptHistoryItem } from "@/hooks/usePromptHistory";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PromptHistorySidebarProps {
  history: PromptHistoryItem[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function PromptHistorySidebar({
  history,
  onDelete,
  onClearAll,
}: PromptHistorySidebarProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PromptHistoryItem | null>(null);

  const handleCopy = async (item: PromptHistoryItem) => {
    try {
      await navigator.clipboard.writeText(item.prompt);
      setCopiedId(item.id);
      toast.success("Prompt copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy prompt");
    }
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    toast.success("Prompt deleted from history");
  };

  return (
    <>
      <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-sidebar-foreground" />
            <h2 className="text-lg font-semibold text-sidebar-foreground">
              Prompt History
            </h2>
          </div>
          {history.length > 0 && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                {history.length} {history.length === 1 ? "prompt" : "prompts"}
              </Badge>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="flex flex-col">
          {history.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground mb-1">
                No prompts yet
              </p>
              <p className="text-xs text-muted-foreground">
                Generate your first image to see history here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <SidebarMenu className="p-2">
                {history.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <div className="group relative mb-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 hover:bg-sidebar-accent transition-colors">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <User className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-sidebar-foreground truncate">
                              @{item.username}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {truncateText(item.prompt, 100)}
                        </p>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatRelativeTime(item.createdAt)}</span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-sidebar-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs flex-1"
                          onClick={() => handleCopy(item)}
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </ScrollArea>
          )}
        </SidebarContent>

        {history.length > 0 && (
          <SidebarFooter className="border-t border-sidebar-border p-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {history.length} saved prompts.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarFooter>
        )}
      </Sidebar>

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl dialog-glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              @{selectedItem?.username}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-xs">
              <Calendar className="h-3 w-3" />
              {selectedItem && formatRelativeTime(selectedItem.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {selectedItem.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={selectedItem.imageUrl}
                    alt={`Generated for @${selectedItem.username}`}
                    className="w-full h-auto"
                  />
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold mb-2 text-foreground">
                  Image Prompt
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground">
                  {selectedItem.prompt}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleCopy(selectedItem)}
                  className="flex-1"
                  variant="outline"
                >
                  {copiedId === selectedItem.id ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Prompt
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    handleDelete(selectedItem.id);
                    setSelectedItem(null);
                  }}
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


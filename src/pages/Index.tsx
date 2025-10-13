import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Image as ImageIcon, AlertCircle, Sparkles, Download, Heart, Coffee, DollarSign, Palette, Copy, Check, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PromptHistorySidebar } from "@/components/PromptHistorySidebar";
import { usePromptHistory } from "@/hooks/usePromptHistory";

const Index = () => {
  const [handle, setHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ imagePrompt: string; imageUrl: string } | null>(null);
  const [donateOpen, setDonateOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Prompt history hook
  const { history, addToHistory, deleteFromHistory, clearHistory } = usePromptHistory();

  const handleGenerate = async () => {
    if (!handle.trim()) {
      setError("Please enter an X handle");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      // Step 1: Analyze with Grok
      toast.info("Analyzing X account...");
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-account",
        {
          body: { handle: handle.trim().replace("@", "") },
        }
      );

      if (analysisError) throw analysisError;
      if (!analysisData?.imagePrompt) throw new Error("Failed to generate image prompt");

      // Step 2: Generate image with Gemini
      toast.info("Generating image...");
      const { data: imageData, error: imageError } = await supabase.functions.invoke(
        "generate-image",
        {
          body: {
            prompt: analysisData.imagePrompt,
            handle: handle.trim().replace("@", "")
          },
        }
      );

      if (imageError) throw imageError;
      if (!imageData?.imageUrl) throw new Error("Failed to generate image");

      setResult({
        imagePrompt: analysisData.imagePrompt,
        imageUrl: imageData.imageUrl,
      });

      // Add to history
      addToHistory({
        username: handle.trim().replace("@", ""),
        prompt: analysisData.imagePrompt,
        imageUrl: imageData.imageUrl,
      });

      toast.success("Image generated successfully!");

      // Scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      console.error("Generation error:", err);
      const message = err instanceof Error ? err.message : "Failed to generate image. Please try again.";
      setError(message);
      toast.error("Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.imageUrl) return;

    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `x-account-${handle.trim().replace("@", "")}-generated.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded!");
    } catch (error: unknown) {
      console.error("Download error:", error);
      toast.error("Failed to download image");
    }
  };

  const handleCopyPrompt = async () => {
    if (!result?.imagePrompt) return;

    try {
      await navigator.clipboard.writeText(result.imagePrompt);
      setIsCopied(true);
      toast.success("Prompt copied to clipboard!");

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error: unknown) {
      console.error("Copy error:", error);
      toast.error("Failed to copy prompt");
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <PromptHistorySidebar
        history={history}
        onDelete={deleteFromHistory}
        onClearAll={clearHistory}
      />
      <div className="relative min-h-screen w-full overflow-hidden flex-1">
        <div className="aurora-background"></div>

        {/* Sidebar Toggle Button */}
        <div className="fixed top-4 left-4 z-50">
          <SidebarTrigger className="glass-card p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl border border-slate-300/50">
            <Sparkles className="h-5 w-5 text-slate-700" />
          </SidebarTrigger>
        </div>

        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl w-full mx-auto space-y-12">
            {/* Header */}
            <div className="text-center space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-200/60 via-slate-100/50 to-slate-200/60 backdrop-blur-xl border border-slate-300/50 shadow-2xl mb-4">
                <Zap className="w-12 h-12 text-slate-700 drop-shadow-sm" />
              </div>
              <h1 className="text-5xl md:text-7xl font-serif font-black tracking-tight title-glow pb-2">
                𝕏-pressionist
              </h1>
              <p className="text-xl md:text-2xl text-foreground/70 max-w-2xl mx-auto font-medium">
                Your 𝕏 profile, visualized by AI
              </p>

              {/* Support API Costs Button */}
              <div className="pt-2">
                <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
                  <DialogTrigger asChild>
                    <Button className="support-button">
                      <span aria-hidden className="support-sparkle" />
                      <Heart className="w-4 h-4 mr-2 fill-current" />
                      Support API Costs
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md dialog-glass">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-2xl text-foreground">
                        <Heart className="w-6 h-6 text-rose-500 fill-current" />
                        Support This Project
                      </DialogTitle>
                      <DialogDescription className="text-base pt-2 text-muted-foreground">
                        All donated funds will be used to cover API costs. Thank you — truly appreciated.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 pt-4">
                      <a href="https://buymeacoffee.com/applelampsg" target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full h-14 text-base bg-primary/90 hover:bg-primary text-primary-foreground border border-white/10" onClick={() => setDonateOpen(false)}>
                          <Coffee className="w-5 h-5 mr-2" />
                          Buy Me a Coffee
                        </Button>
                      </a>

                      <a href="https://cash.app/$applelamps" target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full h-14 text-base bg-secondary/90 hover:bg-secondary text-secondary-foreground border border-white/10" onClick={() => setDonateOpen(false)}>
                          <DollarSign className="w-5 h-5 mr-2" />
                          CashApp: $applelamps
                        </Button>
                      </a>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Input Section */}
            <Card className="glass-card shadow-2xl animate-scale-in w-full max-w-3xl mx-auto">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Enter 𝕏 Handle
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter an 𝕏 username to generate a unique image.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2 pb-8 px-8">
                <div className="flex flex-col sm:flex-row gap-3 items-center max-w-3xl mx-auto">
                  <div className="flex-1 relative w-full">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      @
                    </span>
                    <Input
                      placeholder="elonmusk"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !isLoading && handleGenerate()}
                      disabled={isLoading}
                      className="pl-8 !text-base sm:!text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={isLoading || !handle.trim()}
                    size="lg"
                    className="generate-button bg-gradient-to-r from-slate-700 to-slate-600 text-white font-semibold hover:from-slate-600 hover:to-slate-500 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 mr-2" />
                        Generate Image
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive" className="animate-fade-in bg-destructive/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Results Section */}
            {result && (
              <Card id="results" className="glass-card shadow-2xl animate-fade-in w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    Generated Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-gradient-to-br from-slate-700/8 via-slate-600/5 to-slate-700/8 border border-white/20 rounded-lg shadow-[inset_0_2px_8px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.15)] backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Prompt
                      </p>
                      <Button
                        onClick={handleCopyPrompt}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 hover:bg-white/10 transition-colors"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 mr-1 text-green-500" />
                            <span className="text-xs text-green-500">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            <span className="text-xs">Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm italic text-foreground">{result.imagePrompt}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-center p-2 border border-white/20 rounded-lg bg-black/10">
                      <img
                        src={result.imageUrl}
                        alt="Generated from X account analysis"
                        className="max-w-full h-auto rounded-md shadow-2xl"
                        onError={(e) => {
                          console.error("Image failed to load:", result.imageUrl);
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Button
                        onClick={handleDownload}
                        size="lg"
                        className="bg-gradient-to-r from-slate-700 to-slate-600 text-white font-semibold hover:from-slate-600 hover:to-slate-500 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 shadow-lg"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download Image
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Footer */}
            <footer className="text-center space-y-2 pt-8 pb-6">
              <div className="text-sm text-muted-foreground space-y-1.5">
                <p className="font-medium tracking-wide">Powered by Grok-4-Fast and Gemini Nano Banana</p>
                <p>
                  API costs covered by{" "}
                  <a href="https://x.com/lamps_apple" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline font-medium transition-colors">@lamps_apple</a>
                </p>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;

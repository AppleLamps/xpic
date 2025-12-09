import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  Sparkles,
  Download,
  Heart,
  Coffee,
  DollarSign,
  Palette,
  Copy,
  Check,
  Zap,
  Wand2,
  ListChecks,
  Search,
  Sparkle,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Static data moved outside component to prevent recreation on every render
const DONORS = ["F0XYOU", "RazorRuckus"];
const SUGGESTION_HANDLES = ["levelsio", "pmarca", "ai__memes"];
const STAGE_ORDER: Array<"analyze" | "image"> = ["analyze", "image"];

const PROGRESS_STEPS: Array<{
  id: "analyze" | "image";
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
    {
      id: "analyze",
      title: "Understand the vibe",
      description: "Grok inspects recent posts and highlights the dominant tone.",
      icon: Search,
    },
    {
      id: "image",
      title: "Paint the artwork",
      description: "Gemini turns the brief into a bespoke visual composition.",
      icon: Wand2,
    },
  ];

const HOW_IT_WORKS: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
    {
      title: "Share an X handle",
      description: "We only need the username—no authentication or passwords required.",
      icon: Sparkles,
    },
    {
      title: "We study the signal",
      description: "Grok reads the timeline to learn the personality, pace, and topics you care about.",
      icon: ListChecks,
    },
    {
      title: "Receive a tailored artwork",
      description: "Gemini renders a polished illustration inspired by your online voice.",
      icon: Palette,
    },
  ];

const Index = () => {
  const [handle, setHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRoasting, setIsRoasting] = useState(false);
  const [inputError, setInputError] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [loadingStage, setLoadingStage] = useState<"analyze" | "image" | null>(null);
  const [result, setResult] = useState<{ imagePrompt: string; imageUrl: string; username: string } | null>(null);
  const [roast, setRoast] = useState<string | null>(null);
  const [donateOpen, setDonateOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRoastCopied, setIsRoastCopied] = useState(false);
  const [currentDonorIndex, setCurrentDonorIndex] = useState(0);

  const { history, addToHistory, deleteFromHistory, clearHistory } = usePromptHistory();

  // Donor rotation effect - no dependencies needed since DONORS is constant
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDonorIndex((prevIndex) => (prevIndex + 1) % DONORS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array - DONORS never changes

  // Pause animations when tab is not visible to save CPU
  useEffect(() => {
    const handleVisibilityChange = () => {
      const root = document.documentElement;
      if (document.hidden) {
        // Pause all animations when tab is hidden
        root.style.setProperty('animation-play-state', 'paused');
      } else {
        // Resume animations when tab is visible
        root.style.setProperty('animation-play-state', 'running');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const focusInput = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => {
      const element = document.getElementById("handle-input");
      element?.focus();
    });
  };

  const handleGenerate = async () => {
    const normalizedHandle = handle.trim().replace("@", "");

    if (!normalizedHandle) {
      setInputError("Enter an X username to get started.");
      return;
    }

    setIsLoading(true);
    setInputError("");
    setGlobalError("");
    setResult(null);
    setRoast(null);
    setLoadingStage("analyze");

    try {
      toast.info("Analyzing X account...");
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-account",
        {
          body: { handle: normalizedHandle },
        }
      );

      if (analysisError) throw analysisError;
      if (!analysisData?.imagePrompt) throw new Error("Failed to generate image prompt");

      setLoadingStage("image");
      toast.info("Generating image...");
      const { data: imageData, error: imageError } = await supabase.functions.invoke(
        "generate-image",
        {
          body: {
            prompt: analysisData.imagePrompt,
            handle: normalizedHandle,
          },
        }
      );

      if (imageError) throw imageError;
      if (!imageData?.imageUrl) throw new Error("Failed to generate image");

      setResult({
        imagePrompt: analysisData.imagePrompt,
        imageUrl: imageData.imageUrl,
        username: normalizedHandle,
      });

      addToHistory({
        username: normalizedHandle,
        prompt: analysisData.imagePrompt,
        imageUrl: imageData.imageUrl,
      });

      toast.success("Image generated successfully!");

      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      console.error("Generation error:", err);
      const message = err instanceof Error ? err.message : "Failed to generate image. Please try again.";
      setGlobalError(message);
      toast.error("Failed to generate image");
    } finally {
      setLoadingStage(null);
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.imageUrl) return;

    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `x-account-${result.username}-generated.png`;
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

  const handleRoast = async () => {
    const normalizedHandle = handle.trim().replace("@", "");

    if (!normalizedHandle) {
      setInputError("Enter an X username to get started.");
      return;
    }

    setIsRoasting(true);
    setInputError("");
    setGlobalError("");
    setRoast(null);

    try {
      toast.info("Analyzing for roast...");
      const { data, error } = await supabase.functions.invoke(
        "roast-account",
        {
          body: { handle: normalizedHandle },
        }
      );

      if (error) throw error;
      if (!data?.roastLetter) throw new Error("Failed to generate roast letter");

      setRoast(data.roastLetter);
      toast.success("Roast letter ready!");
    } catch (err: unknown) {
      console.error("Roast error:", err);
      const message = err instanceof Error ? err.message : "Failed to generate roast. Please try again.";
      setGlobalError(message);
      toast.error("Failed to generate roast");
    } finally {
      setIsRoasting(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!result?.imagePrompt) return;

    try {
      await navigator.clipboard.writeText(result.imagePrompt);
      setIsCopied(true);
      toast.success("Prompt copied to clipboard!");

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error: unknown) {
      console.error("Copy error:", error);
      toast.error("Failed to copy prompt");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setHandle(suggestion);
    setInputError("");
    focusInput();
  };

  const isGenerateDisabled = isLoading;
  const isBusy = isLoading || isRoasting;

  return (
    <SidebarProvider defaultOpen={false}>
      <PromptHistorySidebar
        history={history}
        onDelete={deleteFromHistory}
        onClearAll={clearHistory}
      />
      <div className="relative min-h-screen w-full overflow-hidden flex-1">
        <div className="aurora-background" />

        <div className="fixed top-4 left-4 z-50">
          <SidebarTrigger
            aria-label="Open prompt history"
            className="p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl border border-slate-300/50 bg-white/90"
            style={{ backdropFilter: 'blur(4px)' }}
          >
            <Sparkles className="h-5 w-5 text-slate-700" />
            <span className="sr-only">Open prompt history</span>
          </SidebarTrigger>
        </div>

        <main className="relative z-10 flex flex-col items-center min-h-screen px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          <div className="max-w-4xl w-full mx-auto space-y-12 md:space-y-14">
            <div className="text-center space-y-5 md:space-y-6 animate-fade-in">
              <Badge variant="secondary" className="uppercase tracking-wide text-xs px-3 py-1 rounded-full">
                Beta • AI-generated profile art
              </Badge>
              <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-5">
                <div className="flex items-center justify-center w-[68px] h-[68px] md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-slate-200/60 via-slate-100/50 to-slate-200/60 backdrop-blur-xl border border-slate-300/50 shadow-2xl">
                  <Zap className="w-8 h-8 md:w-10 md:h-10 text-slate-700 drop-shadow-sm" />
                </div>
                <h1 className="text-[2.4rem] md:text-[3.3rem] leading-tight font-serif font-black tracking-tight title-glow">
                  𝕏-pressionist
                </h1>
              </div>
              <p className="text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
                Transform any public X timeline into a bespoke AI artwork—perfect for profile revamps, launch campaigns, or gifting friends a fresh visual identity.
              </p>

              <div className="flex items-center justify-center gap-2.5 md:gap-3 pt-1">
                <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="rounded-full px-5 h-10">
                      <Heart className="w-4 h-4 mr-2" />
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
                        Every donation goes straight to Grok + Gemini usage. Thank you for keeping the brushes moving.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 pt-4">
                      <a href="https://buymeacoffee.com/applelampsg" target="_blank" rel="noopener noreferrer" className="block">
                        <Button
                          className="w-full h-12 text-base"
                          onClick={() => setDonateOpen(false)}
                        >
                          <Coffee className="w-5 h-5 mr-2" />
                          Buy Me a Coffee
                        </Button>
                      </a>

                      <a href="https://cash.app/$applelamps" target="_blank" rel="noopener noreferrer" className="block">
                        <Button
                          variant="outline"
                          className="w-full h-12 text-base"
                          onClick={() => setDonateOpen(false)}
                        >
                          <DollarSign className="w-5 h-5 mr-2" />
                          CashApp: $applelamps
                        </Button>
                      </a>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" className="gap-2" onClick={focusInput}>
                  <Sparkle className="w-4 h-4" />
                  Try it now
                </Button>
              </div>
            </div>

            <Card className="glass-card shadow-xl animate-scale-in w-full max-w-3xl mx-auto">
              <CardHeader className="pb-4 space-y-4 text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-foreground text-xl font-semibold">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span>Generate your custom artwork</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm leading-relaxed max-w-xl mx-auto">
                  We analyze the handle’s recent posts to craft an art brief, then render a polished illustration in seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-1 pb-6 px-6 sm:px-7">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="handle-input" className="text-sm font-medium text-foreground">
                      X username
                    </Label>
                    <Badge variant="outline" className="text-xs font-normal">
                      Public handles only
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        @
                      </span>
                      <Input
                        id="handle-input"
                        placeholder="midjourney"
                        value={handle}
                        onChange={(e) => {
                          setHandle(e.target.value);
                          if (inputError) setInputError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && !isBusy && handleGenerate()}
                        disabled={isBusy}
                        className="pl-8 text-base"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          disabled={isBusy}
                          size="lg"
                          className="bg-gradient-to-r from-slate-700 to-slate-600 text-white font-semibold hover:from-slate-600 hover:to-slate-500 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 shadow-lg w-full sm:w-auto sm:min-w-[180px]"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Generating image...
                            </>
                          ) : isRoasting ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Crafting roast...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 mr-2" />
                              Generate
                              <ChevronDown className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={handleGenerate} disabled={isBusy} className="cursor-pointer">
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Generate image
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleRoast} disabled={isBusy} className="cursor-pointer">
                          <Wand2 className="w-4 h-4 mr-2" />
                          Generate roast letter
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {inputError && (
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {inputError}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground pt-1 text-center">
                  <span className="uppercase tracking-wide text-[0.7rem] font-semibold text-muted-foreground/80">
                    Quick suggestions:
                  </span>
                  {SUGGESTION_HANDLES.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full px-3"
                      disabled={isBusy}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      @{suggestion}
                    </Button>
                  ))}
                </div>


                <div className="flex items-center justify-center pt-2">
                  <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-border/80 bg-white/80 px-5 py-2 text-[0.75rem] sm:text-sm text-muted-foreground shadow-sm">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">Powered by Grok + Gemini</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="inline-flex items-center gap-2 font-medium">
                      API costs tamed by
                      <Badge variant="secondary" className="font-semibold px-3 py-1 shadow-sm">
                        @{DONORS[currentDonorIndex]}
                      </Badge>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {globalError && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>We hit a snag</AlertTitle>
                <AlertDescription>{globalError}</AlertDescription>
              </Alert>
            )}

            {isLoading && (
              <Card className="glass-card shadow-xl animate-fade-in">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                    <Wand2 className="w-5 h-5 text-primary" />
                    Creating your artwork
                  </CardTitle>
                  <CardDescription className="text-sm">Hang tight—this usually takes less than 10 seconds.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5">
                  {PROGRESS_STEPS.map(({ id, title, description, icon: Icon }) => {
                    const activeIndex = loadingStage ? STAGE_ORDER.indexOf(loadingStage) : -1;
                    const stepIndex = STAGE_ORDER.indexOf(id);
                    const isActive = loadingStage === id;
                    const isComplete = activeIndex > stepIndex;

                    return (
                      <div
                        key={id}
                        className="flex items-start gap-3 rounded-xl border border-white/30 bg-white/40 backdrop-blur p-4"
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border ${isComplete
                            ? "border-primary bg-primary text-primary-foreground"
                            : isActive
                              ? "border-primary/60 bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground"
                            }`}
                        >
                          {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">{title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <section className="space-y-5">
              <div className="flex items-center gap-2">
                <Sparkle className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">How it works</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {HOW_IT_WORKS.map(({ title, description, icon: Icon }) => (
                  <Card key={title} className="border border-border/70 bg-white/70 backdrop-blur">
                    <CardContent className="space-y-2.5 pt-5 pb-5">
                      <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wide">
                        <Icon className="h-4 w-4" />
                        {title}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {result && (
              <Card id="results" className="glass-card shadow-2xl animate-fade-in w-full">
                <CardHeader>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        Your generated artwork
                      </CardTitle>
                      <Badge variant="secondary" className="flex items-center gap-2 w-fit">
                        <Sparkles className="h-4 w-4" />@{result.username}
                      </Badge>
                    </div>
                    <CardDescription>
                      Save the image, reuse the prompt in your favourite editor, or refine with another handle.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Palette className="w-4 h-4 text-primary" />
                        Creative brief
                      </span>
                      <Button
                        onClick={handleCopyPrompt}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 mr-1 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-white/60 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {result.imagePrompt}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-center p-3 border border-white/20 rounded-lg bg-black/10">
                      <img
                        src={result.imageUrl}
                        alt={`Generated from X account analysis for @${result.username}`}
                        className="max-w-full h-auto rounded-md shadow-2xl"
                        onError={(e) => {
                          console.error("Image failed to load:", result.imageUrl);
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        onClick={handleDownload}
                        size="lg"
                        className="bg-gradient-to-r from-slate-700 to-slate-600 text-white font-semibold hover:from-slate-600 hover:to-slate-500 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 shadow-lg"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download image
                      </Button>
                      <Button
                        onClick={focusInput}
                        variant="outline"
                        size="lg"
                        className="gap-2"
                      >
                        <Sparkle className="w-4 h-4" />
                        Generate another
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {roast && (
              <Card className="glass-card shadow-2xl animate-fade-in w-full">
                <CardHeader>
                  <div className="flex flex-col gap-2">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Wand2 className="w-5 h-5 text-primary" />
                      Roast Letter from Dr. Burn Notice
                    </CardTitle>
                    <CardDescription>
                      A brutally honest therapy note for @{handle.trim().replace("@", "") || result?.username}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      onClick={async () => {
                        if (!roast) return;
                        try {
                          await navigator.clipboard.writeText(roast);
                          setIsRoastCopied(true);
                          toast.success("Roast letter copied!");
                          setTimeout(() => setIsRoastCopied(false), 2000);
                        } catch (error: unknown) {
                          console.error("Roast copy error:", error);
                          toast.error("Failed to copy roast");
                        }
                      }}
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3"
                    >
                      {isRoastCopied ? (
                        <>
                          <Check className="w-4 h-4 mr-1 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-white/60 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {roast}
                  </div>
                </CardContent>
              </Card>
            )}

            <footer className="text-center space-y-2 pt-8 pb-6">
              <Separator className="mx-auto max-w-xs" />
              <div className="text-sm text-muted-foreground space-y-1.5">
                <p className="font-medium tracking-wide flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Powered by Grok-4-Fast & Gemini Nano Banana
                </p>
                <p className="flex items-center justify-center gap-2">
                  API costs covered by
                  <a
                    href="https://x.com/lamps_apple"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-foreground hover:underline font-medium transition-colors"
                  >
                    @lamps_apple
                    <ExternalLink className="h-3 w-3" />
                  </a>
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

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileImage, Image as ImageIcon, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [handle, setHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ imagePrompt: string; imageUrl: string } | null>(null);

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
          body: { prompt: analysisData.imagePrompt },
        }
      );

      if (imageError) throw imageError;
      if (!imageData?.imageUrl) throw new Error("Failed to generate image");

      setResult({
        imagePrompt: analysisData.imagePrompt,
        imageUrl: imageData.imageUrl,
      });

      toast.success("Image generated successfully!");

      // Scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate image. Please try again.");
      toast.error("Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background-secondary py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg mb-4">
            <FileImage className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">X Account Image Generator</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Generate AI-powered images based on X account analysis
          </p>
        </div>

        {/* Input Section */}
        <Card className="shadow-xl border-0 animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Enter X Handle
            </CardTitle>
            <CardDescription>
              Enter an X (Twitter) username to generate a unique image
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  @
                </span>
                <Input
                  placeholder="elonmusk"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isLoading && handleGenerate()}
                  disabled={isLoading}
                  className="pl-8"
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !handle.trim()}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <Card id="results" className="shadow-xl border-0 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                Generated Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prompt Display */}
              <div className="p-4 bg-muted border-l-4 border-primary rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">🎨 Prompt:</p>
                <p className="text-sm italic text-foreground">{result.imagePrompt}</p>
              </div>

              {/* Image Display */}
              <div className="flex justify-center">
                <img
                  src={result.imageUrl}
                  alt="Generated from X account analysis"
                  className="max-w-full h-auto rounded-lg shadow-2xl"
                  onError={(e) => {
                    console.error("Image failed to load:", result.imageUrl);
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="p-8 bg-destructive/10 border border-destructive rounded-lg text-center">
                        <p class="text-destructive">Failed to load image</p>
                        <p class="text-sm text-muted-foreground mt-2">The image URL may be invalid or expired</p>
                      </div>
                    `;
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;

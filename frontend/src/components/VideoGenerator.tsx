import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Upload, Video } from 'lucide-react';

export function VideoGenerator() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateVideo = async () => {
    if (!imageFile) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Check if API key is selected
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
        // Assume success after opening
      }

      const apiKey = (window as any).process?.env?.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      // Convert image to base64
      const base64Data = imagePreview?.split(',')[1];
      if (!base64Data) throw new Error("Failed to process image");

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Animate this image',
        image: {
          imageBytes: base64Data,
          mimeType: imageFile.type,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const apiKey = (window as any).process?.env?.API_KEY || process.env.GEMINI_API_KEY;
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': apiKey || '',
          },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          setVideoUrl(URL.createObjectURL(blob));
        } else {
          throw new Error("Failed to fetch generated video");
        }
      } else {
        throw new Error("Video generation failed");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during video generation");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="bg-surface py-24 border-t border-stroke" id="video-generator">
      <div className="max-w-[1000px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="text-center mb-12">
          <div className="text-xs text-muted uppercase tracking-[0.3em] mb-4">AI Feature</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Animate images into <span className="font-display italic font-normal">video</span>
          </h2>
          <p className="text-muted max-w-md mx-auto">Upload a photo and let Veo bring it to life with stunning motion.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-bg border border-stroke rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[400px] relative overflow-hidden">
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                <div className="relative z-10 w-full max-w-sm bg-surface/80 backdrop-blur-md p-6 rounded-2xl border border-stroke">
                  <input 
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the animation (optional)..."
                    className="w-full bg-bg border border-stroke rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:border-accent"
                  />
                  <button 
                    onClick={generateVideo}
                    disabled={isGenerating}
                    className="w-full relative group rounded-xl text-sm px-6 py-3 bg-white text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                      </span>
                    ) : (
                      "Generate Video"
                    )}
                  </button>
                  <button 
                    onClick={() => { setImageFile(null); setImagePreview(null); setVideoUrl(null); }}
                    disabled={isGenerating}
                    className="w-full mt-3 text-xs text-muted hover:text-white transition-colors"
                  >
                    Clear Image
                  </button>
                </div>
              </>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-4 hover:scale-105 transition-transform">
                <div className="w-16 h-16 rounded-full bg-surface border border-stroke flex items-center justify-center text-muted">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-medium mb-1">Click to upload image</div>
                  <div className="text-xs text-muted">JPG, PNG up to 5MB</div>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          {/* Result Section */}
          <div className="bg-bg border border-stroke rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
            {videoUrl ? (
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop 
                className="w-full h-full object-cover rounded-xl"
              />
            ) : isGenerating ? (
              <div className="flex flex-col items-center gap-4 text-muted">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <div className="text-sm">Veo is animating your image...</div>
                <div className="text-xs opacity-50">This may take a few minutes</div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted opacity-50">
                <Video className="w-12 h-12" />
                <div className="text-sm">Your generated video will appear here</div>
              </div>
            )}
            
            {error && (
              <div className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl text-center backdrop-blur-md">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

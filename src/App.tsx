import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Upload, Image as ImageIcon, Sparkles, Building2, Layers, SunMedium, Palette, ChevronLeft, Download, Plus, Trash2, Send, Folder, FileText, MessageSquare, Coffee, Lightbulb, Timer, ChevronDown, LayoutGrid, Maximize2, ImagePlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { architectureService } from './services/architectureService.ts';
import { cn } from './lib/utils.ts';
import BimViewer from './components/BimViewer.tsx';

const AnimatedCoffee = ({ className, rendering }: { className?: string, rendering?: boolean }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      
      {/* Interactive smoke effect */}
      {[
        { x: 6, delay: 0 },
        { x: 10, delay: 0.6 },
        { x: 14, delay: 1.2 }
      ].map((smoke, i) => (
        <motion.path
          key={i}
          d={`M${smoke.x} 5 C${smoke.x - 2} 3, ${smoke.x + 2} 1, ${smoke.x} -1`}
          initial={{ pathLength: 0, opacity: 0, pathOffset: 0 }}
          animate={{ 
            pathLength: [0, 0.5, 0.5, 0],
            pathOffset: [0, 0, 0.5, 1],
            opacity: [0, 0.6, 0.6, 0]
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity, 
            delay: smoke.delay, 
            ease: "easeInOut" 
          }}
        />
      ))}
    </svg>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type TabType = 'ELEMENTS' | 'MATERIALS' | 'SCORES' | 'SUGGESTIONS';

export default function App() {
  const [assets, setAssets] = useState<string[]>([]);
  const [refAssets, setRefAssets] = useState<string[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [docs, setDocs] = useState<File[]>([]);
  const [contextAnalysis, setContextAnalysis] = useState<string | null>(null);
  const [contextTags, setContextTags] = useState<string[]>([]);
  const [isAnalyzingContext, setIsAnalyzingContext] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('ELEMENTS');
  const [renderPrompt, setRenderPrompt] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');
  const [analysisLang, setAnalysisLang] = useState<'EN' | 'VI'>('EN');
  const [suggestions, setSuggestions] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [showAppsMenu, setShowAppsMenu] = useState(false);
  const [activeApp, setActiveApp] = useState<'VISUAL_DESIGN' | 'BIM_BREAKDOWN' | 'LIBRARY'>('VISUAL_DESIGN');
  const [ifcFile, setIfcFile] = useState<File | null>(null);
  const [isProcessingIfc, setIsProcessingIfc] = useState(false);
  const [ifcProgress, setIfcProgress] = useState(0);
  const [bimAttachments, setBimAttachments] = useState<{name: string, type: string}[]>([]);
  const userEmail = "hau1412159@gmail.com";
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const ifcInputRef = useRef<HTMLInputElement>(null);
  const bimAttachmentRef = useRef<HTMLInputElement>(null);

  const handleIfcChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIfcFile(file);
      setIsProcessingIfc(true);
      setIfcProgress(0);
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          setIfcProgress(100);
          clearInterval(interval);
          setTimeout(() => setIsProcessingIfc(false), 500);
        } else {
          setIfcProgress(Math.floor(progress));
        }
      }, 200);
    }
  };

  const handleBimAttachment = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(f => ({ name: f.name, type: f.type }));
      setBimAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file, 'library');
    }
  };

  const handleRefFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          processImage(file, 'ref');
        } else {
          // Store as reference document
          setRefAssets(prev => [...prev, URL.createObjectURL(file)]);
        }
      });
    }
  };

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleSelectionStart = (e: React.MouseEvent | React.TouchEvent, canvasType: 'source' | 'result') => {
    if (!isSelectingRegion) return;
    
    setActiveSelectionCanvas(canvasType);
    
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    setSelectionRect({ x, y, w: 0, h: 0 });

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const curX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const curY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      const newW = ((curX - rect.left) / rect.width) * 100 - x;
      const newH = ((curY - rect.top) / rect.height) * 100 - y;
      
      setSelectionRect(prev => prev ? { ...prev, w: newW, h: newH } : null);
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  };

  const processImage = (file: File, target: 'library' | 'ref') => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (target === 'library') {
        setAssets(prev => [base64, ...prev]);
        setImage(base64);
      } else {
        setRefAssets(prev => [base64, ...prev]);
      }
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlAdd = () => {
    if (!imageUrl) return;
    setAssets(prev => [imageUrl, ...prev]);
    setImage(imageUrl);
    setImageUrl('');
    setError(null);
    setResult(null);
  };

  const handleDocChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newDocs = Array.from(files);
      setDocs(prev => [...prev, ...newDocs]);
    }
  };

  const removeDoc = (index: number) => {
    setDocs(prev => prev.filter((_, i) => i !== index));
    if (docs.length === 1) {
      setContextAnalysis(null);
      setContextTags([]);
    }
  };

  useEffect(() => {
    if (docs.length === 0 && assets.length === 0) {
      setContextAnalysis(null);
      setContextTags([]);
      return;
    }

    const runAnalysis = async () => {
      setIsAnalyzingContext(true);
      try {
        const fileToBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
        };

        const docAssets = await Promise.all(docs.map(async (f) => ({
          base64: await fileToBase64(f),
          mimeType: f.type || 'text/plain',
          name: f.name
        })));
        
        // Use all available assets
        const imageAssetsResult = assets.map(img => ({
          base64: img,
          mimeType: 'image/jpeg' // simplify default
        }));

        const result = await architectureService.analyzeContextInformation(docAssets, imageAssetsResult);
        setContextAnalysis(result.analysis);
        setContextTags(result.tags);
      } catch (err) {
        console.error("Context analysis failed", err);
      } finally {
        setIsAnalyzingContext(false);
      }
    };

    // Debounce to prevent multiple fires when rapidly adding files
    const timeout = setTimeout(runAnalysis, 1500);
    return () => clearTimeout(timeout);
  }, [docs, assets]);

  const startAnalysis = async () => {
    if (!image) return;
    try {
      setAnalyzing(true);
      let imageToAnalyze = image;
      
      // If image is a URL (starts with http), we try to convert it to base64 for Gemini
      if (image.startsWith('http')) {
        try {
          const response = await fetch(image);
          const blob = await response.blob();
          imageToAnalyze = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          throw new Error('Could not process this image URL for analysis. Please download and upload it instead or use a CORS-friendly URL.');
        }
      }

      const response = await architectureService.analyzeImage(imageToAnalyze, 'image/jpeg', analysisLang); 
      setResult(response);
      
      // Extract initial suggestion to the suggestions tab
      const parts = response.split(/###\s+/);
      const sugPart = parts.find(p => p.toUpperCase().includes('SUGGESTION') || p.toUpperCase().includes('ĐỀ XUẤT'));
      if (sugPart) {
        setSuggestions([{ role: 'ai', content: sugPart.split('\n').slice(1).join('\n').trim() }]);
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConsultantChat = async () => {
    if (!image || !customInstruction.trim() || analyzing) return;
    
    const userQuery = customInstruction.trim();
    setSuggestions(prev => [...prev, { role: 'user', content: userQuery }]);
    setCustomInstruction('');
    setAnalyzing(true);
    setActiveTab('SUGGESTIONS');

    try {
      let imageToAnalyze = image;
      if (image.startsWith('http')) {
        const response = await fetch(image);
        const blob = await response.blob();
        imageToAnalyze = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const response = await architectureService.chatAboutArchitecture(imageToAnalyze, 'image/jpeg', userQuery, analysisLang);
      setSuggestions(prev => [...prev, { role: 'ai', content: response }]);
      
      // If no main result yet, maybe we shouldn't trigger full analysis, but chat is fine
    } catch (err: any) {
      console.error(err);
      setSuggestions(prev => [...prev, { role: 'ai', content: "Error: " + (err.message || "An error occurred.") }]);
    } finally {
      setAnalyzing(false);
    }
  };

  const getTabContent = () => {
    if (!result) return "";

    const sections: Record<string, string> = {};
    const parts = result.split(/###\s+/);
    
    parts.forEach(part => {
      if (!part.trim()) return;
      const lines = part.split('\n');
      const header = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();
      sections[header] = content;
    });

    const findContent = (keywords: string[]) => {
      const header = Object.keys(sections).find(h => 
        keywords.some(k => h.toUpperCase().includes(k.toUpperCase()))
      );
      return header ? `### ${header}\n\n${sections[header]}` : "";
    };

    if (activeTab === 'ELEMENTS') {
      const style = findContent(['STYLE', 'PHONG CÁCH']);
      const elements = findContent(['ELEMENTS', 'YẾU TỐ']);
      return `${style}\n\n${elements}`.trim();
    }

    if (activeTab === 'MATERIALS') {
      const mat = findContent(['MATERIALS', 'VẬT LIỆU']);
      const sug = findContent(['SUGGESTION', 'ĐỀ XUẤT']);
      return `${mat}\n\n${sug}`.trim();
    }

    if (activeTab === 'SCORES') {
      const scores = findContent(['SCORES', 'THANG ĐIỂM']);
      const prompt = findContent(['PROMPT']);
      return `${scores}\n\n${prompt}`.trim();
    }

    if (activeTab === 'SUGGESTIONS') {
      if (suggestions.length === 0) return "No suggestions yet. Ask the AI Consultant for advice.";
      return suggestions.map(s => `**${s.role === 'user' ? 'Client Request' : 'AI Consultant'}:**\n\n${s.content}`).join('\n\n---\n\n');
    }

    return result;
  };

  const getAverageScore = () => {
    if (!result) return null;
    const scoreRegex = /\|\s*[^|]+\s*\|\s*(\d+)\s*\|/g;
    let match;
    const scores: number[] = [];
    while ((match = scoreRegex.exec(result)) !== null) {
      const score = parseInt(match[1]);
      if (!isNaN(score)) scores.push(score);
    }
    if (scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  };

  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [activeSelectionCanvas, setActiveSelectionCanvas] = useState<'source' | 'result'>('source');
  const [variantsCount, setVariantsCount] = useState(1);
  const [renderOutputs, setRenderOutputs] = useState<string[]>([]);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [activeParams, setActiveParams] = useState({ lighting: 'Day' });
  
  const handleRender = async (lightingOverride?: 'Day' | 'Night') => {
    if (!image) {
      setError('Please upload an image first.');
      return;
    }

    const currentLighting = lightingOverride || activeParams.lighting;
    if (lightingOverride) {
      setActiveParams(prev => ({ ...prev, lighting: lightingOverride }));
    }
    
    // API key check
    if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
      if (!(await (window as any).aistudio.hasSelectedApiKey())) {
        await (window as any).aistudio.openSelectKey();
      }
    }

    const baseImageToRender = (activeSelectionCanvas === 'result' && renderOutputs.length > 0 && selectionRect) ? renderOutputs[activeVariantIndex] : image;

    setRendering(true);
    setRenderOutputs([]);
    setActiveVariantIndex(0);
    setError(null);
    
    try {
      // Determine prompt: use user prompt if available, otherwise extract from results
      let finalPrompt = renderPrompt.trim();
      if (!finalPrompt && result) {
        const match = result.match(/### IMAGEN 3 RENDER PROMPT\n\n([\s\S]+?)(?=\n\n###|$)/i);
        if (match) {
          finalPrompt = match[1].trim();
        }
      }
      
      if (!finalPrompt) {
        finalPrompt = "Professional architectural photography, photorealistic, high quality, architecture render.";
      }

      // Light/Time of day context
      let lightPrompt = "";
      if (currentLighting === 'Day') {
        lightPrompt = "Bright natural daylight, golden hour sunlight, sharp shadows, clear sky.";
      } else {
        lightPrompt = "Evening night photography, cinematic artificial lighting, illuminated interiors glowing through glass, long exposure, deep blue night sky.";
      }

      const variantStyles = [
        "Ultra-modern architectural style, sharp glass and steel reflections",
        "Minimalist brutalist approach, raw concrete textures and clean lines",
        "Contemporary organic architecture, wooden accents and lush landscaping",
        "Bauhaus inspired industrial design, functional aesthetics and primary color accents"
      ];

      // Generate variants sequentially
      for (let i = 0; i < variantsCount; i++) {
        try {
          const styleContext = variantStyles[i % variantStyles.length];
          const variantPrompt = `${finalPrompt} ${lightPrompt} Style: ${styleContext}. High-end architectural render.`;
          
          const output = await architectureService.generateRenderImage(
            variantPrompt,
            baseImageToRender, 
            'image/jpeg',
            selectedModel,
            selectedAspectRatio
          );
          setRenderOutputs(prev => [...prev, output]);
        } catch (err: any) {
           console.error(`Variant ${i+1} failed:`, err);
           // If this is the first variant and it fails, we fall back
           if (i === 0) throw err;
        }
      }
    } catch (err: any) {
      console.error("Render error detail:", err);
      let errorMessage = err.message || String(err);
      
      // Try to parse JSON error if it looks like one
      if (errorMessage.includes('{') && errorMessage.includes('}')) {
        try {
          const jsonStart = errorMessage.indexOf('{');
          const jsonEnd = errorMessage.lastIndexOf('}') + 1;
          const jsonPart = errorMessage.substring(jsonStart, jsonEnd);
          const parsed = JSON.parse(jsonPart);
          if (parsed.error && parsed.error.message) {
            errorMessage = parsed.error.message;
          }
        } catch (e) {
          // Fallback to original string if parsing fails
        }
      }
      
      if (errorMessage.includes("403") || errorMessage.toLowerCase().includes("permission")) {
        setError(`Access Denied (403): Your API Key does not have permission to use the ${selectedModel} model. We recommend changing it to Imagen 3 (Standard) or you may need to enable billing in Google Cloud or use an allowlisted key.`);
      } else if (errorMessage.includes("API key")) {
        setError("API Key Error: Please ensure you have enabled the required model APIs in Google AI Studio.");
      } else if (errorMessage.includes("quota") || errorMessage.includes("429")) {
        setError("AI Quota Exceeded: Please wait a moment before trying again.");
      } else if (errorMessage.toLowerCase().includes("high demand") || errorMessage.includes("503")) {
        setError("Server Busy: Google's AI servers are currently experiencing high demand. Please try again in a few moments.");
      } else if (errorMessage.toLowerCase().includes("location is not supported") || errorMessage.toLowerCase().includes("region")) {
        setError(`Region Error: This AI model is not yet available in your current location. Please try a different model or check availability in Google AI Studio.`);
      } else if (errorMessage.includes("model not found") || errorMessage.includes("not found")) {
        // Reset key selection if available
        if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
           setError("Model error: The selected AI model configuration requires an API key update. Please try again to trigger key selection.");
           setTimeout(() => {
             (window as any).aistudio.openSelectKey();
           }, 100);
        } else {
           setError(`Model error: The selected AI model (${selectedModel}) might not be available yet in this region.`);
        }
      } else if (errorMessage.includes("safety")) {
        setError("Safety Filter: The prompt or image triggered safety restrictions. Please try a different design.");
      } else {
        setError(`AI Render failed: ${errorMessage.length > 80 ? errorMessage.substring(0, 80) + '...' : errorMessage}`);
      }
      
      // Fallback only if no outputs were generated
      setRenderOutputs(prev => prev.length === 0 ? [image] : prev);
    } finally {
      setRendering(false);
    }
  };

  const handleDeleteVariant = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenderOutputs(prev => {
      const newOutputs = prev.filter((_, i) => i !== index);
      if (activeVariantIndex >= newOutputs.length && newOutputs.length > 0) {
        setActiveVariantIndex(newOutputs.length - 1);
      } else if (newOutputs.length === 0) {
        setActiveVariantIndex(0);
      }
      return newOutputs;
    });
  };

  const handleSave = async (index?: number) => {
    const idx = typeof index === 'number' ? index : activeVariantIndex;
    const activeOutput = renderOutputs[idx];
    if (!activeOutput) return;
    
    try {
      const response = await fetch(activeOutput);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `highlands-render-v${idx + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const link = document.createElement('a');
      link.href = activeOutput;
      link.target = '_blank';
      link.download = `highlands-render-v${idx + 1}.jpg`;
      link.click();
    }
  };

  const handleAddToLibrary = () => {
    const activeOutput = renderOutputs[activeVariantIndex];
    if (activeOutput) {
      if (assets.includes(activeOutput)) {
        // Just flash the library section if already exists
        const assetSection = document.getElementById('image-assets-section');
        assetSection?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      setAssets(prev => [activeOutput, ...prev]);
      
      // Also set it as the current active image for further work
      setImage(activeOutput);
      setResult(null);

      // Scroll to library
      const assetSection = document.getElementById('image-assets-section');
      assetSection?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="h-screen flex flex-col font-sans text-studio-text overflow-hidden">
      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/90 backdrop-blur-sm shadow-2xl"
            onClick={() => setFullscreenImage(null)}
          >
            <div className="relative w-full h-full max-w-7xl max-h-[90vh]">
               <button 
                 onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
                 className="absolute -top-4 -right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 z-50 shadow-xl"
               >
                 <X className="w-5 h-5" />
               </button>
               <img 
                 src={fullscreenImage} 
                 alt="Fullscreen" 
                 className="w-full h-full object-contain drop-shadow-2xl"
                 referrerPolicy="no-referrer"
               />
               <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-white font-mono text-[10px] tracking-widest border border-white/10 shadow-lg">
                 INSPECT_MODE
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-16 px-4 border-b border-studio-border bg-white flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-[56px] h-[56px] flex items-center justify-center p-0.5">
              <img 
                src="https://img.gotit.vn/compress/brand/1715330504_v0erA.png" 
                alt="Highlands Logo" 
                className="w-full h-full object-contain drop-shadow-sm"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-[7.2px] font-bold tracking-[0.15em] leading-tight text-studio-black">HIGHLANDS AI STUDIO</div>
              <div className="text-[6px] tracking-[0.05em] text-studio-muted leading-tight uppercase font-medium">ARCHITECTURE VISION SYSTEM</div>
            </div>
          </div>
          <div className="h-8 w-px bg-studio-border" />
          <div className="flex items-center gap-3">
            <span className="text-[22px] font-black font-sans text-studio-red uppercase inline-block origin-left scale-x-[1.5] mr-[120px]">HIGHLANDS COFFEE</span>
            <div className="h-5 w-px bg-studio-border opacity-50" />
            <span className="text-[8.5px] font-medium tracking-widest text-studio-muted uppercase italic">CONSCIENTIOUS</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1 px-4 border-r border-studio-border">
            <p className="text-[8px] leading-none font-bold text-studio-muted uppercase tracking-tighter">Imagen 3 API Access Required</p>
            <p className="text-[7px] leading-none text-studio-muted opacity-60">Enable in Google AI Studio for production renders</p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowAppsMenu(!showAppsMenu)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-studio-border transition-all active:scale-95",
                showAppsMenu ? "bg-studio-red border-studio-red text-white shadow-lg" : "bg-white hover:bg-studio-bg"
              )}
            >
              <LayoutGrid className={cn("w-3.5 h-3.5", showAppsMenu ? "text-white" : "text-studio-red")} />
              <span className="text-[9px] font-black uppercase tracking-widest">Studio Apps</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", showAppsMenu && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showAppsMenu && (
                <>
                  {/* Backdrop for closing */}
                  <div 
                    className="fixed inset-0 z-[60]" 
                    onClick={() => setShowAppsMenu(false)}
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-[260px] bg-white border border-studio-border shadow-2xl rounded-2xl p-4 z-[70] overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-studio-red" />
                    <p className="text-[8px] font-black text-studio-muted uppercase tracking-[0.2em] mb-4">Select Ecosystem App</p>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <div 
                        onClick={() => { setActiveApp('VISUAL_DESIGN'); setShowAppsMenu(false); }}
                        className={cn(
                          "p-3 border rounded-xl flex items-center gap-3 group cursor-pointer transition-all",
                          activeApp === 'VISUAL_DESIGN' ? "bg-studio-red border-studio-red text-white" : "bg-studio-red/[0.03] border-studio-red/20 hover:bg-studio-red hover:text-white"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", activeApp === 'VISUAL_DESIGN' ? "bg-white/20" : "bg-studio-red/10 group-hover:bg-white/20")}>
                          <Building2 className={cn("w-4 h-4", activeApp === 'VISUAL_DESIGN' ? "text-white" : "text-studio-red group-hover:text-white")} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-tight">VISUAL DESIGN</span>
                          <span className="text-[7.5px] opacity-60 font-bold italic">{activeApp === 'VISUAL_DESIGN' ? 'Current Instance' : 'Open Workspace'}</span>
                        </div>
                      </div>

                      <div 
                        onClick={() => { setActiveApp('BIM_BREAKDOWN'); setShowAppsMenu(false); }}
                        className={cn(
                          "p-3 border rounded-xl flex items-center gap-3 group cursor-pointer transition-all",
                          activeApp === 'BIM_BREAKDOWN' ? "bg-studio-red border-studio-red text-white" : "bg-studio-bg border-studio-border hover:border-studio-red/30 hover:bg-studio-red/5"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-studio-border flex items-center justify-center overflow-hidden p-1">
                          <img 
                            src="https://p1.hiclipart.com/preview/855/50/429/autodesk-logo-building-information-modeling-5d-bim-6d-bim-fourdimensional-space-4d-bim-threedimensional-space-fivedimensional-space-png-clipart.jpg" 
                            alt="BIM Logo"
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-tight text-studio-red group-hover:text-studio-red transition-colors">BIM BREAKDOWN</span>
                          <span className="text-[7.5px] opacity-60 font-bold uppercase tracking-widest mt-0.5">{activeApp === 'BIM_BREAKDOWN' ? 'Active App' : 'Switch Workspace'}</span>
                        </div>
                      </div>

                      <div 
                        onClick={() => { setActiveApp('LIBRARY'); setShowAppsMenu(false); }}
                        className={cn(
                          "p-3 border rounded-xl flex items-center gap-3 group cursor-pointer transition-all",
                          activeApp === 'LIBRARY' ? "bg-studio-red border-studio-red text-white" : "bg-studio-bg border-studio-border hover:border-studio-red/30 hover:bg-studio-red/5"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-studio-border flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-studio-muted group-hover:text-studio-red" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-tight text-studio-red">LIBRARY</span>
                          <span className="text-[7.5px] opacity-60 font-bold uppercase tracking-widest mt-0.5">Asset Hub</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-studio-border flex items-center justify-between">
                      <span className="text-[7px] font-mono opacity-50 uppercase">User: {userEmail?.split('@')[0] || 'Studio_User'}</span>
                      <button className="text-[7px] font-black text-studio-red uppercase hover:underline">Log Analytics</button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-bold tracking-widest text-studio-muted uppercase">STANDBY</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {activeApp === 'VISUAL_DESIGN' ? (
          <>
            {/* Column 01: Image Assets */}
            <section id="image-assets-section" className="w-[330px] flex flex-col border-r border-studio-border bg-white/50 backdrop-blur-sm">
          <div className="p-4 border-b border-studio-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-11 h-11 flex items-center justify-center border-2 border-studio-red text-[12px] font-black text-studio-red leading-none rounded-xl">01</span>
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase">Information assets</h2>
            </div>
            <div className="px-2 py-0.5 border border-studio-border text-[8px] font-mono text-studio-muted">{assets.length.toString().padStart(2, '0')}</div>
          </div>

          <div className="p-3 space-y-4 flex-1 flex flex-col overflow-hidden">
            {/* Reference Document Area (Replacing URL Add) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-studio-muted uppercase tracking-widest">Document Ref</span>
                <span className="text-[7px] text-studio-muted opacity-60">AI Context</span>
              </div>
              <button 
                onClick={() => docInputRef.current?.click()}
                className="w-full py-1.5 border border-dashed border-studio-border bg-white/30 hover:bg-white hover:border-studio-red/50 transition-all flex items-center justify-center gap-2 group rounded-xl"
              >
                <Folder className="w-3 h-3 text-studio-muted group-hover:text-studio-red" />
                <span className="text-[9px] font-bold text-studio-muted group-hover:text-studio-red uppercase">Upload Reference</span>
              </button>
            </div>

            {/* List of uploaded documents */}
            {docs.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar mb-3">
                {docs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-white border border-studio-border group rounded-xl hover:border-studio-red/30 transition-all">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {doc.type.startsWith('image/') ? (
                        <div className="w-6 h-6 rounded-md overflow-hidden bg-studio-bg flex-shrink-0">
                           <img src={URL.createObjectURL(doc)} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-studio-red/5 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-3 h-3 text-studio-red" />
                        </div>
                      )}
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[8px] text-studio-black truncate font-black uppercase tracking-tight">{doc.name}</span>
                        <span className="text-[6px] text-studio-muted uppercase font-bold">{doc.type.split('/')[1] || 'FILE'}</span>
                      </div>
                    </div>
                    <button onClick={() => removeDoc(idx)} className="p-1 hover:bg-studio-red/10 rounded-md transition-colors">
                      <Trash2 className="w-2.5 h-2.5 text-studio-muted hover:text-studio-red" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-bold text-studio-muted uppercase tracking-widest">Library Image</span>
              <span className="text-[8px] text-studio-muted underline cursor-pointer hover:text-studio-red" onClick={() => setAssets([])}>Clear</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-1.5">
                {/* Small Import Button (Red Box) */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border border-dashed border-studio-red bg-studio-red/5 flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:bg-studio-red/10 transition-all text-center group active:scale-95 rounded-xl"
                >
                  <Upload className="w-4 h-4 text-studio-red" />
                  <p className="text-[7px] font-black text-studio-red uppercase tracking-tighter">IMPORT</p>
                </div>

                {/* Asset tiles (Blue area) */}
                {assets.map((ast, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={idx} 
                    onClick={() => {
                      setImage(ast);
                      setResult(null);
                    }}
                    className={cn(
                      "aspect-square border cursor-pointer overflow-hidden relative group transition-all rounded-xl",
                      image === ast ? "border-studio-red ring-1 ring-studio-red ring-offset-1 shadow-sm" : "border-studio-border hover:border-studio-muted"
                    )}
                  >
                    <img src={ast} alt={`Asset ${idx}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssets(prev => prev.filter((_, i) => i !== idx));
                        if (image === ast) setImage(null);
                      }}
                      className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-white/90 border border-studio-border rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <Trash2 className="w-2 h-2 text-studio-muted hover:text-studio-red" />
                    </button>
                  </motion.div>
                ))}

                {assets.length === 0 && (
                  <div className="aspect-square border border-dashed border-studio-border flex flex-col items-center justify-center text-studio-muted opacity-10">
                    <ImageIcon className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>

            {/* AI Context Analysis Section */}
            <div className="mt-auto border-t border-studio-border bg-studio-red/[0.02] p-4 min-h-[180px] max-h-[180px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3 text-studio-red">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 relative flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                      <circle cx="12" cy="12" r="10" />
                      <motion.line
                        x1="12" y1="12" x2="12" y2="7"
                        animate={isAnalyzingContext ? { rotate: 360 } : { rotate: 0 }}
                        transition={isAnalyzingContext ? { duration: 2, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
                        style={{ originX: "12px", originY: "12px" }}
                      />
                    </svg>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">{isAnalyzingContext ? "Analyzing Context..." : "AI Context Analysis"}</span>
                </div>
                <div className="px-1.5 py-0.5 border border-studio-red/30 text-[7px] font-mono opacity-50 uppercase">V_ENGINE_4.0</div>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1">
                {assets.length > 0 || docs.length > 0 ? (
                  <div className="space-y-3">
                    <div className="p-2.5 border border-studio-red/20 bg-white rounded-xl shadow-sm">
                      <div className="flex items-center justify-between mb-1 text-studio-red">
                        <p className="text-[8px] font-black uppercase tracking-tighter">Document Design study</p>
                        <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]", isAnalyzingContext ? "bg-amber-500 animate-pulse text-amber-500" : "bg-green-500 text-green-500")} />
                      </div>
                      <p className="text-[9px] text-studio-muted leading-relaxed font-medium">
                        {isAnalyzingContext ? "Extracting brand DNA and stylistic concepts from references..." : (contextAnalysis || "No context analysis generated yet. Add more specific documents or references to improve extraction.")}
                      </p>
                    </div>
                    {contextTags.length > 0 && (
                      <div className="p-2.5 border border-studio-border bg-white/50 rounded-xl">
                        <p className="text-[8px] font-black text-studio-muted mb-1.5 uppercase tracking-tighter">Key Correlations</p>
                        <div className="flex flex-wrap gap-1">
                          {contextTags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-studio-border/30 text-[7px] font-mono font-bold uppercase tracking-tighter text-studio-muted border border-studio-border rounded-md lowercase">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-4">
                    <div className="w-10 h-10 rounded-full border border-dashed border-studio-red mb-3 flex items-center justify-center animate-pulse">
                      <div className="w-2 h-2 bg-studio-red rotate-45" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-studio-red">Awaiting Space...</p>
                    <p className="text-[8px] mt-1 font-bold italic text-studio-muted">Knowledge graph will propagate once assets or docs are uploaded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Column 02: Analysis */}
        <section className="w-[450px] flex flex-col border-r border-studio-border bg-white shadow-sm overflow-hidden shrink-0">
          <div className="p-4 border-b border-studio-border flex items-center justify-between bg-white z-10">
            <div className="flex items-center gap-2">
              <span className="w-11 h-11 flex items-center justify-center border-2 border-studio-red text-[12px] font-black text-studio-red leading-none rounded-xl">02</span>
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase">Architectural Analysis</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-studio-muted uppercase">Vision v1.0</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Workspace: Split View */}
            <div className="h-[430px] flex border-b border-studio-border">
              {/* Main Workspace (Left) */}
              <div className="flex-1 bg-[#F5F5F5] relative group flex flex-col">
                <div 
                  ref={canvasRef}
                  onMouseDown={(e) => handleSelectionStart(e, 'source')}
                  onTouchStart={(e) => handleSelectionStart(e, 'source')}
                  className={cn(
                    "flex-1 relative overflow-hidden flex items-center justify-center p-2",
                    isSelectingRegion && "cursor-crosshair"
                  )}
                >
                  {image ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="relative w-full h-full flex items-center justify-center select-none"
                    >
                      <img src={image} alt="Source" className="max-w-full max-h-full object-contain shadow-2xl pointer-events-none" referrerPolicy="no-referrer" />
                      
                      {/* Selection Overlay */}
                      {activeSelectionCanvas === 'source' && selectionRect && (
                        <div 
                          className="absolute border-2 border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                          style={{
                            left: `${selectionRect.w < 0 ? selectionRect.x + selectionRect.w : selectionRect.x}%`,
                            top: `${selectionRect.h < 0 ? selectionRect.y + selectionRect.h : selectionRect.y}%`,
                            width: `${Math.abs(selectionRect.w)}%`,
                            height: `${Math.abs(selectionRect.h)}%`,
                          }}
                        >
                          <div className="absolute -top-6 left-0 bg-cyan-500 text-white text-[7px] font-black px-2 py-0.5 uppercase tracking-widest whitespace-nowrap">Selected Region</div>
                          
                          {/* Corner markers */}
                          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-white border border-cyan-500 -translate-x-1/2 -translate-y-1/2" />
                          <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-white border border-cyan-500 translate-x-1/2 -translate-y-1/2" />
                          <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-white border border-cyan-500 -translate-x-1/2 translate-y-1/2" />
                          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-white border border-cyan-500 translate-x-1/2 translate-y-1/2" />
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-[8px] font-bold uppercase tracking-widest">Workspace Empty</span>
                    </div>
                  )}
 
                  {analyzing && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 gap-2">
                      <div className="w-8 h-8 border-2 border-studio-red border-t-transparent rounded-full animate-spin" />
                      <span className="text-[8px] font-black tracking-[0.3em] text-studio-red uppercase">Extracting...</span>
                    </div>
                  )}
                </div>
 
                {/* AI Discussion & Consultant (Moved here to the blue box position) */}
                <div className="p-3 pb-8 bg-gradient-to-t from-black/5 to-transparent border-t border-studio-border/30">
                  <div className="bg-white/90 backdrop-blur-md border border-studio-border shadow-lg p-2 space-y-2 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-2.5 h-2.5 text-studio-red" />
                        <span className="text-[7.5px] font-black text-studio-muted uppercase tracking-widest">AI Consultant</span>
                      </div>
                      <select 
                        value={analysisLang}
                        onChange={(e) => setAnalysisLang(e.target.value as 'EN' | 'VI')}
                        className="bg-studio-border/50 text-[7px] font-bold px-1 outline-none rounded-md cursor-pointer"
                      >
                        <option value="EN">EN</option>
                        <option value="VI">VI</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <textarea 
                        placeholder="Discuss about improvements based on reference docs..." 
                        className="flex-1 bg-transparent border-none p-0 text-[10px] min-h-[40px] max-h-24 resize-none outline-none font-medium leading-tight placeholder:text-neutral-400"
                        value={customInstruction}
                        onChange={(e) => setCustomInstruction(e.target.value)}
                      />
                      <button 
                        onClick={handleConsultantChat}
                        disabled={!image || !customInstruction.trim() || analyzing}
                        className={cn(
                          "w-10 h-10 shrink-0 bg-studio-red text-white flex items-center justify-center shadow-md active:scale-95 transition-all rounded-xl",
                          image && !analyzing && customInstruction.trim() ? "hover:bg-studio-red/90" : "opacity-30 grayscale cursor-not-allowed"
                        )}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Sidebar (Right vertical strip) */}
              <div className="w-20 border-l border-studio-border bg-studio-bg/30 flex flex-col pt-6 p-2 pb-0 gap-2">
                {/* Analyse Button (Replacing Ref Grid) */}
                <button 
                  onClick={startAnalysis}
                  disabled={!image || analyzing}
                  className={cn(
                    "aspect-square border flex flex-col items-center justify-center gap-1 rounded-xl shadow-sm transition-all text-center p-1 group active:scale-95",
                    image && !analyzing ? "bg-studio-red text-white border-studio-red hover:saturate-150" : "bg-neutral-200 text-neutral-400 border-studio-border"
                  )}
                >
                  <Sparkles className={cn("w-4 h-4", analyzing && "animate-pulse")} />
                  <span className="text-[8.5px] font-black uppercase tracking-tighter leading-none">{analyzing ? '...' : 'ANALYSE'}</span>
                </button>
                
                <div className="flex-1 flex flex-col gap-1.5 pt-1">
                  <div className="flex items-center gap-1 mb-1 px-1">
                    <div className="h-px bg-studio-border flex-1" />
                    <span className="text-[6px] font-bold text-studio-muted">VIEWS</span>
                    <div className="h-px bg-studio-border flex-1" />
                  </div>
                  {(['ELEMENTS', 'MATERIALS', 'SCORES'] as TabType[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "w-full aspect-square flex flex-col items-center justify-center gap-1 transition-all border rounded-xl relative group",
                        activeTab === tab 
                          ? "bg-white border-studio-red text-studio-red shadow-sm" 
                          : "bg-neutral-50/50 border-transparent text-studio-muted hover:bg-white hover:border-studio-border"
                      )}
                    >
                      {tab === 'ELEMENTS' && <Layers className="w-3.5 h-3.5" />}
                      {tab === 'MATERIALS' && <Palette className="w-3.5 h-3.5" />}
                      {tab === 'SCORES' && <Sparkles className="w-3.5 h-3.5" />}
                      <span className="text-[8.5px] font-black uppercase tracking-tighter leading-none">{tab}</span>
                      {activeTab === tab && (
                        <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-studio-red rotate-45" />
                      )}
                    </button>
                  ))}
                  
                  <div className="mt-0.5" />

                  {/* Suggestion Button */}
                  <button
                    onClick={() => setActiveTab('SUGGESTIONS')}
                    className={cn(
                      "w-full aspect-square flex flex-col items-center justify-center gap-1 transition-all relative group active:scale-95",
                      activeTab === 'SUGGESTIONS' ? "text-studio-red" : "text-studio-muted opacity-70 hover:opacity-100"
                    )}
                  >
                    <Lightbulb className={cn("w-3.5 h-3.5 transition-transform", activeTab === 'SUGGESTIONS' ? "scale-110" : "group-hover:scale-110")} />
                    <span className="text-[8.5px] font-black uppercase tracking-tighter leading-none">Suggestion</span>
                    {activeTab === 'SUGGESTIONS' && (
                      <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-studio-red rotate-45" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Details (Now expanded) */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
              {result && (
                <button 
                  onClick={() => setResult(null)}
                  className="absolute top-4 right-4 z-20 p-1.5 bg-white border border-studio-border rounded-md hover:bg-neutral-50 transition-colors shadow-sm group"
                  title="Clear Analysis"
                >
                  <Trash2 className="w-3.5 h-3.5 text-studio-muted group-hover:text-studio-red" />
                </button>
              )}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {(!result && activeTab !== 'SUGGESTIONS') || (activeTab === 'SUGGESTIONS' && suggestions.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 opacity-30 grayscale">
                    <div className="w-10 h-10 rounded-full border border-studio-border flex items-center justify-center text-[8px]">!</div>
                    <p className="text-[5px] font-bold tracking-[0.3em] uppercase">
                      {activeTab === 'SUGGESTIONS' ? 'No consultant history' : 'Analysis Pending Configuration'}
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-sm prose-gray max-w-none 
                    prose-h3:text-studio-red prose-h3:uppercase prose-h3:tracking-[0.2em] prose-h3:text-[7px] prose-h3:font-black prose-h3:mb-2 prose-h3:mt-0
                    prose-p:text-[7.5px] prose-p:leading-relaxed prose-p:text-studio-text prose-p:mb-3
                    prose-li:text-[7.5px] prose-li:text-studio-text
                    prose-strong:text-studio-red prose-strong:font-bold
                    prose-table:text-[6.5px] prose-table:border prose-table:border-studio-border
                  ">
                     <ReactMarkdown>{getTabContent()}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Column 03: Render */}
        <section id="render-output-section" className="flex-1 flex flex-col bg-white overflow-hidden border-l border-studio-border">
          <div className="p-4 border-b border-studio-border flex items-center justify-between bg-white z-10">
            <div className="flex items-center gap-2">
              <span className="w-11 h-11 flex items-center justify-center border-2 border-studio-red text-[12px] font-black text-studio-red leading-none rounded-xl">03</span>
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase">Render output & Configuration</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-studio-muted border border-studio-border px-2 py-0.5">V-RAY_GS_3.0</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Workspace (Orange Box area in mockup) */}
            <div className="bg-white border-b border-studio-border p-4 flex gap-4 h-[240px]">
              {/* Part A: Basic Controls */}
              <div className="w-[180px] flex flex-col gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-studio-muted uppercase tracking-widest">Render Engine</span>
                  </div>
                  <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-2 py-1.5 border border-studio-border text-[9px] font-bold focus:border-studio-red outline-none rounded-lg"
                  >
                    <option value="gemini-2.5-flash-image">Gemini Flash Image (Fast)</option>
                    <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (Preview)</option>
                    <option value="imagen-3.0-generate-002">Imagen 3 (Standard)</option>
                    <option value="imagen-3.0-fast-generate-001">Imagen 3 (Fast)</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash (Context Only)</option>
                  </select>
                </div>
                
                <div className="space-y-1 w-full flex-shrink-0 min-w-0">
                  <span className="text-[8px] font-black text-studio-muted uppercase tracking-widest block">Aspect Ratio</span>
                  <div className="flex justify-between items-center w-full mt-2">
                    {[
                      { value: '1:1', w: 'w-3.5', h: 'h-3.5' },
                      { value: '9:16', w: 'w-2', h: 'h-4' },
                      { value: '16:9', w: 'w-4', h: 'h-2' },
                      { value: '3:4', w: 'w-[10px]', h: 'h-3.5' },
                      { value: '4:3', w: 'w-3.5', h: 'h-[10px]' }
                    ].map(r => (
                      <button 
                        key={r.value} 
                        onClick={() => setSelectedAspectRatio(r.value)}
                        className={cn(
                          "px-1 py-1.5 border flex flex-col items-center justify-center gap-1.5 transition-all rounded-lg min-w-[32px]",
                          selectedAspectRatio === r.value 
                            ? "bg-[#e8effd] border-transparent text-[#0b57d0]" 
                            : "border-transparent hover:bg-studio-red/10 hover:text-studio-red text-studio-muted"
                        )}
                      >
                         <div className={cn("border-2 border-current rounded-sm", r.w, r.h)} />
                        <span className="text-[9px] font-medium leading-none">{r.value}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Variants Selector (Blue box from mockup) */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[8px] font-black text-studio-muted uppercase tracking-widest block">Output Variants</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(count => (
                      <button 
                        key={count}
                        onClick={() => setVariantsCount(count)}
                        className={cn(
                          "flex-1 py-1.5 border text-[9px] font-bold transition-all active:scale-95 rounded-lg",
                          variantsCount === count 
                            ? "bg-studio-red border-studio-red text-white shadow-sm" 
                            : "bg-white border-studio-border text-studio-muted hover:bg-studio-bg"
                        )}
                      >
                        {count}X
                      </button>
                    ))}
                  </div>
                  <p className="text-[6px] font-medium text-studio-muted leading-tight">Max 3 variants per render request</p>
                </div>
              </div>

              {/* Part B: Center Text Area (Orange Box main area) */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2 py-1 px-3 bg-studio-red/5 border-l-2 border-studio-red">
                  <Sparkles className="w-3 h-3 text-studio-red" />
                  <span className="text-[9px] font-black text-studio-red uppercase tracking-widest">Design Description</span>
                </div>
                <textarea 
                  className="flex-1 w-full bg-studio-bg/50 border border-studio-border p-3 text-[10px] font-medium leading-relaxed resize-none outline-none focus:bg-white focus:border-studio-red/30 transition-all shadow-inner rounded-xl"
                  placeholder="Describe the final look. E.g.: Apply natural wood textures, replace chairs with Highlands brand styles, add warm interior lighting..."
                  value={renderPrompt}
                  onChange={(e) => setRenderPrompt(e.target.value)}
                />
                <div className="text-right text-[7px] font-mono text-studio-muted">{renderPrompt.length} / 500</div>
              </div>

              {/* Part C: Red Box area (Reference Assets for Render) */}
              <div className="w-[260px] border-2 border-dashed border-studio-red bg-studio-red/[0.02] p-3 flex flex-col rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-black text-studio-red uppercase tracking-widest">FURNITURE / MATERIAL REF</span>
                  <Plus className="w-3 h-3 text-studio-red cursor-pointer hover:rotate-90 transition-transform" onClick={() => refFileInputRef.current?.click()} />
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {refAssets.length > 0 ? (
                    <div className="grid grid-cols-4 gap-1.5">
                      {refAssets.map((ast, i) => (
                        <div key={i} className="aspect-square bg-white border border-studio-border relative group rounded-lg overflow-hidden">
                          {ast.startsWith('blob:') && !ast.includes('image') ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-studio-bg">
                              <FileText className="w-4 h-4 text-studio-red" />
                              <span className="text-[5px] font-black uppercase text-studio-black mt-1">DOC</span>
                            </div>
                          ) : (
                            <img src={ast} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                          <button 
                            onClick={() => setRefAssets(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                      <div className="aspect-square border border-dashed border-studio-border flex items-center justify-center cursor-pointer hover:bg-studio-red/5" onClick={() => refFileInputRef.current?.click()}>
                        <Plus className="w-4 h-4 text-studio-border group-hover:text-studio-red" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center border border-dashed border-studio-border bg-white/50 opacity-40 text-center gap-1.5 p-2">
                      <div className="w-8 h-8 rounded-full border border-studio-red flex items-center justify-center">
                        <Upload className="w-4 h-4 text-studio-red" />
                      </div>
                      <p className="text-[7px] font-bold uppercase leading-tight">
                        Import Detail Refs<br/>(Furniture, Textures)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Render Trigger Row (Reorganized) */}
            <div className="px-4 py-2 border-b border-studio-border bg-[#FBFBFB] flex items-center">
              {/* Quick Global Lighting Controls */}
              <div className="w-[180px] shrink-0 space-y-1 pr-4 border-r border-studio-border">
                <span className="text-[12px] font-black text-studio-red uppercase tracking-widest block text-center -mt-3.5 mb-1.5 drop-shadow-[0_0_3px_rgba(227,24,55,0.4)]">Quick Render Scene</span>
                <div className="flex gap-1.5 w-full mt-1">
                  <button 
                    onClick={() => handleRender('Day')}
                    disabled={rendering || !image}
                    className={cn(
                      "flex-1 py-1 border text-[9px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-30 rounded-lg",
                      activeParams.lighting === 'Day' 
                        ? "bg-studio-red border-studio-red text-white shadow-[0_0_12px_rgba(227,24,55,0.6)]" 
                        : "border-studio-border hover:bg-studio-red/10 text-studio-muted"
                    )}
                  >
                    DAY
                  </button>
                  <button 
                    onClick={() => handleRender('Night')}
                    disabled={rendering || !image}
                    className={cn(
                      "flex-1 py-1 border text-[9px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-30 rounded-lg",
                      activeParams.lighting === 'Night' 
                        ? "bg-studio-text border-studio-text text-white shadow-[0_0_12px_rgba(31,31,31,0.4)]" 
                        : "border-studio-border hover:bg-studio-text/10 text-studio-muted"
                    )}
                  >
                    NIGHT
                  </button>
                </div>
              </div>

              {/* Main Execute Button (Centered) */}
              <div className="flex-1 flex justify-center">
                <button 
                  onClick={() => handleRender()}
                  disabled={rendering || !image}
                  className={cn(
                    "px-5 py-1 text-white text-[11px] font-black tracking-[0.5em] uppercase transition-all flex items-center gap-4 shadow-xl active:scale-95 group border-2 border-transparent rounded-2xl",
                    image && !rendering ? "bg-studio-red hover:saturate-150 border-white/20" : "bg-neutral-300 grayscale opacity-40 cursor-not-allowed"
                  )}
                >
                  {rendering ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Coffee className="w-14 h-14 group-hover:rotate-12 transition-transform" />
                  )}
                  {rendering ? (
                    <div className="relative inline-flex items-center justify-center">
                      <motion.span 
                        className="text-white font-black tracking-[0.3em] relative overflow-hidden"
                        animate={{ 
                          color: ['#ffffff', '#ef4444', '#ffffff'],
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          ease: "linear" 
                        }}
                      >
                        WAITING
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/40 to-transparent w-1/2 h-full"
                          animate={{ 
                            left: ['-100%', '200%'] 
                          }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                        />
                      </motion.span>
                    </div>
                  ) : selectionRect ? 'RENDER REGION' : 'Render Image'}
                </button>
              </div>

              {/* Region Select Button (Matching your blue box) */}
              <div className="w-[180px] flex justify-end pl-4">
                <button 
                  onClick={() => {
                    setIsSelectingRegion(!isSelectingRegion);
                    if (!isSelectingRegion) setSelectionRect(null);
                  }}
                  className={cn(
                    "h-12 w-full border-2 flex flex-col items-center justify-center transition-all active:scale-95 rounded-xl group",
                    isSelectingRegion 
                      ? "bg-studio-red border-studio-red text-white shadow-[0_0_15px_rgba(227,24,55,0.4)]" 
                      : selectionRect 
                        ? "border-studio-red text-studio-red bg-studio-red/5"
                        : "border-studio-red/30 text-studio-red/50 hover:border-studio-red/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current rounded-sm flex items-center justify-center">
                      <div className="w-1 h-1 bg-current rounded-full" />
                    </div>
                    <span className="text-[9px] font-black tracking-[0.2em] uppercase">Region Select</span>
                  </div>
                  {selectionRect && (
                     <span className="text-[7px] font-bold opacity-70 mt-0.5 uppercase">
                       {isSelectingRegion ? "Drawing Area..." : "Area Locked"}
                     </span>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Output Area (Blue Box from mockup) */}
            <div className="flex-1 bg-studio-bg p-4 flex flex-col overflow-hidden">
              {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">!</div>
                  <p className="text-[10px] font-bold text-red-700 uppercase tracking-tight">{error}</p>
                  <button onClick={() => setError(null)} className="ml-auto text-[10px] font-black text-red-400 hover:text-red-600">DISMISS</button>
                </div>
              )}
              
              <div className="flex-1 bg-neutral-900 relative overflow-hidden flex group border border-white/10 shadow-2xl rounded-2xl">
                {/* Main Viewport */}
                <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
                  {/* Background grid */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none" 
                    style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
                  />
                  
                  {renderOutputs.length > 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full h-full flex flex-col"
                    >
                      <div className={cn(
                        "grid gap-4 w-full h-full p-2",
                        renderOutputs.length === 1 ? "grid-cols-1" : 
                        renderOutputs.length === 2 ? "grid-cols-2" : 
                        "grid-cols-3"
                      )}>
                        {renderOutputs.map((output, i) => (
                          <motion.div 
                            key={i}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => setActiveVariantIndex(i)}
                            onMouseDown={(e) => {
                               if (activeVariantIndex === i) {
                                   handleSelectionStart(e, 'result');
                               }
                            }}
                            onTouchStart={(e) => {
                               if (activeVariantIndex === i) {
                                   handleSelectionStart(e, 'result');
                               }
                            }}
                            className={cn(
                              "relative bg-white shadow-2xl overflow-hidden border transition-all cursor-pointer rounded-xl group/variant w-full h-full flex items-center justify-center",
                              activeVariantIndex === i ? "border-studio-red ring-2 ring-studio-red" : "border-white/10 opacity-70 hover:opacity-100",
                              isSelectingRegion && activeVariantIndex === i ? "cursor-crosshair" : ""
                            )}
                          >
                            <img 
                              src={output} 
                              alt={`Render Variant ${i + 1}`} 
                              className="max-w-full max-h-full object-contain pointer-events-none" 
                              referrerPolicy="no-referrer"
                            />
                            
                            {/* Result Selection Overlay */}
                            {activeSelectionCanvas === 'result' && selectionRect && activeVariantIndex === i && (
                              <div 
                                className="absolute border-2 border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)] pointer-events-none"
                                style={{
                                  left: `${selectionRect.w < 0 ? selectionRect.x + selectionRect.w : selectionRect.x}%`,
                                  top: `${selectionRect.h < 0 ? selectionRect.y + selectionRect.h : selectionRect.y}%`,
                                  width: `${Math.abs(selectionRect.w)}%`,
                                  height: `${Math.abs(selectionRect.h)}%`,
                                }}
                              >
                                <div className="absolute -top-6 left-0 bg-cyan-500 text-white text-[7px] font-black px-2 py-0.5 uppercase tracking-widest whitespace-nowrap">Selected Region</div>
                                
                                {/* Corner markers */}
                                <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-white border border-cyan-500 -translate-x-1/2 -translate-y-1/2" />
                                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-white border border-cyan-500 translate-x-1/2 -translate-y-1/2" />
                                <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-white border border-cyan-500 -translate-x-1/2 translate-y-1/2" />
                                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-white border border-cyan-500 translate-x-1/2 translate-y-1/2" />
                              </div>
                            )}

                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-mono px-2 py-0.5 rounded-lg border border-white/10">
                              VAR_{i + 1}
                            </div>
                            
                            {/* Hover Actions */}
                            <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover/variant:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setFullscreenImage(output); }}
                                className="p-2 bg-studio-muted text-white rounded-lg shadow-lg hover:bg-neutral-600 transition-colors"
                                title="View Fullscreen"
                              >
                                <Maximize2 className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => { 
                                   e.stopPropagation(); 
                                   if (!assets.includes(output)) {
                                       setAssets(prev => [output, ...prev]);
                                   }
                                   setImage(output);
                                }}
                                className="p-2 bg-studio-muted text-white rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
                                title="Set as Source Image"
                              >
                                <ImagePlus className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteVariant(i, e); }}
                                className="p-2 bg-studio-muted text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSave(i); }}
                                className="p-2 bg-studio-red text-white rounded-lg shadow-lg hover:scale-105 transition-transform"
                                title="Save to Device"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>

                            {activeVariantIndex === i && (
                              <div className="absolute inset-0 border-4 border-studio-red/20 pointer-events-none" />
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center gap-6 group">
                      <div className="relative">
                        <AnimatedCoffee className="w-16 h-16 text-white opacity-25 group-hover:opacity-35 transition-opacity" rendering={rendering} />
                        {rendering && (
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: '100%' }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute bottom-0 left-0 w-full overflow-hidden"
                          >
                            <AnimatedCoffee className="w-16 h-16 text-studio-red drop-shadow-[0_0_15px_rgba(227,24,55,0.4)]" rendering={rendering} />
                          </motion.div>
                        )}
                      </div>
                      <div className="text-center space-y-2 text-white/25 group-hover:text-white/35 transition-colors">
                        <p className="text-[12px] font-black tracking-[0.4em] uppercase">
                           {rendering ? 'Synthesizing Architecture' : 'Your Creative my Visual'}
                        </p>
                        <p className="text-[9px] font-bold tracking-widest opacity-60 max-w-[300px] leading-relaxed mx-auto">
                           {rendering ? 'Calculating ray-trace trajectories and material reflectance protocols' : 'Configure your render engine parameters and submit for studio processing'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Sidebar (Right - Vertical Blue Outline area from mockup) */}
                <div className="w-16 border-l border-white/5 bg-studio-red/20 backdrop-blur-md flex flex-col items-center py-8 gap-4 z-20">
                  <button 
                    onClick={() => handleSave()} 
                    disabled={renderOutputs.length === 0}
                    className={cn(
                      "w-11 h-11 flex flex-col items-center justify-center rounded-xl transition-all shadow-xl active:scale-90 group relative",
                      renderOutputs.length > 0 ? "bg-white/10 text-white hover:bg-studio-red" : "bg-white/5 text-white/20 cursor-not-allowed"
                    )}
                  >
                    <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                    <span className="text-[6px] font-black uppercase tracking-tighter mt-1">SAVE</span>
                  </button>
                  
                  <button 
                    onClick={handleAddToLibrary} 
                    disabled={renderOutputs.length === 0}
                    className={cn(
                      "w-11 h-11 flex flex-col items-center justify-center rounded-xl transition-all shadow-xl active:scale-90 group relative",
                      renderOutputs.length > 0 ? "bg-white/10 text-white hover:bg-studio-red" : "bg-white/5 text-white/20 cursor-not-allowed"
                    )}
                  >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    <span className="text-[6px] font-black uppercase tracking-tighter mt-1">LIBRARY</span>
                  </button>

                  <div className="flex-1 w-px bg-gradient-to-b from-white/10 to-transparent my-4" />
                  
                  <div className="w-8 aspect-square border border-dashed border-white/10 flex items-center justify-center text-[7px] font-mono text-white/20 uppercase">
                    8K
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
          </>
        ) : activeApp === 'BIM_BREAKDOWN' ? (
          <div className="flex-1 flex flex-col bg-studio-bg overflow-hidden relative">
            <div className="absolute inset-0 opacity-5 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
            />
            {/* BIM Breakdown Header */}
            <div className="p-6 pb-2 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-studio-red flex items-center justify-center rounded-2xl shadow-xl shadow-studio-red/20">
                  <Layers className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-studio-black tracking-widest uppercase">BIM Breakdown Dashboard</h1>
                  <p className="text-[9px] font-bold text-studio-muted tracking-[0.3em] uppercase mt-0.5 italic">Quantity Takeoff & Construction Data Integration</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {/* Compact Budget Display */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white border border-studio-border rounded-xl shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-studio-muted uppercase tracking-wider text-right">Estimated Total</span>
                    <span className="text-sm font-black text-studio-red tracking-tighter leading-none">$154,200 <span className="text-[8px] text-studio-muted italic">USD</span></span>
                  </div>
                  <div className="w-[1px] h-6 bg-studio-border" />
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-studio-muted uppercase tracking-wider">Quota</span>
                    <span className="text-[9px] font-bold text-studio-black">65% <span className="text-studio-red">▲</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 bg-white border border-studio-border text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:bg-studio-bg transition-all active:scale-95">Export IFC</button>
                  <button className="px-4 py-2 bg-studio-black text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl shadow-black/10 active:scale-95 transition-all">Submit Review</button>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 pt-2 flex gap-6 overflow-hidden">
              {/* ZONE 1: Model & 3D Viewport (Left) */}
              <div className="w-[320px] flex flex-col gap-6">
                <div className="flex-1 bg-white border border-studio-border shadow-xl rounded-2xl p-6 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black text-studio-muted uppercase tracking-widest">3D Model Hierarchy & View</span>
                    <button 
                      onClick={() => ifcFile ? setIfcFile(null) : ifcInputRef.current?.click()}
                      className={cn(
                        "p-2 rounded-xl transition-all active:scale-90 shadow-sm border",
                        ifcFile ? "bg-studio-red/10 border-studio-red/30 text-studio-red hover:bg-studio-red hover:text-white" : "bg-studio-bg border-studio-border text-studio-muted hover:border-studio-red"
                      )}
                    >
                      {ifcFile ? <Trash2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {ifcFile ? (
                    <div className="flex-1 flex flex-col gap-4">
                       {/* 3D Viewport Wrapper */}
                       <div className="relative aspect-[3/4] bg-studio-bg rounded-2xl border border-studio-border overflow-hidden group shadow-inner">
                          {isProcessingIfc ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-studio-bg/90 backdrop-blur-md z-20">
                               <div className="relative w-20 h-20 mb-6">
                                  <svg className="w-full h-full -rotate-90">
                                    <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-studio-border" />
                                    <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={226} strokeDashoffset={226 - (226 * ifcProgress) / 100} className="text-studio-red transition-all duration-300" />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                     <span className="text-[12px] font-black text-studio-black">{ifcProgress}%</span>
                                  </div>
                               </div>
                               <p className="text-[10px] font-black text-studio-red uppercase tracking-[0.2em] animate-pulse">
                                 {ifcProgress < 40 ? 'Reading Geometry...' : ifcProgress < 80 ? 'Parsing BIM Data...' : 'Correlating Vision...'}
                               </p>
                               <p className="text-[8px] text-studio-muted font-bold mt-1 uppercase">Advanced IFC Extraction Active</p>
                            </div>
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute inset-0"
                            >
                               {/* Scanning Line Effect */}
                               <motion.div 
                                 animate={{ top: ['0%', '100%', '0%'] }}
                                 transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                 className="absolute left-0 w-full h-[2px] bg-studio-red/40 shadow-[0_0_15px_rgba(153,27,27,0.5)] z-10 pointer-events-none opacity-50"
                               />

                               <div className="absolute inset-0">
                                  <BimViewer />
                               </div>
                            </motion.div>
                          )}

                          {/* Viewport UI Controls */}
                          <div className="absolute bottom-3 left-3 flex flex-col gap-2 z-10">
                             <div className="flex bg-white/90 backdrop-blur-md border border-studio-border rounded-lg shadow-sm overflow-hidden">
                                <button className="p-1.5 hover:bg-studio-red/10 transition-colors border-r border-studio-border">
                                  <Layers className="w-3 h-3 text-studio-red" />
                                </button>
                                <button className="p-1.5 hover:bg-studio-red/10 transition-colors">
                                  <SunMedium className="w-3 h-3 text-studio-muted" />
                                </button>
                             </div>
                             <div className="px-2 py-1 bg-studio-black/80 backdrop-blur-md rounded-md">
                               <p className="text-[7px] text-white font-mono tracking-tighter uppercase">FOV: 45° • FPS: 60</p>
                             </div>
                          </div>

                          <div className="absolute top-3 right-3 z-10">
                             <div className="w-8 h-8 rounded-full bg-white/80 border border-studio-border flex items-center justify-center shadow-lg">
                               <div className="w-1 h-1 bg-studio-red rounded-full" />
                             </div>
                          </div>

                          {/* Overlay Gradient */}
                          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-studio-bg to-transparent pointer-events-none" />
                       </div>

                       <div className="flex flex-col gap-1 px-1">
                          <div className="flex items-center justify-between">
                             <p className="text-[10px] font-black text-studio-black truncate uppercase">{ifcFile.name}</p>
                             <span className="text-[8px] font-mono font-bold text-studio-red">94% SYNC</span>
                          </div>
                          <p className="text-[8px] text-studio-muted uppercase tracking-widest font-bold">LOD 400 • IFC 4.3 STANDARDS</p>
                       </div>

                       <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                         <div className="text-[8px] font-black text-studio-muted uppercase mb-2 tracking-widest opacity-50">Structural nodes</div>
                         {[
                           { name: 'Core Walls', count: '14 Elements' },
                           { name: 'Floor Slabs', count: '8 Segments' },
                           { name: 'Foundation Piles', count: '22 Nodes' }
                         ].map((node, i) => (
                           <div key={i} className="flex items-center justify-between p-2 hover:bg-studio-bg rounded-lg border border-transparent hover:border-studio-border transition-all cursor-pointer">
                              <span className="text-[9px] font-bold text-studio-black">{node.name}</span>
                              <span className="text-[8px] font-mono text-studio-muted">{node.count}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-studio-border rounded-2xl bg-studio-bg/30 opacity-40 p-8 text-center gap-4 cursor-pointer hover:opacity-100 hover:border-studio-red transition-all" onClick={() => ifcInputRef.current?.click()}>
                      <div className="w-16 h-16 rounded-full bg-studio-border/30 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-studio-muted" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-studio-black uppercase">Upload IFC Specification</p>
                        <p className="text-[9px] text-studio-muted font-bold mt-1">Select 3D BIM data for 3D Viewport</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Column (Model Health & Category Breakdown) */}
              <div className="w-[350px] flex flex-col gap-6 overflow-hidden">
                {/* ZONE 2: IFC Category Breakdown (Middle Top) */}
                <div className="h-[55%] bg-white border border-studio-border shadow-xl rounded-2xl p-6 flex flex-col overflow-hidden relative">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-studio-red rounded-full" />
                        <h3 className="text-[11px] font-black text-studio-black uppercase tracking-widest">IFC Category Breakdown</h3>
                      </div>
                      <span className="text-[8px] font-mono font-bold text-studio-red bg-studio-red/5 px-2 py-0.5 rounded-md italic">Extracted from {ifcFile?.name || 'IFC.rvt'}</span>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                      {[
                        { cat: 'IfcWallStandardCase', count: 42, color: 'bg-blue-500', desc: 'Exterior & Interior Vertical Partitions' },
                        { cat: 'IfcSlab / Floor', count: 12, color: 'bg-green-500', desc: 'Level 01 Main Floor & Mezzanine' },
                        { cat: 'IfcColumn', count: 8, color: 'bg-orange-500', desc: 'Structural Support Grid 1-5' },
                        { cat: 'IfcWindow', count: 15, color: 'bg-cyan-500', desc: 'Curtain Wall Facade Elements' },
                        { cat: 'IfcDoor', count: 6, color: 'bg-purple-500', desc: 'Entrance & Service Access' },
                        { cat: 'IfcFurniture', count: 24, color: 'bg-pink-500', desc: 'Highlands Standard Seating Units' }
                      ].map((item, i) => (
                        <div key={i} className="p-3 bg-studio-bg/50 border border-studio-border/30 rounded-xl hover:border-studio-red/30 transition-all cursor-pointer group">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", item.color)} />
                              <span className="text-[10px] font-black text-studio-black uppercase">{item.cat}</span>
                            </div>
                            <span className="text-[10px] font-mono font-black text-studio-red">{item.count} <span className="text-[8px] text-studio-muted font-normal">ITEMS</span></span>
                          </div>
                          <p className="text-[8px] text-studio-muted uppercase tracking-wider font-bold mb-2">{item.desc}</p>
                          <div className="h-1 bg-white rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${(item.count / 107) * 100}%` }}
                               className={cn("h-full", item.color)}
                             />
                          </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* ZONE 4: Model Health & Sync Log (Middle Bottom) */}
                <div className="flex-1 bg-white border border-studio-border shadow-xl rounded-2xl p-6 flex flex-col overflow-hidden relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-6 bg-studio-black rounded-full" />
                    <h3 className="text-[11px] font-black text-studio-black uppercase tracking-widest">Analysis Logs</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                     <div className="p-2 border border-orange-100 bg-orange-50/30 rounded-lg">
                        <p className="text-[8.5px] font-bold text-orange-700 uppercase leading-relaxed">Geometry Clash Detected</p>
                        <p className="text-[8px] text-orange-600/80 mt-0.5">Overlap in IfcWall vs IfcFlowTerminal zones.</p>
                     </div>
                     <div className="p-2 border border-studio-border bg-studio-bg/30 rounded-lg">
                        <p className="text-[8px] text-studio-muted leading-relaxed italic">
                          Model sync at {new Date().toLocaleTimeString()} successful. Data integrity score: 0.94.
                        </p>
                     </div>
                  </div>
                </div>
              </div>

              {/* Right Column (ZONE 3 & ZONE 5) */}
               <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                 {/* ZONE 3: Quantity Takeoff Summary */}
                <div className="h-[60%] bg-white border border-studio-border shadow-2xl rounded-2xl p-8 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-black text-studio-black uppercase tracking-[0.2em]">Quantity Takeoff Summary</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[8px] font-mono text-studio-muted">LIVE_SYNC: ACTIVE</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="border-b border-studio-border">
                          <th className="pb-4 text-[9px] font-black text-studio-muted uppercase tracking-widest">Classification</th>
                          <th className="pb-4 text-[9px] font-black text-studio-muted uppercase tracking-widest">Material Specs</th>
                          <th className="pb-4 text-[9px] font-black text-studio-muted uppercase tracking-widest">Qty Extracted</th>
                          <th className="pb-4 text-[9px] font-black text-studio-muted uppercase tracking-widest">Confidence</th>
                          <th className="pb-4 text-[9px] font-black text-studio-muted uppercase tracking-widest text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-studio-border/50">
                        {[
                          { id: 'W01', name: 'Warm Oak Panel', qty: '124 m²', conf: '96%', total: '$5,580.00' },
                          { id: 'S01', name: 'Matte Black Steel (Ø12)', qty: '850 kg', conf: '92%', total: '$1,870.00' },
                          { id: 'T01', name: 'Ceramic - Highlands Red', qty: '45 m²', conf: '98%', total: '$1,732.50' },
                          { id: 'F01', name: 'Industrial Concrete Floor', qty: '210 m²', conf: '95%', total: '$2,520.00' },
                          { id: 'G01', name: 'Tempered Glass (12mm)', qty: '64 m²', conf: '88%', total: '$4,160.00' }
                        ].map((row, i) => (
                          <tr key={i} className="hover:bg-studio-red/[0.02] transition-colors group">
                            <td className="py-4 text-[9px] font-mono text-studio-red font-black">#{row.id}</td>
                            <td className="py-4 text-[10px] font-bold text-studio-black uppercase">{row.name}</td>
                            <td className="py-4 text-[9px] font-mono text-studio-muted">{row.qty}</td>
                            <td className="py-4">
                              <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[8px] font-black rounded-full shadow-sm">{row.conf}</span>
                            </td>
                            <td className="py-4 text-[10px] font-black text-studio-black text-right">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ZONE 5: Attachments & Documentation */}
                <div className="flex-1 bg-white border border-studio-border shadow-xl rounded-2xl p-6 flex flex-col overflow-hidden relative">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-studio-red" />
                        <h3 className="text-[10px] font-black text-studio-black uppercase tracking-widest">BIM Documentation & Shared Data</h3>
                      </div>
                      <button 
                        onClick={() => bimAttachmentRef.current?.click()}
                        className="text-[8px] font-black text-studio-red uppercase hover:underline"
                      >Add Documents</button>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                      {bimAttachments.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                           {bimAttachments.map((f, i) => (
                             <div key={i} className="p-3 border border-studio-border bg-studio-bg/30 rounded-xl flex items-center justify-between group">
                               <div className="flex items-center gap-3 overflow-hidden">
                                 <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                                   {f.name.endsWith('.pdf') ? <FileText className="w-4 h-4 text-red-500" /> : 
                                    f.type.includes('image') ? <ImageIcon className="w-4 h-4 text-blue-500" /> : 
                                    <Download className="w-4 h-4 text-studio-muted" />}
                                 </div>
                                 <div className="overflow-hidden">
                                   <p className="text-[9px] font-black text-studio-black truncate uppercase">{f.name}</p>
                                   <p className="text-[7.5px] text-studio-muted leading-tight">TAKE-OFF REF • SYNCED</p>
                                 </div>
                               </div>
                               <button 
                                 onClick={() => setBimAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                 className="w-6 h-6 rounded-lg hover:bg-studio-red hover:text-white flex items-center justify-center text-studio-muted transition-all opacity-0 group-hover:opacity-100"
                               >
                                 <Plus className="w-3 h-3 rotate-45" />
                               </button>
                             </div>
                           ))}
                        </div>
                      ) : (
                        <div 
                          onClick={() => bimAttachmentRef.current?.click()}
                          className="h-full border-2 border-dashed border-studio-border bg-studio-bg/20 rounded-2xl flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:border-studio-red transition-all group"
                        >
                           <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                             <Plus className="w-6 h-6 text-studio-red" />
                           </div>
                           <p className="text-[10px] font-black text-studio-black uppercase">Attach Take-off References</p>
                           <p className="text-[8px] text-studio-muted mt-1 uppercase font-bold italic">Excel, PDF, or Site Images</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-studio-bg gap-6 text-center">
            <div className="w-24 h-24 bg-studio-red text-white flex items-center justify-center rounded-[2.5rem] shadow-2xl shadow-studio-red/30 animate-pulse">
              <Sparkles className="w-12 h-12" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-studio-black uppercase tracking-widest">Library & Assets</h2>
              <p className="text-sm font-bold text-studio-muted tracking-wide mt-2 italic">Syncing with Highlands Cloud Storage...</p>
            </div>
          </div>
        )}
      </main>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*,.pdf,.doc,.docx,.txt" 
      />

      <input 
        type="file" 
        ref={refFileInputRef} 
        onChange={handleRefFileChange} 
        className="hidden" 
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt" 
      />

      <input 
        type="file" 
        ref={docInputRef} 
        onChange={handleDocChange} 
        className="hidden" 
        multiple
        accept=".pdf,.doc,.docx,.txt,image/*" 
      />

      <input 
        type="file" 
        ref={ifcInputRef} 
        onChange={handleIfcChange} 
        className="hidden" 
        accept=".ifc,.rvt" 
      />

      <input 
        type="file" 
        ref={bimAttachmentRef} 
        onChange={handleBimAttachment} 
        className="hidden" 
        multiple
        accept=".pdf,.xlsx,.xls,image/*" 
      />

      {/* Decorative corners/elements */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-studio-red/20 m-4 pointer-events-none" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-studio-red/20 m-4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-studio-red/20 m-4 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-studio-red/20 m-4 pointer-events-none" />
    </div>
  );
}

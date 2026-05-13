import { useState, useRef, ChangeEvent } from 'react';
import { Upload, Image as ImageIcon, Sparkles, Building2, Layers, SunMedium, Palette, ChevronLeft, Download, Plus, Trash2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { architectureService } from './services/architectureService.ts';
import { cn } from './lib/utils.ts';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type TabType = 'ELEMENTS' | 'MATERIALS' | 'SCORES';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('ELEMENTS');
  const [renderPrompt, setRenderPrompt] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const processImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImage(base64);
      setError(null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlAdd = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setError(null);
        setResult(null);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      setError('Could not load image from this URL.');
    }
  };

  const startAnalysis = async () => {
    if (!image) return;
    try {
      setAnalyzing(true);
      const response = await architectureService.analyzeImage(image, 'image/jpeg'); 
      setResult(response);
    } catch (err) {
      console.error(err);
      setError('An error occurred during analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col font-sans text-studio-text overflow-hidden">
      {/* Header */}
      <header className="h-16 px-6 border-b border-studio-border bg-white flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-studio-red flex items-center justify-center text-white text-xs font-bold leading-none">H</div>
            <div>
              <div className="text-[10px] font-bold tracking-[0.2em] leading-tight text-studio-black">HIGHLANDS AI STUDIO</div>
              <div className="text-[8px] tracking-[0.1em] text-studio-muted leading-tight uppercase font-medium">ARCHITECTURE VISION SYSTEM</div>
            </div>
          </div>
          <div className="h-8 w-px bg-studio-border" />
          <div className="flex items-center gap-4">
            <span className="text-xl font-black tracking-[0.2em] text-studio-red uppercase">HIGHLANDS COFFEE</span>
            <div className="h-6 w-px bg-studio-border opacity-50" />
            <span className="text-[9px] font-medium tracking-widest text-studio-muted uppercase italic">Architectural Heritage</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-bold tracking-widest text-studio-muted uppercase">STANDBY</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden architect-grid">
        {/* Column 01: Image Assets */}
        <section className="w-[340px] flex flex-col border-r border-studio-border bg-white/50 backdrop-blur-sm">
          <div className="p-4 border-b border-studio-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center border border-studio-red text-[8px] font-bold text-studio-red leading-none">01</span>
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase">Image Assets</h2>
            </div>
            <div className="px-2 py-0.5 border border-studio-border text-[8px] font-mono text-studio-muted">00 files</div>
          </div>

          <div className="p-5 space-y-6 flex-1 flex flex-col">
            {/* Drag and Drop Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[4/3] border border-dashed border-studio-border flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white transition-colors p-4 text-center group"
            >
              <Upload className="w-8 h-8 text-studio-muted group-hover:text-studio-red transition-colors" />
              <div className="space-y-1">
                <p className="text-[10px] font-medium leading-relaxed">Drag and drop images here<br/>or click to select file</p>
                <p className="text-[8px] text-studio-muted tracking-widest uppercase">JPG · PNG · WEBP</p>
              </div>
            </div>

            <div className="flex gap-1">
              <input 
                type="text" 
                placeholder="https://... Image URL" 
                className="flex-1 px-3 py-1.5 border border-studio-border text-[10px] outline-none focus:border-studio-red/50"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <button 
                onClick={handleUrlAdd}
                className="px-3 py-1.5 bg-studio-red text-white text-[9px] font-bold uppercase transition-colors hover:bg-studio-red/90"
              >
                ADD
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-studio-muted gap-2 border-t border-studio-border pt-10">
              <span className="text-[10px] tracking-widest uppercase opacity-40">No Files</span>
              <span className="text-[8px] tracking-widest uppercase opacity-40">Upload to begin</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                 <div className="h-px bg-studio-red flex-1" />
                 <span className="text-[9px] font-bold tracking-widest uppercase text-studio-red">Render Request Description</span>
              </div>
              <div className="relative">
                <textarea 
                  className="w-full h-24 p-3 border border-studio-border text-[10px] leading-relaxed resize-none outline-none focus:border-studio-red/50 bg-white"
                  placeholder="Describe what you want in the render. E.g.: 2-story Mediterranean style house, red tile roof..."
                  value={renderPrompt}
                  onChange={(e) => setRenderPrompt(e.target.value)}
                  maxLength={500}
                />
                <div className="absolute bottom-2 right-2 text-[8px] text-studio-muted">{renderPrompt.length} / 500</div>
              </div>
            </div>
          </div>
        </section>

        {/* Column 02: Analysis */}
        <section className="flex-1 flex flex-col border-r border-studio-border">
          <div className="p-4 border-b border-studio-border flex items-center justify-between bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center border border-studio-red text-[8px] font-bold text-studio-red leading-none">02</span>
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase">Architectural Analysis</h2>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Analysis Image Display - Adjusted for better visibility */}
            <div className="flex-1 bg-[#F0F0F0] border-b border-studio-border relative overflow-hidden flex items-center justify-center p-4">
              {image ? (
                <div className="relative w-full h-full flex items-center justify-center border border-studio-border bg-white shadow-inner overflow-hidden">
                  <img src={image} alt="Selected" className="max-w-full max-h-full object-contain" />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-[8px] text-white font-mono uppercase tracking-widest backdrop-blur-sm">Source View</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-studio-muted">
                   <ImageIcon className="w-12 h-12 opacity-20" />
                   <span className="text-[10px] tracking-widest uppercase opacity-40">No image selected</span>
                </div>
              )}
              {analyzing && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 gap-3">
                  <div className="w-10 h-10 border-2 border-studio-red border-t-transparent rounded-full animate-spin" />
                  <span className="text-[9px] font-bold tracking-[0.2em] text-studio-red uppercase">Scanning Architecture...</span>
                </div>
              )}
            </div>

            <div className="p-4 flex gap-2 border-b border-studio-border bg-white shadow-sm">
              <button 
                onClick={startAnalysis}
                disabled={!image || analyzing}
                className="px-6 py-2 bg-studio-border text-studio-muted text-[10px] font-bold uppercase flex items-center gap-2 transition-all hover:bg-studio-red hover:text-white disabled:opacity-50 disabled:hover:bg-studio-border disabled:hover:text-studio-muted"
              >
                <Sparkles className="w-3 h-3" />
                Analyse
              </button>
              <input 
                type="text" 
                placeholder="Custom instruction (optional)..." 
                className="flex-1 px-3 py-2 border border-studio-border text-[10px] outline-none focus:border-studio-red/50"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
              />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-studio-border bg-white">
              {(['ELEMENTS', 'MATERIALS', 'SCORES'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-bold tracking-widest transition-all relative",
                    activeTab === tab ? "text-studio-red" : "text-studio-muted border-l border-studio-border first:border-l-0"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-[2px] bg-studio-red" />
                  )}
                </button>
              ))}
            </div>

            {/* Results Area */}
            <div className="h-[250px] overflow-y-auto p-6 bg-white/30 backdrop-blur-[1px]">
              {!result ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-studio-muted">
                  <div className="w-10 h-10 rounded-full border border-studio-border flex items-center justify-center text-[12px] opacity-40">!</div>
                  <p className="text-[10px] font-bold tracking-[0.2em] leading-relaxed uppercase opacity-40">
                    Select Image<br/>Then Press<br/><span className="text-studio-red">Analyse</span>
                  </p>
                </div>
              ) : (
                <div className="prose prose-sm prose-gray max-w-none 
                  prose-h3:text-studio-red prose-h3:uppercase prose-h3:tracking-widest prose-h3:text-[11px] prose-h3:font-bold
                  prose-p:text-[10px] prose-p:leading-relaxed prose-p:text-studio-text
                  prose-li:text-[10px] prose-li:text-studio-text
                  prose-strong:text-studio-red prose-strong:font-bold
                  prose-table:text-[9px] prose-table:border prose-table:border-studio-border
                ">
                   <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Column 03: Render */}
        <section className="w-[340px] flex flex-col bg-white/50 backdrop-blur-sm">
          <div className="p-4 border-b border-studio-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center border border-studio-red text-[8px] font-bold text-studio-red leading-none">03</span>
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase">Render output</h2>
            </div>
            <div className="px-2 py-0.5 border border-studio-border text-[8px] font-mono text-studio-muted">Imagen 3</div>
          </div>

          <div className="p-5 flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[9px] font-bold text-studio-muted uppercase tracking-widest whitespace-nowrap">Model</span>
                <select className="flex-1 px-3 py-1.5 border border-studio-border text-[10px] outline-none">
                  <option>Standard Model (Free)</option>
                  <option>Imagen 3 (Generate)</option>
                  <option>Imagen 3 (Refine)</option>
                </select>
                <span className="text-[9px] font-bold text-studio-muted uppercase tracking-widest whitespace-nowrap">Ratio</span>
                <select className="px-3 py-1.5 border border-studio-border text-[10px] outline-none">
                  <option>16:9</option>
                  <option>4:3</option>
                  <option>1:1</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[9px] font-bold text-studio-muted uppercase tracking-widest">Add</span>
                <input 
                  type="text" 
                  placeholder="E.g.: golden hour, rainy, minimalist..." 
                  className="flex-1 px-3 py-1.5 border border-studio-border text-[10px] outline-none focus:border-studio-red/50"
                />
              </div>

              <button className="w-full py-3 bg-[#D4C4C4] text-white text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-studio-red transition-all flex items-center justify-center gap-2">
                <Palette className="w-4 h-4" />
                Render
              </button>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-100 mb-6 flex flex-col gap-2">
              <p className="text-[9px] leading-relaxed font-medium">
                <strong>Imagen 3</strong> requires an API key with Imagen access enabled in <strong>Google AI Studio</strong>. If you see 403 errors, please check your permission settings.
              </p>
            </div>

            <div className="flex-1 border border-dashed border-studio-border flex flex-col items-center justify-center text-center gap-4 p-8">
               <ImageIcon className="w-10 h-10 opacity-20" />
               <p className="text-[10px] font-bold tracking-[0.2em] leading-relaxed uppercase opacity-40">
                Analyse image first<br/>then press <span className="text-studio-red">Render</span><br/>to generate final image<br/>using Imagen 3
               </p>
            </div>

            <div className="mt-6 flex gap-2">
              <button className="flex-1 py-2 border border-studio-border text-[9px] font-bold uppercase tracking-widest hover:bg-studio-bg transition-colors flex items-center justify-center gap-2">
                <Download className="w-3 h-3" />
                Save
              </button>
              <button className="flex-1 py-2 border border-studio-border text-[9px] font-bold uppercase tracking-widest hover:bg-studio-bg transition-colors flex items-center justify-center gap-2">
                <Plus className="w-3 h-3" />
                Add to Library
              </button>
              <button className="px-3 py-2 border border-studio-border text-[9px] font-bold text-studio-muted">
                ---
              </button>
            </div>
          </div>
        </section>
      </main>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*" 
      />

      {/* Decorative corners/elements */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-studio-red/20 m-4 pointer-events-none" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-studio-red/20 m-4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-studio-red/20 m-4 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-studio-red/20 m-4 pointer-events-none" />
    </div>
  );
}

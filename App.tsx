
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppMode, NavTab, ImageSize, CreativeConcept, PosterConfig, PosterRecommendation, CameraFacingMode, GeneratedImage, User } from './types';
import { generateEyewearImage, generateCreativeConcepts, generatePosterImage, analyzeAndSuggestPosterConfigs, ensureApiKey } from './services/geminiService';
import { Button } from './components/Button';
import { FeatureCard } from './components/FeatureCard';
import { Spinner } from './components/Spinner';
import { PromptEnhancer } from './components/PromptEnhancer';
import { IconCamera, IconUpload, IconModel, IconCreative, IconPoster, IconGallery, IconUser, IconSettings } from './components/Icons';

const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>(NavTab.CREATE);
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [showOriginal, setShowOriginal] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  }, []);

  const startCamera = async (forceMode?: CameraFacingMode) => {
    stopCamera();
    const modeToUse = forceMode || facingMode;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: modeToUse, width: { ideal: 1920 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play();
      }
      setIsCameraOpen(true);
      setFacingMode(modeToUse);
    } catch (err) { setError("摄像头启动失败"); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreviewUrl(dataUrl);
        setImageBase64(dataUrl.split(',')[1]);
        stopCamera();
        setGeneratedImage(null);
        setMode(AppMode.DASHBOARD);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setPreviewUrl(URL.createObjectURL(file));
      const base64 = await convertBlobToBase64(file);
      setImageBase64(base64);
      setGeneratedImage(null);
      setMode(AppMode.DASHBOARD);
    }
  };

  const handleTrial = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    }
    // Set dummy user data for trial entry
    setUser({ name: "试用体验官", phoneNumber: "12345678901" });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-sm:px-4 max-w-sm space-y-16 animate-fade-in">
          <div className="text-center space-y-8">
            <div className="w-24 h-24 bg-white text-black text-6xl font-serif font-black rounded-[2.5rem] flex items-center justify-center mx-auto shadow-[0_0_100px_rgba(255,255,255,0.1)]">L</div>
            <div className="space-y-4">
              <div className="space-y-3">
                <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic font-serif">Lyra</h1>
                <p className="text-zinc-600 text-[10px] tracking-[0.5em] uppercase font-bold">The Creative Atelier</p>
              </div>
              <p className="text-zinc-500 text-xs font-light max-w-[200px] mx-auto leading-relaxed">
                欢迎来到眼镜摄影工坊。当前为内测阶段，您可以直接开启试用体验。
              </p>
            </div>
          </div>
          <div className="space-y-8 text-center">
            <Button 
              onClick={handleTrial} 
              className="w-full h-20 rounded-[2rem] bg-white text-black font-black text-sm tracking-[0.2em] uppercase shadow-[0_20px_60px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
            >
              开启试用体验
            </Button>
            <p className="text-[9px] text-zinc-800 uppercase tracking-[0.4em] font-black">
              Digital Craftsmanship • AI Powered
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isCameraOpen) {
    return (
      <div className="fixed inset-0 bg-black z-[200] flex flex-col overflow-hidden animate-fade-in font-serif">
        <video ref={videoRef} className={`flex-1 object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} autoPlay playsInline muted />
        <div className="absolute inset-x-0 bottom-0 p-12 flex justify-between items-center bg-gradient-to-t from-black to-transparent">
          <button onClick={stopCamera} className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px] hover:text-white transition-colors">Cancel</button>
          <button onClick={capturePhoto} className="w-24 h-24 rounded-full border-[2px] border-white/10 flex items-center justify-center p-2 group bg-white/5 backdrop-blur-md">
            <div className="w-full h-full bg-white rounded-full group-active:scale-95 transition-transform"></div>
          </button>
          <button onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')} className="w-12 h-12 glass-light rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col lg:flex-row font-sans selection:bg-white selection:text-black">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-zinc-950 border-r border-white/5 h-screen sticky top-0 transition-all z-50">
        <div className="p-12 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white text-black rounded-xl font-serif font-black flex items-center justify-center text-2xl shadow-xl">L</div>
            <span className="font-black text-2xl tracking-tighter uppercase italic font-serif">Lyra</span>
          </div>
          <span className="text-[9px] text-zinc-700 uppercase tracking-[0.4em] font-black">Professional Edition</span>
        </div>
        
        <div className="flex-1 px-8 py-4 space-y-3 overflow-y-auto">
          <NavItem active={activeTab === NavTab.CREATE} onClick={() => { setActiveTab(NavTab.CREATE); setMode(AppMode.DASHBOARD); }} icon={<IconCreative />} label="创作中心" />
          <NavItem active={activeTab === NavTab.GALLERY} onClick={() => setActiveTab(NavTab.GALLERY)} icon={<IconGallery />} label="资产画廊" />
          
          <div className="pt-16 pb-4 px-4 text-[9px] font-black text-zinc-800 uppercase tracking-[0.3em]">Recent Activity</div>
          <div className="space-y-4 px-2">
             {history.slice(0, 5).map(h => (
               <div key={h.id} onClick={() => { setGeneratedImage(h.url); setMode(AppMode.RESULT); setActiveTab(NavTab.CREATE); }} className="flex items-center gap-4 group cursor-pointer">
                 <img src={h.url} className="w-12 h-12 rounded-[1rem] object-cover border border-white/5 shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-700" />
                 <div className="min-w-0">
                    <p className="text-[9px] font-black text-zinc-500 group-hover:text-zinc-200 truncate tracking-widest italic font-serif uppercase transition-colors">#{h.id}</p>
                    <p className="text-[8px] text-zinc-800 uppercase tracking-[0.2em] font-black">{h.type}</p>
                 </div>
               </div>
             ))}
             {history.length === 0 && <p className="text-[9px] text-zinc-800 italic px-2 tracking-widest">NO ASSETS GENERATED</p>}
          </div>
        </div>

        <div className="p-10">
           <div className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-white/5 border border-white/5 cursor-pointer group hover:border-white/20 transition-all" onClick={() => setActiveTab(NavTab.PROFILE)}>
             <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-black border border-white/10">
               {user.name[0]}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-[10px] font-black tracking-widest uppercase">{user.name}</p>
               <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">Premium Account</p>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Studio Area */}
      <main className="flex-1 flex flex-col relative pb-32 lg:pb-0 h-screen overflow-y-auto bg-gradient-to-br from-black to-zinc-950">
        <div className="container mx-auto px-10 py-10 lg:px-20 lg:py-20 max-w-7xl">
          {activeTab === NavTab.CREATE && (
            <div className="space-y-24 animate-fade-in">
              {!imageBase64 ? (
                <div className="space-y-24 py-12 lg:py-20 text-center lg:text-left">
                  <div className="space-y-8">
                    <h1 className="text-7xl lg:text-[10rem] font-black tracking-tighter leading-[0.85] text-white font-serif italic">
                      Vision<br /><span className="text-zinc-800">Redefined.</span>
                    </h1>
                    <p className="text-zinc-600 text-lg lg:text-2xl max-w-2xl font-light leading-relaxed mx-auto lg:mx-0">
                      欢迎来到数字摄影的未来。利用顶级生成算法，为您的眼镜产品定制商业级影像方案。
                    </p>
                  </div>
                  
                  <div className="flex flex-col lg:flex-row items-center gap-12 border-t border-white/5 pt-16">
                     <div className="text-left space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700">Studio Setup</p>
                        <p className="text-white text-lg font-serif italic">准备好捕捉您的第一个焦点了吗？</p>
                     </div>
                     <div className="flex gap-4">
                        <Button variant="secondary" onClick={() => startCamera()} className="h-16 rounded-full px-10 border-white/10">启动拍摄系统</Button>
                        <Button onClick={() => fileInputRef.current?.click()} className="h-16 rounded-full px-10">导入本地素材</Button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
                     </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-16 items-start">
                  {/* Primary Canvas - Shows original, spinner, or result */}
                  <div className="xl:col-span-7 space-y-12">
                    <div className="aspect-[3/4] rounded-[4rem] overflow-hidden shadow-[0_100px_150px_rgba(0,0,0,0.9)] border border-white/5 relative group bg-zinc-950">
                      {/* Original Preview Image - Only visible when NO result OR user is holding 'compare' */}
                      <img 
                        src={previewUrl!} 
                        className={`w-full h-full object-cover transition-all duration-700 ${ ((mode === AppMode.RESULT && generatedImage) && !showOriginal) || isGenerating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} 
                      />

                      {/* Result Image Layer */}
                      {mode === AppMode.RESULT && generatedImage && (
                         <img 
                           src={generatedImage} 
                           className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${showOriginal || isGenerating ? 'opacity-0 scale-110' : 'opacity-100 scale-100 animate-fade-in'}`} 
                         />
                      )}

                      {/* Loading/Generating Overlay */}
                      {isGenerating && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-black/60 backdrop-blur-3xl animate-fade-in z-10">
                           <div className="w-16 h-16 border-t-2 border-white rounded-full animate-spin"></div>
                           <p className="text-[10px] text-white/50 uppercase tracking-[0.5em] animate-pulse font-black">Digital Fabrication...</p>
                        </div>
                      )}

                      {/* Quick Controls Overlay */}
                      {!isGenerating && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-4 backdrop-blur-sm z-20">
                           {mode === AppMode.RESULT && generatedImage && (
                              <button 
                                onTouchStart={() => setShowOriginal(true)}
                                onTouchEnd={() => setShowOriginal(false)}
                                onMouseDown={() => setShowOriginal(true)} 
                                onMouseUp={() => setShowOriginal(false)}
                                onMouseLeave={() => setShowOriginal(false)}
                                className="h-12 px-6 rounded-full bg-white/20 border border-white/20 backdrop-blur-md font-black text-[10px] uppercase tracking-widest text-white active:scale-95 transition-all"
                              >
                                按住对比原图
                              </button>
                           )}
                           <div className="flex gap-4">
                              <Button onClick={() => { setPreviewUrl(null); setImageBase64(''); setMode(AppMode.DASHBOARD); setGeneratedImage(null); }} variant="outline" className="h-12 rounded-full backdrop-blur-md">清空画布</Button>
                              <Button onClick={() => fileInputRef.current?.click()} className="h-12 rounded-full">重选素材</Button>
                           </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Controls for Result Mode */}
                    {mode === AppMode.RESULT && !isGenerating && generatedImage && (
                       <div className="flex justify-between items-center px-8 animate-fade-in">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">Digital Asset</p>
                             <p className="text-white text-sm font-serif italic">渲染资产已就绪</p>
                          </div>
                          <div className="flex gap-4">
                             <Button variant="secondary" onClick={() => setMode(AppMode.DASHBOARD)} className="h-14 rounded-full px-8 text-[9px]">再次渲染</Button>
                             <a 
                               href={generatedImage} 
                               download={`lyra_${Date.now()}.png`} 
                               className="bg-white text-black font-black flex items-center justify-center px-8 h-14 rounded-full text-[9px] tracking-widest uppercase transition-transform hover:-translate-y-1 shadow-2xl"
                             >
                               下载作品
                             </a>
                          </div>
                       </div>
                    )}
                  </div>

                  {/* Engine Console */}
                  <div className="xl:col-span-5 space-y-12">
                    {mode === AppMode.DASHBOARD && (
                      <div className="space-y-16 animate-fade-in py-10">
                        <div className="space-y-4">
                          <h2 className="text-5xl font-black tracking-tighter uppercase italic font-serif">Engine Selection</h2>
                          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">选择视觉渲染工艺</p>
                        </div>
                        <div className="space-y-4">
                           <FeatureCard 
                             title="顶级模特大片" 
                             description="高精度映射与高级商业布光系统" 
                             icon={<IconModel />} 
                             onClick={() => checkKeyAndRun(async () => generateEyewearImage(imageBase64, "High-end fashion model, luxury studio lighting, high contrast, elegant facial features", imageSize, userPrompt), "Model Shot")} 
                           />
                           <FeatureCard 
                             title="超感创意视觉" 
                             description="探索极简艺术与超现实主义材质" 
                             icon={<IconCreative />} 
                             onClick={() => checkKeyAndRun(async () => generateEyewearImage(imageBase64, "Minimalist creative eyewear photography, architectural abstract background, soft cinematic shadows", imageSize, userPrompt), "Creative Shot")} 
                           />
                           <FeatureCard 
                             title="商业海报系统" 
                             description="全自动专业平面排版与商业化布局" 
                             icon={<IconPoster />} 
                             onClick={() => { setMode(AppMode.POSTER_GENERATION); }} 
                           />
                        </div>
                        
                        <div className="pt-8 border-t border-white/5">
                           <PromptEnhancer 
                             value={userPrompt} 
                             onChange={setUserPrompt} 
                             mode={mode} 
                           />
                        </div>
                      </div>
                    )}

                    {mode === AppMode.RESULT && generatedImage && (
                       <div className="space-y-12 py-10 animate-fade-in">
                          <div className="space-y-4">
                            <h2 className="text-5xl font-black tracking-tighter uppercase italic font-serif">Visual Vault</h2>
                            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">最近生成的视觉资产</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             {history.slice(0, 4).map(h => (
                                <div 
                                  key={h.id} 
                                  onClick={() => setGeneratedImage(h.url)} 
                                  className={`aspect-square rounded-3xl overflow-hidden cursor-pointer group border transition-all duration-500 ${generatedImage === h.url ? 'border-white scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)]' : 'border-white/5 glass hover:border-white/20'}`}
                                >
                                   <img src={h.url} className={`w-full h-full object-cover transition-all duration-700 ${generatedImage === h.url ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`} />
                                </div>
                             ))}
                          </div>
                          <div className="pt-8">
                             <Button variant="outline" onClick={() => setMode(AppMode.DASHBOARD)} className="w-full h-16 rounded-[2rem]">调整设置重新生成</Button>
                          </div>
                       </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === NavTab.GALLERY && (
            <div className="animate-fade-in space-y-16">
              <div className="space-y-4">
                <h2 className="text-6xl lg:text-8xl font-black tracking-tighter font-serif uppercase italic">Collections</h2>
                <p className="text-zinc-700 uppercase tracking-[0.5em] text-[10px] font-black">视觉资产归档</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-10">
                 {history.length > 0 ? history.map(item => (
                   <div 
                    key={item.id} 
                    className="aspect-[3/4] glass rounded-[2.5rem] overflow-hidden group relative cursor-pointer" 
                    onClick={() => { 
                      setGeneratedImage(item.url); 
                      setPreviewUrl(imageBase64 || item.url); 
                      setMode(AppMode.RESULT); 
                      setActiveTab(NavTab.CREATE); 
                    }}
                   >
                     <img src={item.url} className="w-full h-full object-cover transition-all duration-[1.5s] group-hover:scale-110 grayscale group-hover:grayscale-0" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 p-8 flex flex-col justify-end">
                       <p className="text-[9px] font-black text-white uppercase tracking-[0.3em] mb-1">{item.type}</p>
                       <p className="text-[8px] text-white/40 uppercase font-serif italic tracking-widest">#{item.id}</p>
                     </div>
                   </div>
                 )) : (
                   <div className="col-span-full py-60 text-center text-zinc-800 font-black uppercase tracking-[0.6em] italic text-sm">ARCHIVE IS EMPTY</div>
                 )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Floating Island Navigation */}
        <div className="lg:hidden fixed bottom-10 left-1/2 -translate-x-1/2 w-[85%] max-w-sm h-20 glass rounded-[2.5rem] flex items-center justify-between px-10 z-[100] border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
          <MobileNavItem active={activeTab === NavTab.CREATE} onClick={() => setActiveTab(NavTab.CREATE)} icon={<IconCreative />} label="STUDIO" />
          
          <div className="relative -mt-16">
             <button onClick={() => startCamera()} className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] border-[8px] border-black transition-transform active:scale-90">
                <IconCamera />
             </button>
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -top-6 -right-2 w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-white border-2 border-black shadow-xl"
              >
                <IconUpload />
             </button>
          </div>

          <MobileNavItem active={activeTab === NavTab.GALLERY} onClick={() => setActiveTab(NavTab.GALLERY)} icon={<IconGallery />} label="VAULT" />
        </div>
      </main>

      {/* Full screen blocking loading for first-time generations */}
      {isGenerating && !generatedImage && (
        <div className="fixed inset-0 bg-black z-[400] flex flex-col items-center justify-center gap-12 animate-fade-in px-10">
          <div className="w-32 h-32 border-t border-zinc-900 border-t-white rounded-full animate-spin"></div>
          <div className="text-center space-y-4">
            <p className="text-[10px] font-black tracking-[0.8em] uppercase text-zinc-700">Studio Processing Engine</p>
            <h2 className="text-white font-serif italic text-4xl tracking-tighter">Manufacturing Your Vision...</h2>
            <p className="text-zinc-600 text-xs font-light max-w-xs mx-auto">正在为您构建高精细数字影像资产，通常需要几秒钟时间。</p>
          </div>
        </div>
      )}
    </div>
  );

  async function checkKeyAndRun(action: () => Promise<string>, type: string) {
    setIsGenerating(true);
    setError(null);
    try {
      await ensureApiKey();
      const url = await action();
      setGeneratedImage(url);
      setMode(AppMode.RESULT);
      setHistory(prev => [{ id: Math.random().toString(36).substr(2, 4).toUpperCase(), url, type, timestamp: Date.now() }, ...prev]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "生成失败");
      if (err.message?.includes("Requested entity was not found") && window.aistudio) {
        window.aistudio.openSelectKey();
      }
      setMode(AppMode.DASHBOARD);
    } finally {
      setIsGenerating(false);
    }
  }
};

const NavItem = ({ active, onClick, icon, label }: any) => (
  <div onClick={onClick}
import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Upload, Trash2, Copy, Plus, Sparkles, 
  ChevronRight, ZoomIn, ZoomOut, CheckCircle2, Move, HelpCircle, RefreshCw
} from 'lucide-react';
import { MagnetDesign } from '../types';

interface MagnetDesignerProps {
  designs: MagnetDesign[];
  activeDesignId: string | null;
  setActiveDesignId: (id: string | null) => void;
  onUpdateDesign: (design: MagnetDesign) => void;
  onAddDesign: (design: MagnetDesign) => void;
  onDeleteDesign: (id: string) => void;
  onCloneDesign: (id: string) => void;
  onRequestQuote?: () => void;
}

export default function MagnetDesigner({
  designs,
  activeDesignId,
  setActiveDesignId,
  onUpdateDesign,
  onAddDesign,
  onDeleteDesign,
  onCloneDesign,
  onRequestQuote
}: MagnetDesignerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 3D rotation state for visual mockup reflection on mouse hover
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glossX, setGlossX] = useState(50);
  const [glossY, setGlossY] = useState(50);
  const [isHovered, setIsHovered] = useState(false);

  // Safe fetch of active design
  const activeDesign = designs.find(d => d.id === activeDesignId) || designs[0];

  // Local editor positions to allow instant react updates and binding
  const [imgZoom, setImgZoom] = useState(100);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);

  // Drag-to-pan physics state using PointerEvents (smooth for desktop + touch)
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 50, y: 50 });

  // Load individual design parameters into our local controls on selection change
  useEffect(() => {
    if (activeDesign) {
      setImgZoom(activeDesign.cropZoom ?? 100);
      setPosX(activeDesign.cropX ?? 50);
      setPosY(activeDesign.cropY ?? 50);
    }
  }, [activeDesign?.id]);

  // Handle 3D Tilt Effect on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;

    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    
    // Convert to percentage coordinates for gloss reflection
    const glossPercentX = (x / box.width) * 100;
    const glossPercentY = (y / box.height) * 100;
    setGlossX(glossPercentX);
    setGlossY(glossPercentY);

    // Dynamic rotation angle limits
    const calcX = -(y - box.height / 2) / 6; 
    const calcY = (x - box.width / 2) / 6;
    
    setRotateX(calcX);
    setRotateY(calcY);
  };

  const handleMouseLeave = () => {
    if (isDragging) return;
    setRotateX(0);
    setRotateY(0);
    setGlossX(50);
    setGlossY(50);
    setIsHovered(false);
  };

  const updateActiveProperty = (property: Partial<MagnetDesign>) => {
    if (!activeDesign) return;
    onUpdateDesign({
      ...activeDesign,
      ...property
    });
  };

  const updateActiveCrop = (zoom: number, x: number, y: number) => {
    if (!activeDesign) return;
    onUpdateDesign({
      ...activeDesign,
      cropZoom: zoom,
      cropX: x,
      cropY: y
    });
  };

  // Drag-to-pan operations using Pointer Capture
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeDesign) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setRotateX(0);
    setRotateY(0);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { x: posX, y: posY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !activeDesign) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const sensitivity = 0.45;
    const percentageDeltaX = (dx / 2.8) * sensitivity;
    const percentageDeltaY = (dy / 2.8) * sensitivity;

    const nextPosX = Math.max(0, Math.min(100, startPosRef.current.x + percentageDeltaX));
    const nextPosY = Math.max(0, Math.min(100, startPosRef.current.y + percentageDeltaY));

    setPosX(nextPosX);
    setPosY(nextPosY);
    updateActiveCrop(imgZoom, nextPosX, nextPosY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  // Zoom Button triggers
  const handleZoomIn = () => {
    const nextZoom = Math.min(300, imgZoom + 15);
    setImgZoom(nextZoom);
    updateActiveCrop(nextZoom, posX, posY);
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(50, imgZoom - 15);
    setImgZoom(nextZoom);
    updateActiveCrop(nextZoom, posX, posY);
  };

  const handleZoomReset = () => {
    setImgZoom(100);
    setPosX(50);
    setPosY(50);
    updateActiveCrop(100, 50, 50);
  };

  // Bulk File Upload Handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((fileRaw, index) => {
      const file = fileRaw as File;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        
        const newDesign: MagnetDesign = {
          id: `design-${Date.now()}-${index}`,
          name: file.name.substring(0, file.name.lastIndexOf('.')) || 'Photo Magnet',
          imageUrl: base64Url,
          quantity: 1,
          sizeCm: 7.5,
          cropZoom: 100,
          cropX: 50,
          cropY: 50
        };
        onAddDesign(newDesign);
        if (index === 0) {
          setActiveDesignId(newDesign.id);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateEmptyDraft = () => {
    const newDesign: MagnetDesign = {
      id: `design-${Date.now()}`,
      name: `Photo Magnet Draft #${designs.length + 1}`,
      imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=80',
      quantity: 1,
      sizeCm: 7.5,
      cropZoom: 100,
      cropX: 50,
      cropY: 50
    };
    onAddDesign(newDesign);
    setActiveDesignId(newDesign.id);
  };

  const calculateTotalQuantity = () => {
    return designs.reduce((sum, d) => sum + d.quantity, 0);
  };
  
  const getBundlePriceSummary = (totalQty: number) => {
    if (totalQty === 0) return 0;
    if (totalQty === 1) return 50;
    if (totalQty < 6) return totalQty * 50;
    if (totalQty >= 6 && totalQty < 10) {
      const remaining = totalQty - 6;
      return 250 + (remaining * 41.67);
    }
    const remaining = totalQty - 10;
    return 400 + (remaining * 40);
  };

  const totalQty = calculateTotalQuantity();
  const totalPriceEst = getBundlePriceSummary(totalQty);

  const transX = (posX - 50) * 2;
  const transY = (posY - 50) * 2;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 py-10" id="magnet-designer-root">
      
      {/* Studio Header Row */}
      <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-brand-pink-soft pb-8">
        <div>
          <h2 className="font-display text-4xl font-semibold text-brand-charcoal flex items-center justify-center sm:justify-start gap-3">
            Magnet Studio
          </h2>
          <p className="text-xs sm:text-sm text-brand-charcoal/70 font-semibold mt-1">
            Drag photo grids to position, zoom, duplicate, or adjust bulk printing orders.
          </p>
        </div>

        {/* Dynamic Cart Progress Badge */}
        <div className="bg-[#ffeef1]/80 backdrop-blur-md p-5 rounded-[24px] border border-brand-pink/35 flex flex-col items-center sm:items-end shadow-xs">
          <p className="text-[10px] uppercase font-bold text-brand-pink-dark tracking-widest font-mono">My Design Basket</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-display font-semibold text-brand-charcoal">
              {totalQty} Magnet{totalQty !== 1 ? 's' : ''}
            </span>
            <span className="text-[#ffb3c1] font-bold">•</span>
            <span className="text-2xl font-mono font-bold text-brand-charcoal">
              R{Math.round(totalPriceEst)}
            </span>
          </div>
          {totalQty < 6 ? (
            <span className="text-[11px] text-brand-pink-dark font-semibold mt-2 text-center sm:text-right">
              Assemble <span className="font-bold">{6 - totalQty} more</span> to reach the 6-pack rate (R250)!
            </span>
          ) : totalQty < 10 ? (
            <span className="text-[11px] text-[#ff85a1] font-semibold mt-2 text-center sm:text-right">
              Excellent! Add <span className="font-bold">{10 - totalQty} more</span> to qualify for maximum bulk rates (R40/u)!
            </span>
          ) : (
            <span className="text-[11px] text-[#2c4e30] mt-2 font-semibold text-center sm:text-right flex items-center gap-1.5 bg-emerald-50 p-1.5 px-3 rounded-xl border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Maximum bulk savings active (R40 each!)
            </span>
          )}
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start" id="studio-workspace-grid">
        
        {/* ================= COLUMN 1: LEFT - THE LIVE 3D INTERACTIVE MAGNET CANVAS ================= */}
        <div className="col-span-1 lg:col-span-6 flex flex-col items-center gap-6">
          
          <div className="w-full bg-white rounded-[40px] p-8 border border-brand-pink-soft shadow-xs flex flex-col items-center justify-between min-h-[490px]">
            
            <div className="w-full flex items-center justify-between pointer-events-none mb-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-brand-charcoal/50 bg-neutral-50 border border-zinc-150 p-1 px-3 rounded-full font-bold">
                <Move className="w-3.5 h-3.5 text-brand-pink-dark" /> Interactive Canvas
              </div>
              <span className="font-display text-xs font-bold text-brand-pink-dark tracking-wide bg-[#ffeef1] p-1.5 px-4 rounded-full">
                7.5 cm Perfect Square
              </span>
            </div>

            {/* Live Magnet 3D frame */}
            <div 
              style={{ perspective: '1100px' }}
              className="flex items-center justify-center my-6 py-4 w-full max-w-[290px]"
            >
              {activeDesign ? (
                <motion.div
                  id="3d-magnet-mockup"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onMouseEnter={() => setIsHovered(true)}
                  animate={{
                    rotateX: rotateX,
                    rotateY: rotateY,
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  style={{
                    transformStyle: 'preserve-3d',
                    boxShadow: isHovered 
                      ? '0 28px 50px rgba(255,117,143,0.22)' 
                      : '0 10px 24px rgba(0,0,0,0.05)'
                  }}
                  className="w-full aspect-square relative rounded-none select-none transition-shadow duration-300 pointer-events-auto border border-brand-pink-soft/30 p-0 bg-transparent"
                >
                  {/* FRONT FACE */}
                  <div 
                    style={{ 
                      backfaceVisibility: 'hidden', 
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'translateZ(1.5px)'
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="absolute inset-0 bg-[#fffbfb] overflow-hidden rounded-none cursor-grab active:cursor-grabbing touch-none select-none"
                    title="Drag inside the magnet photo to adjust focal composition"
                  >
                    <div className="w-full h-full relative overflow-hidden bg-brand-pink-soft/10">
                      <img 
                        src={activeDesign.imageUrl} 
                        alt="Aesthetic Magnet Face"
                        referrerPolicy="no-referrer"
                        style={{
                          transform: `scale(${imgZoom / 100}) translate(${transX}px, ${transY}px)`,
                          transformOrigin: 'center',
                        }}
                        className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-100 ease-out animate-fadeIn"
                      />
                      
                      {/* Guidance indicator overlay */}
                      {!isDragging && isHovered && (
                        <div className="absolute inset-x-0 bottom-3 px-3 pointer-events-none">
                          <div className="bg-brand-charcoal/90 backdrop-blur-xs text-white text-[10px] font-bold py-1.5 px-3.5 rounded-xl mx-auto w-max flex items-center gap-1.5 shadow-md">
                            <Move className="w-3.5 h-3.5 text-brand-pink" /> Drag Image Layer
                          </div>
                        </div>
                      )}

                      {isDragging && (
                        <div className="absolute inset-0 bg-brand-charcoal/20 pointer-events-none flex items-center justify-center">
                          <div className="bg-brand-charcoal/95 text-white font-mono text-[9px] p-2 rounded-xl flex items-center gap-2 shadow-lg font-bold tracking-widest uppercase">
                            <RefreshCw className="w-3.5 h-3.5 text-brand-pink animate-spin" /> Moving Frame
                          </div>
                        </div>
                      )}
                      
                      {/* Interactive Flare */}
                      {isHovered && !isDragging && (
                        <div 
                          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
                          style={{
                            background: `radial-gradient(circle at ${glossX}% ${glossY}%, rgb(255, 255, 255) 0%, rgba(255, 255, 255, 0) 55%, rgba(0, 0, 0, 0.4) 100%)`
                          }}
                        />
                      )}
                      
                      {/* Premium Lamination sheen */}
                      <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/5 mix-blend-multiply opacity-15 pointer-events-none" />
                      <div className="absolute inset-0 fridge-reflection pointer-events-none" />
                    </div>
                  </div>

                  {/* Physical 3D thickness side look */}
                  <div 
                    className="absolute inset-0 -z-20 rounded-none"
                    style={{
                      transform: 'translateZ(-3.5px)',
                      backgroundColor: '#222222',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.15)'
                    }}
                  />
                  <div 
                    className="absolute inset-0 -z-10 bg-brand-charcoal rounded-none"
                    style={{
                      transform: 'translateZ(-1.8px)',
                    }}
                  />

                </motion.div>
              ) : (
                <div className="w-56 h-56 rounded-2xl border-2 border-dashed border-brand-pink/30 flex items-center justify-center bg-zinc-50">
                  <p className="text-xs text-brand-charcoal/40 font-semibold">Select a design card to render live mockup</p>
                </div>
              )}
            </div>

            {/* Focal Frame parameters widget */}
            <div className="w-full max-w-[290px] bg-[#faf5f5] p-3.5 rounded-2xl border border-brand-pink-soft flex items-center justify-between gap-3 shadow-3xs">
              <button 
                type="button" 
                onClick={handleZoomOut}
                disabled={imgZoom <= 50}
                className="w-8.5 h-8.5 rounded-lg bg-white border border-brand-pink-soft hover:bg-brand-pink/20 flex items-center justify-center disabled:opacity-45 cursor-pointer transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4.5 h-4.5 text-brand-pink-dark" />
              </button>

              <div className="flex-1 text-center select-none">
                <span className="text-[11px] font-mono font-bold text-brand-charcoal">Zoom Layer: {imgZoom}%</span>
                <div className="flex gap-2 justify-center mt-0.5">
                  <button 
                    type="button" 
                    onClick={handleZoomReset} 
                    className="text-[9px] font-bold text-brand-pink-dark hover:underline cursor-pointer tracking-wider uppercase"
                  >
                    Auto Center
                  </button>
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleZoomIn}
                disabled={imgZoom >= 300}
                className="w-8.5 h-8.5 rounded-lg bg-white border border-brand-pink-soft hover:bg-brand-pink/20 flex items-center justify-center disabled:opacity-45 cursor-pointer transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4.5 h-4.5 text-brand-pink-dark" />
              </button>
            </div>

          </div>

          {/* Crafted design highlights note card */}
          <div className="w-full bg-gradient-to-br from-white to-[#ffeef1] rounded-[32px] p-6 border border-brand-pink-soft shadow-3xs space-y-4 text-left">
            <span className="font-display font-bold text-xs text-brand-charcoal uppercase tracking-wider block">
              The CustomVibe Craft Standard
            </span>
            <p className="text-xs text-brand-charcoal/70 leading-relaxed font-semibold">
              These are physical custom magnets wrapped by hand so your pictures stretch clean off the edge without digital clipping:
            </p>
            <div className="space-y-3.5 pt-1">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-brand-pink-dark shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-bold text-brand-charcoal leading-tight">300DPI Fine-Art Paper lamination</p>
                  <p className="text-[10.5px] text-zinc-500 leading-normal font-semibold">
                    Sealed below high-gloss shielding. Water and greasy fingers won't ruin your favorite memories.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#ff85a1] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-bold text-brand-charcoal leading-tight">Solid 3mm Matte Flat Magnet Backing</p>
                  <p className="text-[10.5px] text-zinc-500 leading-normal font-semibold">
                    Perfect alignment with our lowercase @customvibe stamp sealing the background structure.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ================= COLUMN 2: RIGHT - CUSTOM UPLOAD BATCH CONTROLS ================= */}
        <div className="col-span-1 lg:col-span-6 space-y-6">
          
          <div className="bg-white rounded-[40px] p-6 sm:p-8 border border-brand-pink-soft shadow-sm space-y-6">
            
            <div className="text-left">
              <h3 className="font-display font-bold text-lg text-brand-charcoal uppercase tracking-wider">
                My Draft Designs ({designs.length})
              </h3>
              <p className="text-xs text-zinc-500 font-semibold mt-1">Upload files, change magnet counts, or build backup templates.</p>
            </div>

            {/* Hidden Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageFileChange} 
              multiple 
              accept="image/*" 
              className="hidden" 
            />

            {/* Soft pink drag drag zone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-brand-pink/55 hover:border-brand-pink bg-[#ffeef1]/30 hover:bg-[#ffeef1]/50 p-6 rounded-[24px] text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-1.5 group select-none"
            >
              <Upload className="w-8 h-8 text-brand-pink-dark mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-brand-charcoal uppercase tracking-wide">Upload Custom Image Files</p>
              <p className="text-[10.5px] text-zinc-450 font-bold">Import multiple pictures at the same time directly</p>
            </div>

            {/* Magnet Draft Cards list */}
            <div className="space-y-3.5 max-h-[240px] overflow-y-auto pr-1">
              {designs.map((design) => {
                const isActive = design.id === activeDesignId;
                return (
                  <div
                    key={design.id}
                    id={`layout-design-item-${design.id}`}
                    onClick={() => setActiveDesignId(design.id)}
                    className={`p-3.5 rounded-[22px] border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isActive 
                        ? 'bg-[#ffeef1] border-brand-pink shadow-3xs' 
                        : 'bg-white border-brand-pink-soft hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-13 h-13 rounded-none overflow-hidden border border-brand-pink-soft shrink-0 bg-zinc-100">
                        <img
                          src={design.imageUrl}
                          alt={design.name}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-brand-charcoal/5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-display font-semibold text-xs text-brand-charcoal truncate pr-2">
                          {design.name}
                        </p>
                        <p className="text-[10.5px] text-zinc-450 font-bold mt-0.5">
                          Size: 7.5cm • Gloss Finish
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                      
                      {/* Miniature Quantity widget */}
                      <div className="flex items-center bg-white border border-brand-pink-soft rounded-xl p-0.5 shadow-3xs">
                        <button 
                          onClick={() => {
                            onUpdateDesign({
                              ...design,
                              quantity: Math.max(1, design.quantity - 1)
                            });
                          }}
                          className="w-5.5 h-5.5 rounded-lg hover:bg-neutral-100 text-brand-charcoal font-bold text-xs flex items-center justify-center cursor-pointer select-none"
                        >
                          -
                        </button>
                        <span className="w-5.5 text-center font-mono font-bold text-xs text-brand-charcoal select-none">
                          {design.quantity}
                        </span>
                        <button 
                          onClick={() => {
                            onUpdateDesign({
                              ...design,
                              quantity: design.quantity + 1
                            });
                          }}
                          className="w-5.5 h-5.5 rounded-lg hover:bg-neutral-100 text-brand-charcoal font-bold text-xs flex items-center justify-center cursor-pointer select-none"
                        >
                          +
                        </button>
                      </div>

                      {/* Controls stack */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => onCloneDesign(design.id)}
                          className="p-1.5 rounded-lg hover:bg-neutral-50 text-zinc-400 hover:text-brand-charcoal transition-colors cursor-pointer"
                          title="Duplicate templates"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {designs.length > 1 && (
                          <button
                            onClick={() => onDeleteDesign(design.id)}
                            className="p-1.5 rounded-lg hover:bg-neutral-50 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Discard design"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick add placeholder draft */}
            <button 
              id="btn-add-new-design"
              onClick={handleCreateEmptyDraft}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-brand-pink-dark/45 hover:border-brand-pink-dark text-brand-pink-dark text-xs font-semibold hover:bg-brand-pink-soft/22 transition-all flex items-center justify-center gap-2 cursor-pointer font-display"
            >
              <Plus className="w-4 h-4" /> Add Placeholder Magnet Card
            </button>

            <hr className="border-brand-pink-soft/80" />

            <div className="pt-1 text-[11px] text-zinc-500 flex items-start gap-2 font-semibold text-left">
              <HelpCircle className="w-4 h-4 text-brand-pink-dark flex-none mt-0.5 animate-pulse" />
              <p>
                Each custom template stores its distinct cropping parameters. Reposition photos seamlessly with pointer grabs on mobile or mice.
              </p>
            </div>

          </div>

          {/* Trigger Request Quote Card */}
          <div className="bg-[#ffeef1]/80 rounded-[36px] p-6 border border-brand-pink/30 space-y-4">
            <div className="flex items-center justify-between text-left">
              <div>
                <p className="font-display font-bold text-sm text-brand-charcoal">Design Session Complete?</p>
                <p className="text-[10.5px] text-zinc-550 font-bold">Compile files and verify shipping details.</p>
              </div>
              <div className="text-right">
                <span className="block font-mono font-bold text-brand-charcoal text-lg">R{Math.round(totalPriceEst)}</span>
                <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{totalQty} Magnet{totalQty !== 1 ? 's' : ''} total</span>
              </div>
            </div>
            
            <button
              id="magnet-designer-checkout-btn"
              onClick={() => {
                if (onRequestQuote) {
                  onRequestQuote();
                } else {
                  const quoteTab = document.getElementById('nav-quote-basket');
                  quoteTab?.click();
                }
              }}
              className="w-full py-4 px-4 rounded-2xl bg-brand-charcoal hover:bg-brand-pink hover:text-brand-charcoal text-white font-display font-medium text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2.5"
            >
              Get Custom Quote & Checkout
              <ChevronRight className="w-4.5 h-4.5 text-brand-pink-dark" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

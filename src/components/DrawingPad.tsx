import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import * as htmlToImage from 'html-to-image';

const DrawingPad: React.FC = () => {
  const [tool, setTool] = useState('pen');
  const [lines, setLines] = useState<any[]>([]);
  const [color, setColor] = useState('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isDrawing = useRef(false);
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const isFull = !!document.fullscreenElement;
        setIsFullscreen(isFull);
        
        setDimensions({
          width: isFull ? window.innerWidth : containerRef.current.offsetWidth,
          height: isFull ? window.innerHeight : window.innerHeight - 300
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    document.addEventListener('fullscreenchange', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      document.removeEventListener('fullscreenchange', updateSize);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool, color, strokeWidth, points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleUndo = () => {
    setLines(lines.slice(0, -1));
  };

  const handleClear = () => {
    if (window.confirm('Clear entire drawing?')) {
      setLines([]);
    }
  };

  const handleExport = async () => {
    if (!stageRef.current) return;
    try {
      const uri = stageRef.current.toDataURL();
      const link = document.createElement('a');
      link.download = `drawing_${new Date().getTime()}.png`;
      link.href = uri;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async () => {
    if (!stageRef.current || !navigator.share) {
      alert('Sharing is not supported on this browser.');
      return;
    }
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        const canvas = stageRef.current.toCanvas();
        canvas.toBlob(resolve);
      });
      
      if (blob) {
        const file = new File([blob], `drawing_${new Date().getTime()}.png`, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: 'My Construction Drawing',
          text: 'Check out this sketch from Pixar World Construction.'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Grid background
  const gridSize = 40;
  const gridLines = [];
  for (let i = 0; i < dimensions.width / gridSize; i++) {
    gridLines.push(<Line key={`v-${i}`} points={[i * gridSize, 0, i * gridSize, dimensions.height]} stroke="#e2e8f0" strokeWidth={1} />);
  }
  for (let i = 0; i < dimensions.height / gridSize; i++) {
    gridLines.push(<Line key={`h-${i}`} points={[0, i * gridSize, dimensions.width, i * gridSize]} stroke="#e2e8f0" strokeWidth={1} />);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200 shrink-0">
            <i className="fa-solid fa-pen-ruler text-2xl"></i>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Drawing Pad</h2>
            <p className="text-slate-500 font-medium mt-1">Sketch site layouts, measurements, or quick ideas on the grid.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <i className="fa-solid fa-download text-blue-500"></i>
            Save PNG
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 rounded-2xl font-bold text-white hover:bg-black transition-all shadow-lg shadow-slate-100 active:scale-95"
          >
            <i className="fa-solid fa-share-nodes"></i>
            Share
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Toolbar */}
        <div className="lg:col-span-1 flex lg:flex-col gap-3 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
          <button 
            onClick={() => setTool('pen')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${tool === 'pen' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            title="Pen Tool"
          >
            <i className="fa-solid fa-pen"></i>
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${tool === 'eraser' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            title="Eraser Tool"
          >
            <i className="fa-solid fa-eraser"></i>
          </button>
          <div className="h-px bg-slate-200 lg:my-2 hidden lg:block"></div>
          <button 
            onClick={handleUndo}
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"
            title="Undo"
          >
            <i className="fa-solid fa-rotate-left"></i>
          </button>
          <button 
            onClick={handleClear}
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
            title="Clear All"
          >
            <i className="fa-solid fa-trash-can"></i>
          </button>
          <div className="h-px bg-slate-200 lg:my-2 hidden lg:block"></div>
          <button 
            onClick={toggleFullscreen}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isFullscreen ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
          </button>
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-11 space-y-4">
          <div className="flex flex-wrap items-center gap-6 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Color</span>
              <div className="flex gap-2">
                {['#0f172a', '#3b82f6', '#ef4444', '#10b981', '#f59e0b'].map(c => (
                  <button 
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 scale-125' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Size</span>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={strokeWidth} 
                onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-xs font-bold text-slate-600 w-4">{strokeWidth}</span>
            </div>
          </div>

          <div ref={containerRef} className="bg-white rounded-[3rem] border-4 border-slate-200 shadow-inner overflow-hidden cursor-crosshair relative">
            <Stage
              width={dimensions.width}
              height={dimensions.height}
              onMouseDown={handleMouseDown}
              onMousemove={handleMouseMove}
              onMouseup={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              ref={stageRef}
            >
              <Layer>
                {/* Background */}
                <Rect width={dimensions.width} height={dimensions.height} fill="white" />
                {/* Grid */}
                {gridLines}
                {/* Drawing */}
                {lines.map((line, i) => (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                      line.tool === 'eraser' ? 'destination-out' : 'source-over'
                    }
                  />
                ))}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingPad;

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { TileSize, WindowType, DoorType } from '../types';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

interface Dimension {
  l: number;
  w: number;
  h?: number;
}

interface OpeningEntry<T> {
  id: string;
  type: T;
  h: number;
  w: number;
  qty: number;
}

interface FrameEntry {
  id: string;
  material: string;
  runningFt: number;
  qty: number;
}

interface FloorData {
  id: string;
  name: string;
  slab: Dimension;
  columns: number;
  beams: number;
  isManual: boolean;
}

interface RateEntry {
  material: number;
  labor: number;
  total: number;
}

const BuildHomeSection: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'dimensions' | 'structural' | 'finishing' | 'rates' | 'report'>('dimensions');
  const [rateMode, setRateMode] = useState<'separate' | 'consolidated'>('separate');

  // 1. Site Context & Slabs
  const [plotDim, setPlotDim] = useState<Dimension>({ l: 0, w: 0 });
  const [plinthHeight, setPlinthHeight] = useState<24 | 30>(24);
  const [plinthSlab, setPlinthSlab] = useState<Dimension>({ l: 0, w: 0 });
  const [plinthStruct, setPlinthStruct] = useState({ cols: 0, beams: 0, manual: false });
  const [gfSlab, setGfSlab] = useState<Dimension>({ l: 0, w: 0, h: 10 });
  const [gfStruct, setGfStruct] = useState({ cols: 0, beams: 0, manual: false });
  const [floors, setFloors] = useState<FloorData[]>([]);

  // 2. Finishing Modules
  const [bathrooms, setBathrooms] = useState({ qty: 0, l: 4, w: 7, floorTileSize: TileSize.S_1X1, wallTileSize: TileSize.S_12X18 });
  const [kitchen, setKitchen] = useState({ qty: 1, area: 80, tileSize: TileSize.S_2X2, top: 'Black Granite' });
  const [electric, setElectric] = useState({ lights: 0, amp6: 0, amp15: 0, ac: 0 });
  const [doors, setDoors] = useState<OpeningEntry<DoorType>[]>([]);
  const [windows, setWindows] = useState<OpeningEntry<WindowType>[]>([]);
  const [doorFrames, setDoorFrames] = useState<FrameEntry[]>([]);
  const [windowFrames, setWindowFrames] = useState<FrameEntry[]>([]);

  // 3. Rate Management
  const [rates, setRates] = useState<Record<string, RateEntry>>({
    slabRate: { material: 1200, labor: 450, total: 1650 },
    plumbing: { material: 8500, labor: 4500, total: 13000 },
    flooring: { material: 80, labor: 20, total: 100 },
    doorPanel: { material: 450, labor: 150, total: 600 },
    windowPanel: { material: 550, labor: 120, total: 670 },
    doorFrame: { material: 180, labor: 70, total: 250 },
    windowFrame: { material: 150, labor: 50, total: 200 },
    kitchen: { material: 650, labor: 250, total: 900 },
    electrical: { material: 1200, labor: 800, total: 2000 },
    cement: { material: 450, labor: 50, total: 500 },
    steel: { material: 75, labor: 15, total: 90 },
    sand: { material: 65, labor: 10, total: 75 },
    aggregate: { material: 55, labor: 8, total: 63 },
    bricks: { material: 12, labor: 6, total: 18 },
  } as any);

  const updateRate = (id: string, field: keyof RateEntry, value: number) => {
    setRates(prev => {
      const next = { ...prev, [id]: { ...prev[id], [field]: value } };
      if (field === 'material' || field === 'labor') {
        next[id].total = next[id].material + next[id].labor;
      }
      return next;
    });
  };

  const calculateAutoStruct = (area: number) => {
    const cols = Math.ceil(area / 160) || 0;
    const beams = Math.ceil(cols * 1.5) || 0;
    return { cols, beams };
  };

  const getCost = useCallback((id: string, mult: number) => {
    const r = rates[id] || { material: 0, labor: 0, total: 0 };
    if (rateMode === 'separate') {
      return { mat: r.material * mult, lab: r.labor * mult, total: (r.material + r.labor) * mult, rate: r.material + r.labor };
    }
    return { mat: 0, lab: 0, total: r.total * mult, rate: r.total };
  }, [rates, rateMode]);

  const totals = useMemo(() => {
    const pArea = plinthSlab.l * plinthSlab.w;
    const gArea = gfSlab.l * gfSlab.w;
    const fArea = floors.reduce((acc, f) => acc + (f.slab.l * f.slab.w), 0);
    const totalBuiltUp = pArea + gArea + fArea;

    const pS = plinthStruct.manual ? { cols: plinthStruct.cols, beams: plinthStruct.beams } : calculateAutoStruct(pArea);
    const gS = gfStruct.manual ? { cols: gfStruct.cols, beams: gfStruct.beams } : calculateAutoStruct(gArea);
    let floorCols = floors.reduce((acc, f) => acc + (f.isManual ? f.columns : calculateAutoStruct(f.slab.l * f.slab.w).cols), 0);
    let floorBeams = floors.reduce((acc, f) => acc + (f.isManual ? f.beams : calculateAutoStruct(f.slab.l * f.slab.w).beams), 0);
    
    const totalCols = pS.cols + gS.cols + floorCols;
    const totalBeams = pS.beams + gS.beams + floorBeams;

    const qty = {
      cement: Math.ceil(totalBuiltUp * 0.45),
      steel: Math.ceil(totalBuiltUp * 4.8),
      sand: Math.ceil(totalBuiltUp * 1.95),
      aggregate: Math.ceil(totalBuiltUp * 1.45),
      bricks: Math.ceil(totalBuiltUp * 24),
    };

    const doorTotalSqft = doors.reduce((acc, d) => acc + (d.h * d.w * d.qty), 0);
    const windowTotalSqft = windows.reduce((acc, w) => acc + (w.h * w.w * w.qty), 0);
    const doorFrameTotalRft = doorFrames.reduce((acc, f) => acc + (f.runningFt * f.qty), 0);
    const windowFrameTotalRft = windowFrames.reduce((acc, f) => acc + (f.runningFt * f.qty), 0);

    const costs = {
      structural: getCost('slabRate', totalBuiltUp),
      plumbing: getCost('plumbing', bathrooms.qty + (kitchen.qty * 0.5)),
      flooring: getCost('flooring', totalBuiltUp * 0.8),
      electrical: getCost('electrical', electric.lights + electric.amp6 + electric.amp15 + electric.ac),
      doorPanels: getCost('doorPanel', doorTotalSqft),
      windowPanels: getCost('windowPanel', windowTotalSqft),
      doorFrames: getCost('doorFrame', doorFrameTotalRft),
      windowFrames: getCost('windowFrame', windowFrameTotalRft),
      kitchen: getCost('kitchen', kitchen.area)
    };

    const finishingSum = costs.plumbing.total + costs.flooring.total + costs.electrical.total + costs.doorPanels.total + costs.windowPanels.total + costs.doorFrames.total + costs.windowFrames.total + costs.kitchen.total;

    return {
      totalBuiltUp, totalCols, totalBeams, qty, costs, 
      grandTotalCost: costs.structural.total + finishingSum,
      constructionSubTotal: costs.structural.total,
      finishingSubTotal: finishingSum
    };
  }, [plinthSlab, gfSlab, floors, plinthStruct, gfStruct, rates, rateMode, bathrooms, kitchen, electric, doors, windows, doorFrames, windowFrames, getCost]);

  const handleDownloadReport = async () => {
    if (!reportRef.current) return;
    
    try {
      const node = reportRef.current;
      await document.fonts.ready; 

      // Improved capture logic to fix offsets
      const dataUrl = await htmlToImage.toPng(node, { 
        pixelRatio: 2, 
        backgroundColor: '#ffffff',
        width: node.offsetWidth,
        height: node.scrollHeight,
        style: {
          margin: '0',
          padding: '48px',
          left: '0',
          top: '0',
          position: 'relative' // Changed to relative to maintain internal positioning
        }
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(dataUrl);
      const totalPdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = totalPdfHeight;
      let position = 0;
      
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, totalPdfHeight);
      heightLeft -= pdfHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - totalPdfHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, totalPdfHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Pixar_Engineering_BOQ_${Date.now()}.pdf`);
    } catch (error) {
      console.error("Report generation failed:", error);
      alert("Error generating PDF. Please ensure all data is loaded and try again.");
    }
  };

  const addDoor = () => setDoors([...doors, { id: 'dr-' + Math.random().toString(36).substr(2, 9), type: DoorType.FLUSH, h: 7, w: 3, qty: 1 }]);
  const addWindow = () => setWindows([...windows, { id: 'win-' + Math.random().toString(36).substr(2, 9), type: WindowType.SLIDING, h: 4, w: 4, qty: 1 }]);
  const addDoorFrame = () => setDoorFrames([...doorFrames, { id: 'df-' + Math.random().toString(36).substr(2, 9), material: 'Sal Wood', runningFt: 17, qty: 1 }]);
  const addWindowFrame = () => setWindowFrames([...windowFrames, { id: 'wf-' + Math.random().toString(36).substr(2, 9), material: 'Granite Stone', runningFt: 16, qty: 1 }]);

  const RateInputRow = ({ id, label }: { id: string, label: string }) => (
    <div className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100/80">
      <div className="col-span-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">{label}</div>
      {rateMode === 'separate' ? (
        <>
          <div className="col-span-4 flex items-center gap-2">
            <span className="text-[8px] font-bold text-slate-400">MAT</span>
            <input type="number" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-black shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" value={rates[id]?.material || 0} onChange={e => updateRate(id, 'material', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="col-span-4 flex items-center gap-2">
            <span className="text-[8px] font-bold text-slate-400">LAB</span>
            <input type="number" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-black shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" value={rates[id]?.labor || 0} onChange={e => updateRate(id, 'labor', parseFloat(e.target.value) || 0)} />
          </div>
        </>
      ) : (
        <div className="col-span-8">
           <input type="number" className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs font-black text-blue-600 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" value={rates[id]?.total || 0} onChange={e => updateRate(id, 'total', parseFloat(e.target.value) || 0)} />
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase leading-none">Pixar Engineering Console</h2>
          <p className="text-slate-500 font-medium">Professional Build Home Module v3.5</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm">
          {(['dimensions', 'structural', 'finishing', 'rates', 'report'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === t ? 'bg-white text-blue-600 shadow-lg scale-105' : 'text-slate-500 hover:text-slate-800'}`}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {activeTab === 'dimensions' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-3"><i className="fa-solid fa-map-location-dot text-lg"></i> Site Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Plot L x W (Ft)</label>
                    <div className="flex gap-4">
                      <input type="number" placeholder="L" className="w-1/2 bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-lg focus:ring-2 focus:ring-blue-500" value={plotDim.l || ''} onChange={e => setPlotDim({...plotDim, l: parseFloat(e.target.value) || 0})} />
                      <input type="number" placeholder="W" className="w-1/2 bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-lg focus:ring-2 focus:ring-blue-500" value={plotDim.w || ''} onChange={e => setPlotDim({...plotDim, w: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Plinth Height (Inch)</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-lg focus:ring-2 focus:ring-blue-500" value={plinthHeight} onChange={e => setPlinthHeight(parseInt(e.target.value) as 24 | 30)}>
                      <option value={24}>24" From Road Level</option>
                      <option value={30}>30" From Road Level</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Slab Hierarchy Analysis</h3><button onClick={() => setFloors([...floors, { id: 'fl-' + Math.random().toString(36).substr(2, 9), name: `Floor ${floors.length + 1}`, slab: { l: 0, w: 0, h: 10 }, columns: 0, beams: 0, isManual: false }])} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-transform active:scale-95">+ Add Floor</button></div>
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6 items-end relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-300"></div>
                    <div className="col-span-2"><h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wide">Foundation / Plinth</h4></div>
                    <div className="space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">L (Ft)</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold" value={plinthSlab.l || ''} onChange={e => setPlinthSlab({...plinthSlab, l: parseFloat(e.target.value) || 0})} /></div>
                    <div className="space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">W (Ft)</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold" value={plinthSlab.w || ''} onChange={e => setPlinthSlab({...plinthSlab, w: parseFloat(e.target.value) || 0})} /></div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 grid grid-cols-2 md:grid-cols-5 gap-6 items-end relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                    <div className="col-span-2"><h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wide">Ground Floor Slab</h4></div>
                    <div className="space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">L (Ft)</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold" value={gfSlab.l || ''} onChange={e => setGfSlab({...gfSlab, l: parseFloat(e.target.value) || 0})} /></div>
                    <div className="space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">W (Ft)</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold" value={gfSlab.w || ''} onChange={e => setGfSlab({...gfSlab, w: parseFloat(e.target.value) || 0})} /></div>
                    <div className="space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Height (Ft)</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-blue-600" value={gfSlab.h || ''} onChange={e => setGfSlab({...gfSlab, h: parseFloat(e.target.value) || 0})} /></div>
                  </div>
                  {floors.map((f) => (
                    <div key={f.id} className="bg-white p-6 rounded-[2.5rem] border border-blue-100 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-6 items-end relative animate-in fade-in">
                      <button onClick={() => setFloors(floors.filter(it => it.id !== f.id))} className="absolute -top-2 -right-2 bg-red-100 text-red-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-lg"><i className="fa-solid fa-times"></i></button>
                      <div className="col-span-2"><h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{f.name} Slab</h4></div>
                      <div className="space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">L</label><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" value={f.slab.l || ''} onChange={e => setFloors(floors.map(it => it.id === f.id ? {...it, slab: {...f.slab, l: parseFloat(e.target.value) || 0}} : it))} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">W</label><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" value={f.slab.w || ''} onChange={e => setFloors(floors.map(it => it.id === f.id ? {...it, slab: {...f.slab, w: parseFloat(e.target.value) || 0}} : it))} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Height</label><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-blue-600" value={f.slab.h || ''} onChange={e => setFloors(floors.map(it => it.id === f.id ? {...it, slab: {...f.slab, h: parseFloat(e.target.value) || 0}} : it))} /></div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'structural' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
                 <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-3 border-b border-slate-50 pb-4"><i className="fa-solid fa-foundation text-lg"></i> RCC Structural Analysis</h3>
                 <div className="space-y-8">
                   {[
                     { label: 'Foundation & Plinth', struct: plinthStruct, setStruct: setPlinthStruct, area: plinthSlab.l * plinthSlab.w },
                     { label: 'Ground Floor Slab', struct: gfStruct, setStruct: setGfStruct, area: gfSlab.l * gfSlab.w }
                   ].map((item, idx) => (
                     <div key={idx} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row gap-8 items-center shadow-sm">
                        <div className="w-48 shrink-0">
                           <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">{item.label}</h4>
                           <button onClick={() => item.setStruct({...item.struct, manual: !item.struct.manual})} className={`mt-2 text-[8px] font-black uppercase px-3 py-1.5 rounded-full border transition-all ${item.struct.manual ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-blue-600 border-blue-200'}`}>{item.struct.manual ? 'Manual' : 'Auto'}</button>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                           <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">RCC Columns</label><input type="number" disabled={!item.struct.manual} className="w-full bg-white border border-slate-200 rounded-xl p-4 font-black disabled:bg-slate-100 text-center" value={item.struct.manual ? item.struct.cols : calculateAutoStruct(item.area).cols} onChange={e => item.setStruct({...item.struct, cols: parseInt(e.target.value) || 0})} /></div>
                           <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">RCC Beams</label><input type="number" disabled={!item.struct.manual} className="w-full bg-white border border-slate-200 rounded-xl p-4 font-black disabled:bg-slate-100 text-center" value={item.struct.manual ? item.struct.beams : calculateAutoStruct(item.area).beams} onChange={e => item.setStruct({...item.struct, beams: parseInt(e.target.value) || 0})} /></div>
                        </div>
                     </div>
                   ))}
                   {floors.map((f) => (
                     <div key={f.id} className="bg-white p-6 rounded-[2rem] border border-blue-100 shadow-sm flex flex-col md:flex-row gap-8 items-center animate-in fade-in">
                        <div className="w-48 shrink-0"><h4 className="text-[11px] font-black text-blue-600 uppercase tracking-wide">{f.name}</h4><button onClick={() => setFloors(floors.map(it => it.id === f.id ? {...it, isManual: !it.isManual} : it))} className={`mt-2 text-[8px] font-black uppercase px-3 py-1.5 rounded-full border transition-all ${f.isManual ? 'bg-orange-600 text-white border-orange-700' : 'bg-slate-50 text-blue-600 border-blue-100'}`}>{f.isManual ? 'Manual' : 'Auto'}</button></div>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                           <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">RCC Columns</label><input type="number" disabled={!f.isManual} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black text-center" value={f.isManual ? f.columns : calculateAutoStruct(f.slab.l * f.slab.w).cols} onChange={e => setFloors(floors.map(it => it.id === f.id ? {...it, columns: parseInt(e.target.value) || 0} : it))} /></div>
                           <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">RCC Beams</label><input type="number" disabled={!f.isManual} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black text-center" value={f.isManual ? f.beams : calculateAutoStruct(f.slab.l * f.slab.w).beams} onChange={e => setFloors(floors.map(it => it.id === f.id ? {...it, beams: parseInt(e.target.value) || 0} : it))} /></div>
                        </div>
                     </div>
                   ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'finishing' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
               {/* Bathroom & Plumbing */}
               <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
                 <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-3 border-b border-slate-50 pb-4"><i className="fa-solid fa-faucet-drip text-lg"></i> Bathroom & Plumbing Details</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Quantity</label><input type="number" className="w-full bg-slate-50 border-none rounded-xl p-3 font-black" value={bathrooms.qty || ''} onChange={e => setBathrooms({...bathrooms, qty: parseInt(e.target.value) || 0})} /></div>
                          <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">L (ft)</label><input type="number" className="w-full bg-slate-50 border-none rounded-xl p-3 font-black" value={bathrooms.l || ''} onChange={e => setBathrooms({...bathrooms, l: parseFloat(e.target.value) || 0})} /></div>
                          <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">W (ft)</label><input type="number" className="w-full bg-slate-50 border-none rounded-xl p-3 font-black" value={bathrooms.w || ''} onChange={e => setBathrooms({...bathrooms, w: parseFloat(e.target.value) || 0})} /></div>
                       </div>
                    </div>
                 </div>
               </section>

               {/* Openings (Doors/Windows) */}
               <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                  <div className="flex justify-between items-center border-b pb-4">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Openings Inventory</h3>
                    <div className="flex gap-2">
                      <button onClick={addDoor} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">+ Door</button>
                      <button onClick={addWindow} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">+ Window</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Door List</h4>
                      {doors.map(d => (
                        <div key={d.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                          <div className="text-xs font-black">{d.qty}x {d.type} ({d.h}x{d.w})</div>
                          <button onClick={() => setDoors(doors.filter(i => i.id !== d.id))} className="text-red-400 hover:text-red-600"><i className="fa-solid fa-trash"></i></button>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Window List</h4>
                      {windows.map(w => (
                        <div key={w.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                          <div className="text-xs font-black">{w.qty}x {w.type} ({w.h}x{w.w})</div>
                          <button onClick={() => setWindows(windows.filter(i => i.id !== w.id))} className="text-red-400 hover:text-red-600"><i className="fa-solid fa-trash"></i></button>
                        </div>
                      ))}
                    </div>
                  </div>
               </section>

               {/* Frames */}
               <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                  <div className="flex justify-between items-center border-b pb-4">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Frame Configurations</h3>
                    <div className="flex gap-2">
                      <button onClick={addDoorFrame} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">+ Door Frame</button>
                      <button onClick={addWindowFrame} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">+ Window Frame</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {doorFrames.map(f => (
                      <div key={f.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                        <div className="text-xs font-black">{f.qty}x {f.material} Door Frame ({f.runningFt} Rft)</div>
                        <button onClick={() => setDoorFrames(doorFrames.filter(i => i.id !== f.id))} className="text-red-400"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    ))}
                    {windowFrames.map(f => (
                      <div key={f.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                        <div className="text-xs font-black">{f.qty}x {f.material} Window Frame ({f.runningFt} Rft)</div>
                        <button onClick={() => setWindowFrames(windowFrames.filter(i => i.id !== f.id))} className="text-red-400"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    ))}
                  </div>
               </section>

               {/* Kitchen & Electrical */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Kitchen Module</h3>
                    <div className="space-y-4">
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400">Area (Sqft)</label><input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold" value={kitchen.area} onChange={e => setKitchen({...kitchen, area: parseFloat(e.target.value) || 0})} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400">Top Material</label><select className="w-full bg-slate-50 p-3 rounded-xl font-bold" value={kitchen.top} onChange={e => setKitchen({...kitchen, top: e.target.value})}><option value="Black Granite">Black Granite</option><option value="Quartz">Quartz</option></select></div>
                    </div>
                 </section>

                 <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Electrical Point Registry</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400">Light Pts</label><input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold" value={electric.lights} onChange={e => setElectric({...electric, lights: parseInt(e.target.value) || 0})} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400">6A Sockets</label><input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold" value={electric.amp6} onChange={e => setElectric({...electric, amp6: parseInt(e.target.value) || 0})} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400">15A Power</label><input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold" value={electric.amp15} onChange={e => setElectric({...electric, amp15: parseInt(e.target.value) || 0})} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400">A.C. Pts</label><input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold" value={electric.ac} onChange={e => setElectric({...electric, ac: parseInt(e.target.value) || 0})} /></div>
                    </div>
                 </section>
               </div>
            </div>
          )}

          {activeTab === 'rates' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-12">
                 <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Global Pricing Matrix</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-l-4 border-blue-600 pl-3">Primary Build Package</p>
                       <div className="space-y-4">
                          <RateInputRow id="slabRate" label="Slab Rate (Per Sqft)" />
                          <RateInputRow id="plumbing" label="Plumbing (Per Service)" />
                          <RateInputRow id="flooring" label="Flooring (Per Sqft)" />
                          <RateInputRow id="electrical" label="Electrical (Per Point)" />
                       </div>
                    </div>
                    <div className="space-y-6">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-l-4 border-slate-900 pl-3">Civil Material Benchmarks</p>
                       <div className="space-y-4">
                          <RateInputRow id="cement" label="Cement (Per Bag)" />
                          <RateInputRow id="steel" label="Steel (Per Kg)" />
                          <RateInputRow id="sand" label="River Sand (Per Cft)" />
                       </div>
                    </div>
                 </div>
               </section>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-8 animate-in zoom-in duration-500">
               <div className="flex justify-end gap-3"><button onClick={handleDownloadReport} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all"><i className="fa-solid fa-file-pdf mr-2"></i> Download BOQ Report</button></div>
               
               <div ref={reportRef} className="bg-white p-12 rounded-lg shadow-2xl border border-slate-200 space-y-12 max-w-[900px] mx-auto min-h-[1200px] flex flex-col justify-between overflow-visible relative">
                  <div className="space-y-12">
                    <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 text-slate-900">
                      <div className="space-y-2">
                        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">PIXAR WORLD CONSTRUCTION PVT LTD</h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Professional Engineering Estimate & Bill of Quantities</p>
                      </div>
                      <div className="text-right text-[10px] font-black text-slate-400 space-y-1 uppercase tracking-widest">
                        <p>REPORT ID: PW-ENG-{(Date.now() % 1000000).toString().padStart(6, '0')}</p>
                        <p>DATE: {new Date().toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-16">
                      <div className="space-y-6">
                        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">1. SLAB SUMMARY</h2>
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between border-b border-slate-100 pb-1"><span>Plinth Foundation Area</span><span className="font-black">{(plinthSlab.l * plinthSlab.w).toLocaleString()} Sqft</span></div>
                          <div className="flex justify-between border-b border-slate-100 pb-1"><span>Ground Floor Core</span><span className="font-black">{(gfSlab.l * gfSlab.w).toLocaleString()} Sqft</span></div>
                          {floors.map((f, i) => <div key={i} className="flex justify-between border-b border-slate-100 pb-1"><span>{f.name}</span><span className="font-black">{(f.slab.l * f.slab.w).toLocaleString()} Sqft</span></div>)}
                          <div className="flex justify-between pt-2 text-blue-600 font-black text-[12px] uppercase tracking-tighter"><span>TOTAL BUILT-UP AREA</span><span>{totals.totalBuiltUp.toLocaleString()} Sqft</span></div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">2. STRUCTURAL MATRIX</h2>
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between border-b border-slate-100 pb-1"><span>Total Columns</span><span className="font-black">{totals.totalCols} Nos</span></div>
                          <div className="flex justify-between border-b border-slate-100 pb-1"><span>Total Beams</span><span className="font-black">{totals.totalBeams} Nos</span></div>
                          <div className="flex justify-between border-b border-slate-100 pb-1"><span>Plinth Height</span><span className="font-black">{plinthHeight}" from GL</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">3. RESOURCE FORECAST (BOQ)</h2>
                      <div className="grid grid-cols-3 gap-6">
                        {[
                          { label: 'CEMENT (OPC/PPC)', qty: totals.qty.cement, unit: 'BAGS', cost: getCost('cement', totals.qty.cement) },
                          { label: 'STRUCTURAL STEEL', qty: totals.qty.steel, unit: 'KG', cost: getCost('steel', totals.qty.steel) },
                          { label: 'RIVER SAND / M-SAND', qty: totals.qty.sand, unit: 'CFT', cost: getCost('sand', totals.qty.sand) }
                        ].map((m, idx) => (
                          <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                            <p className="text-2xl font-black text-slate-900 leading-none">{m.qty.toLocaleString()} <span className="text-[10px] text-blue-600 uppercase">{m.unit}</span></p>
                            <div className="pt-2 border-t border-slate-200 flex justify-between text-[9px] font-bold">
                              <span className="text-slate-400">Rate: ₹{m.cost.rate}</span>
                              <span className="text-slate-800">₹{m.cost.total.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">4. COST BREAKDOWN ANALYSIS</h2>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-[10px] text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white font-black uppercase">
                              <th className="p-3">ITEM DESCRIPTION</th>
                              <th className="p-3 text-right">TOTAL AMOUNT (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold">
                            <tr><td className="p-3 uppercase">Structural Slab Package</td><td className="p-3 text-right text-blue-700">₹{totals.costs.structural.total.toLocaleString()}</td></tr>
                            <tr><td className="p-3 uppercase">Plumbing & Drainage</td><td className="p-3 text-right text-slate-900">₹{totals.costs.plumbing.total.toLocaleString()}</td></tr>
                            <tr><td className="p-3 uppercase">Finishing (Flooring, Doors, Elec)</td><td className="p-3 text-right text-slate-900">₹{totals.finishingSubTotal.toLocaleString()}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[2.5rem] flex justify-between items-center text-white mt-12 relative overflow-hidden">
                       <div className="space-y-1 relative z-10">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">GRAND TOTAL PROJECT ESTIMATE</p>
                       </div>
                       <div className="text-right relative z-10">
                          <p className="text-5xl font-black tracking-tighter italic">₹ {totals.grandTotalCost.toLocaleString()}</p>
                       </div>
                    </div>
                  </div>

                  <div className="pt-20 flex justify-between items-end text-slate-400">
                    <div className="text-[9px] font-bold italic space-y-1">
                       <p>Generated by Pixar World Engineering Suite v3.5</p>
                    </div>
                    <div className="text-center w-72 space-y-3">
                      <div className="h-16"></div>
                      <div className="border-t-2 border-slate-900 pt-3 font-black text-slate-900 text-[10px] uppercase tracking-[0.4em]">
                        STRUCTURAL ENGINEER SIGNATORY
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6 no-print">
           <div className="bg-slate-900 rounded-[3rem] p-8 text-white min-h-[500px] flex flex-col shadow-2xl sticky top-24 border border-slate-800 overflow-hidden">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-10 border-b border-slate-800 pb-4">Real-Time Pulse</h3>
              <div className="flex-1 space-y-10">
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Total Slabs</p>
                    <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700"><p className="text-3xl font-black">{totals.totalBuiltUp.toLocaleString()} SQFT</p></div>
                 </div>
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Live Budget</p>
                    <div className="bg-gradient-to-br from-green-900/30 to-blue-900/30 p-6 rounded-3xl border border-green-900/40">
                       <p className="text-4xl font-black text-green-400">₹{totals.grandTotalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                 </div>
              </div>
              <button onClick={() => setActiveTab('report')} className="mt-8 w-full bg-blue-600 p-6 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all">Generate Certified BOQ</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default BuildHomeSection;
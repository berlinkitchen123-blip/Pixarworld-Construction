import React, { useState, useMemo } from 'react';

const UnitConverter: React.FC = () => {
  const [unitData, setUnitData] = useState({ value: 1, from: 'ft', to: 'm', category: 'length' });
  
  const inputGroupClass = "space-y-1.5";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1";
  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all";

  const unitResults = useMemo(() => {
    const conversions: Record<string, Record<string, number>> = {
      length: {
        ft: 1,
        m: 3.28084,
        in: 0.0833333,
        cm: 0.0328084,
        mm: 0.00328084,
        yard: 3
      },
      area: {
        sqft: 1,
        sqm: 10.7639,
        brass: 100,
        guntha: 1089,
        acre: 43560
      },
      volume: {
        cft: 1,
        cum: 35.3147,
        brass: 100,
        liter: 0.0353147
      },
      weight: {
        kg: 1,
        ton: 1000,
        quintal: 100,
        lb: 0.453592
      }
    };

    const cat = unitData.category;
    const fromRate = conversions[cat][unitData.from];
    const toRate = conversions[cat][unitData.to];
    const result = (unitData.value * fromRate) / toRate;
    return result.toFixed(4);
  }, [unitData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Unit Conversion</h2>
        <p className="text-slate-500 font-medium mt-1">Convert between various construction and engineering units.</p>
      </header>

      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className={inputGroupClass}>
            <label className={labelClass}>Category</label>
            <select className={inputClass} value={unitData.category} onChange={e => {
              const cat = e.target.value;
              const defaults: Record<string, {from: string, to: string}> = {
                length: { from: 'ft', to: 'm' },
                area: { from: 'sqft', to: 'sqm' },
                volume: { from: 'cft', to: 'cum' },
                weight: { from: 'kg', to: 'ton' }
              };
              setUnitData({ ...unitData, category: cat, ...defaults[cat] });
            }}>
              <option value="length">Length</option>
              <option value="area">Area</option>
              <option value="volume">Volume</option>
              <option value="weight">Weight</option>
            </select>
          </div>
          <div className={inputGroupClass}>
            <label className={labelClass}>From</label>
            <select className={inputClass} value={unitData.from} onChange={e => setUnitData({ ...unitData, from: e.target.value })}>
              {unitData.category === 'length' && ['ft', 'm', 'in', 'cm', 'mm', 'yard'].map(u => <option key={u} value={u}>{u}</option>)}
              {unitData.category === 'area' && ['sqft', 'sqm', 'brass', 'guntha', 'acre'].map(u => <option key={u} value={u}>{u}</option>)}
              {unitData.category === 'volume' && ['cft', 'cum', 'brass', 'liter'].map(u => <option key={u} value={u}>{u}</option>)}
              {unitData.category === 'weight' && ['kg', 'ton', 'quintal', 'lb'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className={inputGroupClass}>
            <label className={labelClass}>To</label>
            <select className={inputClass} value={unitData.to} onChange={e => setUnitData({ ...unitData, to: e.target.value })}>
              {unitData.category === 'length' && ['ft', 'm', 'in', 'cm', 'mm', 'yard'].map(u => <option key={u} value={u}>{u}</option>)}
              {unitData.category === 'area' && ['sqft', 'sqm', 'brass', 'guntha', 'acre'].map(u => <option key={u} value={u}>{u}</option>)}
              {unitData.category === 'volume' && ['cft', 'cum', 'brass', 'liter'].map(u => <option key={u} value={u}>{u}</option>)}
              {unitData.category === 'weight' && ['kg', 'ton', 'quintal', 'lb'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className={inputGroupClass}>
            <label className={labelClass}>Enter Value</label>
            <input 
              type="number" 
              className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 text-3xl font-black focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-blue-600" 
              value={unitData.value} 
              onChange={e => setUnitData({ ...unitData, value: parseFloat(e.target.value) || 0 })} 
            />
          </div>
          
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Converted Result</div>
              <div className="text-5xl font-black truncate">{unitResults}</div>
              <div className="text-blue-400 font-bold mt-2 uppercase tracking-widest text-xs">{unitData.to}</div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
          <h4 className="font-black text-blue-900 text-sm uppercase tracking-widest mb-3">Common Conversions</h4>
          <ul className="space-y-2 text-xs font-bold text-blue-700">
            <li className="flex justify-between"><span>1 Meter</span> <span>3.28 Feet</span></li>
            <li className="flex justify-between"><span>1 Brass (Area)</span> <span>100 Sqft</span></li>
            <li className="flex justify-between"><span>1 Brass (Volume)</span> <span>100 Cft</span></li>
            <li className="flex justify-between"><span>1 Cubic Meter</span> <span>35.31 Cft</span></li>
          </ul>
        </div>
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
          <h4 className="font-black text-emerald-900 text-sm uppercase tracking-widest mb-3">Land Units (India)</h4>
          <ul className="space-y-2 text-xs font-bold text-emerald-700">
            <li className="flex justify-between"><span>1 Guntha</span> <span>1089 Sqft</span></li>
            <li className="flex justify-between"><span>1 Acre</span> <span>40 Guntha</span></li>
            <li className="flex justify-between"><span>1 Acre</span> <span>43,560 Sqft</span></li>
            <li className="flex justify-between"><span>1 Vigha (Gujarat)</span> <span>17,424 Sqft</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UnitConverter;

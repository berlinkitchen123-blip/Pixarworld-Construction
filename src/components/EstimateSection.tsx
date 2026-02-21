import React, { useState, useEffect, useMemo } from 'react';
import { Item, ProjectType, ProjectScope, Estimate, EstimateLineItem, Customer, EstimateStatus } from '../types.ts';
import { getAISuggestedItems } from '../services/geminiService.ts';

// Safe ID Generator for all browser environments
const generateSafeId = () => {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch (e) {}
  return 'est-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
};

interface EstimateSectionProps {
  catalog: Item[];
  customers: Customer[];
  onSaveEstimate: (estimate: Estimate) => void;
  editingEstimate?: Estimate | null;
  onCancelEdit?: () => void;
}

const DEFAULT_TERMS = [
  "Plinth height up to 18inch from road level up, Foundation up to 5ft. from road level down.",
  "Steel size for above estimate will use 8mm, 10mm, 12mm, 14mm, 16mm. Larger sizes will be extra.",
  "Above rate only covers Masonry, Plaster, Foundation RCC, PCC, Slab, Beam Column RCC Work.",
  "Reti(sand), Kapchit(grit), Red Brick as per standard material available in local market.",
  "Inside 1 coat mala Plaster finish, outside 1 coat Plaster.",
  "All internal walls will be partition wall size, outer walls will be 9\" thick as per drawing.",
  "Landscape, Garden, Terrace Garden, Compound Wall, Gate, balcony railings not included in above rate.",
  "Above all item price GST not included, GST charge extra as per item.",
  "Selection of higher range of material selected by Client will be charged extra.",
  "Drinking Water, Regular use water & Electricity should be provided by client.",
  "FINAL BILL WILL BE ON THE BASIS OF ACTUAL MEASUREMENT AND ACTUAL WORK DONE."
];

const EstimateSection: React.FC<EstimateSectionProps> = ({ catalog, customers, onSaveEstimate, editingEstimate, onCancelEdit }) => {
  const [loadingAI, setLoadingAI] = useState(false);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    altMob: '',
    email: '',
    pan: '',
    profession: '',
    currentAddress: '',
    siteAddress: '',
    familyMember: '',
    projectType: ProjectType.RESIDENTIAL,
    scope: ProjectScope.BOX_CONSTRUCTION,
    budget: '',
    completionTime: '',
    salaryIncome: '',
    gstExtra: 0,
    gstCalculationMode: 'auto' as 'auto' | 'manual',
    discountValue: 0,
    discountType: 'amount' as 'amount' | 'percent'
  });

  // Auto-fill customer details if phone matches
  useEffect(() => {
    if (customerData.phone.length >= 10 && !editingEstimate) {
      const existing = customers.find(c => c.phone === customerData.phone);
      if (existing) {
        setCustomerData(prev => ({
          ...prev,
          name: existing.name,
          email: existing.email || prev.email,
          altMob: existing.altPhone || prev.altMob,
          currentAddress: existing.address,
          siteAddress: existing.siteAddress || prev.siteAddress
        }));
      }
    }
  }, [customerData.phone, customers, editingEstimate]);

  const [selectedItems, setSelectedItems] = useState<EstimateLineItem[]>([]);
  const [terms, setTerms] = useState<string[]>(DEFAULT_TERMS);

  // Initialize form if editing
  useEffect(() => {
    if (editingEstimate) {
      setCustomerData({
        name: editingEstimate.customerName,
        phone: editingEstimate.phoneNumber,
        altMob: editingEstimate.altMob || '',
        email: editingEstimate.email || '',
        pan: editingEstimate.pan || '',
        profession: editingEstimate.profession || '',
        currentAddress: editingEstimate.currentAddress,
        siteAddress: editingEstimate.siteAddress,
        familyMember: editingEstimate.familyMember || '',
        projectType: editingEstimate.projectType,
        scope: editingEstimate.scope,
        budget: editingEstimate.budget || '',
        completionTime: editingEstimate.completionTime || '',
        salaryIncome: editingEstimate.salaryIncome || '',
        gstExtra: editingEstimate.gstExtra,
        gstCalculationMode: editingEstimate.gstCalculationMode || 'auto',
        discountValue: editingEstimate.discountValue || editingEstimate.discount,
        discountType: editingEstimate.discountType || 'amount'
      });
      setSelectedItems(editingEstimate.items);
      setTerms(editingEstimate.terms);
    }
  }, [editingEstimate]);

  const addItemToEstimate = (item: Item) => {
    const rate = item.saleRate;
    const gstRate = item.gstRate || 0;
    const qty = 1;
    const volume = 1;
    const total = rate * volume * qty;
    const gstAmount = (total * gstRate) / 100;

    const newItem: EstimateLineItem = {
      itemId: item.id || generateSafeId(),
      itemName: item.name,
      lh: '-',
      wd: '-',
      unit: item.unit,
      volume,
      rate,
      qty,
      total,
      gstRate,
      gstAmount
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const updateItemField = (index: number, field: keyof EstimateLineItem, value: any) => {
    const updated = [...selectedItems];
    const item = { ...updated[index], [field]: value };
    
    if (field === 'lh' || field === 'wd') {
      const l = parseFloat(item.lh);
      const w = parseFloat(item.wd);
      if (!isNaN(l) && !isNaN(w)) {
        item.volume = Number((l * w).toFixed(2));
      }
    }
    
    item.total = item.volume * item.rate * item.qty;
    item.gstAmount = (item.total * (item.gstRate || 0)) / 100;

    updated[index] = item;
    setSelectedItems(updated);
  };

  const subTotal = useMemo(() => selectedItems.reduce((acc, curr) => acc + curr.total, 0), [selectedItems]);
  const autoGstTotal = useMemo(() => selectedItems.reduce((acc, curr) => acc + curr.gstAmount, 0), [selectedItems]);
  
  // Grouped GST for breakdown
  const gstBreakdown = useMemo(() => {
    const groups: Record<number, number> = {};
    selectedItems.forEach(item => {
      const rate = item.gstRate || 0;
      groups[rate] = (groups[rate] || 0) + item.gstAmount;
    });
    return groups;
  }, [selectedItems]);

  const effectiveGst = customerData.gstCalculationMode === 'auto' ? autoGstTotal : Number(customerData.gstExtra);

  // Calculate discount amount
  const calculatedDiscount = customerData.discountType === 'percent' 
    ? (subTotal * customerData.discountValue / 100) 
    : customerData.discountValue;

  const grandTotal = subTotal + effectiveGst - Number(calculatedDiscount);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return alert("Add items first");

    const estimate: Estimate = {
      id: editingEstimate ? editingEstimate.id : generateSafeId(),
      estimateNumber: editingEstimate ? editingEstimate.estimateNumber : `EST-${Date.now().toString().slice(-6)}`,
      date: editingEstimate ? editingEstimate.date : new Date().toLocaleDateString('en-GB'),
      ...customerData,
      customerName: customerData.name,
      phoneNumber: customerData.phone,
      items: selectedItems,
      subTotal,
      gstExtra: effectiveGst,
      discount: calculatedDiscount,
      totalAmount: grandTotal,
      terms,
      status: editingEstimate ? editingEstimate.status : EstimateStatus.PENDING,
      parentId: editingEstimate?.parentId,
      version: editingEstimate?.version || 1,
      createdAt: editingEstimate ? editingEstimate.createdAt : new Date().toISOString()
    };

    onSaveEstimate(estimate);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800">
          {editingEstimate ? `Editing Estimate ${editingEstimate.estimateNumber}` : 'Create Professional Estimate'}
        </h2>
        {editingEstimate && (
          <button onClick={onCancelEdit} className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-2">
            <i className="fa-solid fa-xmark"></i> Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-8">
        {/* Section 1: Detailed Customer Info */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-4 border-b pb-2 mb-2">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest">Customer & Project Profile</h3>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Customer Name</label>
            <input required className="w-full border-b border-slate-300 p-2 focus:border-blue-500 outline-none" 
              value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
              Mobile Number
              {customerData.phone.length >= 10 && customers.some(c => c.phone === customerData.phone) && (
                <span className="text-[9px] text-blue-600 font-black animate-pulse">
                  <i className="fa-solid fa-circle-check"></i> AUTO-FILLED
                </span>
              )}
            </label>
            <input required className="w-full border-b border-slate-300 p-2 focus:border-blue-500 outline-none" 
              value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Alt Mobile</label>
            <input className="w-full border-b border-slate-300 p-2 focus:border-blue-500 outline-none" 
              value={customerData.altMob} onChange={e => setCustomerData({...customerData, altMob: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">PAN Number</label>
            <input className="w-full border-b border-slate-300 p-2 focus:border-blue-500 outline-none" 
              value={customerData.pan} onChange={e => setCustomerData({...customerData, pan: e.target.value})} />
          </div>

          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Site Address</label>
            <input required className="w-full border-b border-slate-300 p-2 focus:border-blue-500 outline-none" 
              value={customerData.siteAddress} onChange={e => setCustomerData({...customerData, siteAddress: e.target.value})} />
          </div>

          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Current Address</label>
            <input className="w-full border-b border-slate-300 p-2 focus:border-blue-500 outline-none" 
              value={customerData.currentAddress} onChange={e => setCustomerData({...customerData, currentAddress: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Property Type</label>
            <select className="w-full border-b border-slate-300 p-2 outline-none" 
              value={customerData.projectType} onChange={e => setCustomerData({...customerData, projectType: e.target.value as ProjectType})}>
              {Object.values(ProjectType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Scope of Work</label>
            <select className="w-full border-b border-slate-300 p-2 outline-none" 
              value={customerData.scope} onChange={e => setCustomerData({...customerData, scope: e.target.value as ProjectScope})}>
              {Object.values(ProjectScope).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Estimate Completion</label>
            <input placeholder="e.g. 6 Months" className="w-full border-b border-slate-300 p-2 focus:border-blue-500 outline-none" 
              value={customerData.completionTime} onChange={e => setCustomerData({...customerData, completionTime: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Budget</label>
            <input placeholder="Approx Budget" className="w-full border-b border-slate-300 p-2 focus:border-blue-500 outline-none" 
              value={customerData.budget} onChange={e => setCustomerData({...customerData, budget: e.target.value})} />
          </div>
        </div>

        {/* Section 2: Line Items Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Measurement & Pricing Table</h3>
            <button 
              type="button" 
              onClick={() => {
                const newItem: EstimateLineItem = {
                  itemId: generateSafeId(),
                  itemName: '',
                  lh: '-',
                  wd: '-',
                  unit: 'Unit',
                  volume: 1,
                  rate: 0,
                  qty: 1,
                  total: 0,
                  gstRate: 18,
                  gstAmount: 0
                };
                setSelectedItems([...selectedItems, newItem]);
              }}
              className="text-xs font-black bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i> Add Custom Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-black text-slate-500">
                  <th className="px-4 py-3">Sr.</th>
                  <th className="px-4 py-3 w-1/5">Item Name</th>
                  <th className="px-4 py-3 text-center">L / H</th>
                  <th className="px-4 py-3 text-center">W / D</th>
                  <th className="px-4 py-3 text-center">Unit</th>
                  <th className="px-4 py-3 text-center">GST%</th>
                  <th className="px-4 py-3 text-center">Price</th>
                  <th className="px-4 py-3 text-center">Qty.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedItems.map((item, idx) => (
                  <tr key={idx} className="text-sm hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <input className="w-full border-none focus:ring-0 bg-transparent font-medium" 
                        value={item.itemName} onChange={e => updateItemField(idx, 'itemName', e.target.value)} />
                    </td>
                    <td className="px-2 py-3">
                      <input className="w-16 mx-auto border border-slate-200 rounded text-center p-1" 
                        value={item.lh} onChange={e => updateItemField(idx, 'lh', e.target.value)} />
                    </td>
                    <td className="px-2 py-3">
                      <input className="w-16 mx-auto border border-slate-200 rounded text-center p-1" 
                        value={item.wd} onChange={e => updateItemField(idx, 'wd', e.target.value)} />
                    </td>
                    <td className="px-2 py-3">
                      <input className="w-16 mx-auto border border-slate-200 rounded text-center p-1" 
                        value={item.unit} onChange={e => updateItemField(idx, 'unit', e.target.value)} />
                    </td>
                    <td className="px-2 py-3">
                      <select className="w-20 mx-auto border border-slate-200 rounded p-1 text-xs"
                        value={item.gstRate} onChange={e => updateItemField(idx, 'gstRate', parseInt(e.target.value))}>
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      <input type="number" step="any" className="w-24 mx-auto border border-slate-200 rounded text-center p-1" 
                        value={item.rate} onChange={e => updateItemField(idx, 'rate', parseFloat(e.target.value))} />
                    </td>
                    <td className="px-2 py-3">
                      <input type="number" className="w-16 mx-auto border border-slate-200 rounded text-center p-1" 
                        value={item.qty} onChange={e => updateItemField(idx, 'qty', parseFloat(e.target.value))} />
                    </td>
                    <td className="px-4 py-3 text-right font-bold">₹{item.total.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-8 bg-slate-50 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* GST Summary Breakdown */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">GST Breakdown Summary</h4>
                 <div className="flex gap-2">
                    <button type="button" 
                      onClick={() => setCustomerData({...customerData, gstCalculationMode: 'auto'})}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${customerData.gstCalculationMode === 'auto' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      AUTO (Line-based)
                    </button>
                    <button type="button"
                      onClick={() => setCustomerData({...customerData, gstCalculationMode: 'manual'})}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${customerData.gstCalculationMode === 'manual' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      MANUAL OVERRIDE
                    </button>
                 </div>
              </div>
              
              {customerData.gstCalculationMode === 'auto' ? (
                <div className="space-y-2">
                  {Object.entries(gstBreakdown).map(([rate, amount]) => (amount as number) > 0 && (
                    <div key={rate} className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">GST @ {rate}%</span>
                      <span className="font-bold text-slate-700">₹{(amount as number).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  {autoGstTotal === 0 && <p className="text-xs text-slate-400 italic">No GST applied to any line items.</p>}
                  <div className="border-t pt-2 flex justify-between items-center text-blue-700 font-black uppercase text-xs">
                    <span>Total Computed GST</span>
                    <span>₹{autoGstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Enter Manual GST Amount (₹)</p>
                  <div className="relative">
                    <i className="fa-solid fa-indian-rupee-sign absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-8 font-black text-orange-600 focus:ring-2 focus:ring-orange-500 outline-none" 
                      value={customerData.gstExtra} onChange={e => setCustomerData({...customerData, gstExtra: parseFloat(e.target.value) || 0})} />
                  </div>
                  <p className="text-[10px] text-orange-400 italic font-medium">Manual mode ignores line-item specific GST rates.</p>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="flex flex-col items-end space-y-4">
              <div className="flex gap-10 items-center">
                <span className="text-slate-500 font-black uppercase text-xs tracking-widest">Sub Total</span>
                <span className="text-xl font-bold text-slate-700">₹{subTotal.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex gap-10 items-center">
                <span className="text-slate-500 font-black uppercase text-xs tracking-widest">Effective GST</span>
                <span className={`text-xl font-bold ${customerData.gstCalculationMode === 'manual' ? 'text-orange-600' : 'text-blue-600'}`}>+ ₹{effectiveGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex gap-4 items-center">
                <span className="text-slate-500 font-black uppercase text-xs tracking-widest">Discount</span>
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  <button 
                    type="button" 
                    onClick={() => setCustomerData({...customerData, discountType: 'amount'})}
                    className={`px-3 py-1 text-xs font-bold ${customerData.discountType === 'amount' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}
                  >₹</button>
                  <button 
                    type="button" 
                    onClick={() => setCustomerData({...customerData, discountType: 'percent'})}
                    className={`px-3 py-1 text-xs font-bold ${customerData.discountType === 'percent' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}
                  >%</button>
                  <input 
                    type="number" 
                    className="w-24 p-1 text-right outline-none font-bold" 
                    value={customerData.discountValue} 
                    onChange={e => setCustomerData({...customerData, discountValue: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <span className="text-xs text-green-600 font-black w-20 text-right">(- ₹{calculatedDiscount.toLocaleString('en-IN')})</span>
              </div>

              <div className="border-t-2 border-slate-900 pt-5 flex gap-10 items-center">
                <span className="text-slate-900 font-black text-lg uppercase tracking-widest">Estimate Grand Total</span>
                <span className="text-4xl font-black text-blue-700">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Quick Add & AI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-plus-circle text-blue-500"></i> Quick Add Catalog
            </h4>
            <div className="flex flex-wrap gap-2">
              {catalog.map(item => (
                <button key={item.id} type="button" onClick={() => addItemToEstimate(item)} 
                  className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-600 hover:text-white transition-all group">
                  {item.name} <span className="text-[9px] text-slate-400 group-hover:text-blue-200 ml-1">{item.gstRate}%</span>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-yellow-400"></i> AI Suggestion Engine
              </h4>
              <p className="text-xs text-indigo-200">Generate project-specific items based on scope and type with suggested tax rates.</p>
            </div>
            <button type="button" disabled={loadingAI} onClick={async () => {
              setLoadingAI(true);
              const items = await getAISuggestedItems(customerData.scope);
              items.forEach((i: any) => addItemToEstimate(i));
              setLoadingAI(false);
            }} className="mt-4 bg-white text-indigo-900 font-bold py-2 rounded-xl text-sm hover:scale-105 transition-transform active:scale-95">
              {loadingAI ? 'Thinking...' : 'Analyze Scope & Add Suggestions'}
            </button>
          </div>
        </div>

        {/* Section 4: Terms & Technical Details Editor */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-gavel text-slate-400"></i> Terms, Technical Details & Payment Terms
            </h3>
            <button type="button" onClick={() => setTerms([...terms, ''])} className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors">
              + Add Row
            </button>
          </div>
          <div className="space-y-2">
            {terms.map((term, i) => (
              <div key={i} className="flex gap-3 group items-start">
                <span className="text-slate-400 font-bold mt-2 text-xs">{i+1}.</span>
                <textarea 
                  rows={1}
                  className="flex-1 border-none focus:ring-0 text-sm py-1 bg-transparent border-b border-transparent focus:border-slate-200 resize-none overflow-hidden" 
                  onInput={(e) => {
                    (e.target as HTMLTextAreaElement).style.height = 'auto';
                    (e.target as HTMLTextAreaElement).style.height = (e.target as HTMLTextAreaElement).scrollHeight + 'px';
                  }}
                  value={term} 
                  onChange={e => {
                    const next = [...terms];
                    next[i] = e.target.value;
                    setTerms(next);
                  }} 
                />
                <button type="button" onClick={() => setTerms(terms.filter((_, idx) => idx !== i))} 
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity mt-1">
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button type="submit" className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-2xl hover:bg-black transition-all active:scale-95">
            {editingEstimate ? 'UPDATE ESTIMATE' : 'GENERATE PROFESSIONAL ESTIMATE'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EstimateSection;
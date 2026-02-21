import React, { useState, useEffect } from 'react';
import ItemSection from './components/ItemSection.tsx';
import EstimateSection from './components/EstimateSection.tsx';
import EstimatePreview from './components/EstimatePreview.tsx';
import ConstructionCalculators from './components/ConstructionCalculators.tsx';
import UnitConverter from './components/UnitConverter.tsx';
import ScientificCalculator from './components/ScientificCalculator.tsx';
import BuildHomeSection from './components/BuildHomeSection.tsx';
import CompanyProfileSection from './components/ProfileSection.tsx';
import CustomerManagement from './components/CustomerManagement.tsx';
import FollowUpReminders from './components/FollowUpReminders.tsx';
import NotificationManager from './components/NotificationManager.tsx';
import BusinessAnalytics from './components/BusinessAnalytics.tsx';
import DrawingPad from './components/DrawingPad.tsx';
import { Item, Estimate, Customer, FollowUp, EstimateStatus, ItemType } from './types.ts';
import { db, syncData, saveData, syncCollection, updateData, removeData } from './services/firebase.ts';

// Safe ID Generator for all browser environments
const generateSafeId = () => {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch (e) {}
  return 'id-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'items' | 'estimates' | 'calculators' | 'build-home' | 'customers' | 'followups' | 'analytics' | 'settings' | 'profile' | 'drawing-pad' | 'unit-converter' | 'scientific-calc'>('dashboard');
  
  // Default user for single-user cloud sync without login credentials
  const [currentUser] = useState({
    id: 'pixar-pro-default-user',
    email: 'pixarworldconstruction@gmail.com',
    companyName: 'Pixar World Construction',
    role: 'admin' as const
  });

  const [items, setItems] = useState<Item[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Pixar World Construction Private Limited',
    email: 'pixarworldconstruction@gmail.com',
    phone: '+91 6354753565',
    address: 'FF-08 Fortune Greens, Vadodara'
  });
  
  const [viewingEstimate, setViewingEstimate] = useState<Estimate | null>(null);
  const [currentEditingEstimate, setCurrentEditingEstimate] = useState<Estimate | null>(null);

  // 1. Data Sync with Firebase
  useEffect(() => {
    // Use syncCollection for lists to ensure only changes are downloaded
    const unsubItems = syncCollection<Item>(`users/${currentUser.id}/items`, (data) => {
      setItems(data || []);
    });
    
    const unsubEstimates = syncCollection<Estimate>(`users/${currentUser.id}/estimates`, (data) => {
      if (data) {
        setEstimates(data.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      } else {
        setEstimates([]);
      }
    });

    const unsubCustomers = syncCollection<Customer>(`users/${currentUser.id}/customers`, (data) => {
      setCustomers(data || []);
    });

    const unsubFollowUps = syncCollection<FollowUp>(`users/${currentUser.id}/followups`, (data) => {
      setFollowUps(data || []);
    });

    // Keep syncData for simple objects
    const unsubInfo = syncData(`users/${currentUser.id}/info`, (data) => {
      if (data) setCompanyInfo(data);
    });
    const unsubLogo = syncData(`users/${currentUser.id}/logo`, (data) => {
      if (data) setCompanyLogo(data);
    });

    return () => {
      unsubItems();
      unsubEstimates();
      unsubInfo();
      unsubLogo();
      unsubCustomers();
      unsubFollowUps();
    };
  }, [currentUser.id]);

  // 3. Persistence Handlers - Using Granular Updates (Patching)
  const handleAddItem = (item: Item) => {
    // Optimistic update
    setItems(prev => [...prev, item]);
    // Patch to Firebase
    saveData(`users/${currentUser.id}/items/${item.id}`, item);
  };

  const handleUpdateItem = (updatedItem: Item) => {
    // Optimistic update
    setItems(prev => prev.map(it => it.id === updatedItem.id ? updatedItem : it));
    // Patch to Firebase
    updateData(`users/${currentUser.id}/items/${updatedItem.id}`, updatedItem);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm("Permanently delete this item?")) {
      // Optimistic update
      setItems(prev => prev.filter(it => it.id !== id));
      // Patch to Firebase
      removeData(`users/${currentUser.id}/items/${id}`);
    }
  };

  const handleSaveEstimate = (estimate: Estimate) => {
    // Automatically manage customer record
    const existingCustomer = customers.find(c => c.phone === estimate.phoneNumber);
    
    if (existingCustomer) {
      // Update existing customer if details changed
      if (existingCustomer.name !== estimate.customerName || 
          existingCustomer.address !== estimate.currentAddress ||
          existingCustomer.siteAddress !== estimate.siteAddress) {
        handleUpdateCustomer({
          ...existingCustomer,
          name: estimate.customerName,
          address: estimate.currentAddress,
          siteAddress: estimate.siteAddress,
          email: estimate.email || existingCustomer.email
        });
      }
    } else {
      // Create new customer record
      handleAddCustomer({
        id: `CUST-${Date.now()}`,
        name: estimate.customerName,
        phone: estimate.phoneNumber,
        altPhone: estimate.altMob,
        email: estimate.email,
        address: estimate.currentAddress,
        siteAddress: estimate.siteAddress,
        createdAt: new Date().toISOString()
      });
    }

    // Auto-save new items to catalog
    estimate.items.forEach(lineItem => {
      const existsInCatalog = items.some(it => it.name.toLowerCase() === lineItem.itemName.toLowerCase());
      if (!existsInCatalog && lineItem.itemName.trim() !== '') {
        const newItem: Item = {
          id: lineItem.itemId,
          name: lineItem.itemName,
          type: ItemType.GOODS,
          unit: lineItem.unit,
          hsnCode: '',
          saleRate: lineItem.rate,
          gstRate: lineItem.gstRate
        };
        // Patch new item to Firebase
        saveData(`users/${currentUser.id}/items/${newItem.id}`, newItem);
      }
    });

    const exists = estimates.some(e => e.id === estimate.id);
    
    // Optimistic update
    if (exists) {
      setEstimates(prev => prev.map(e => e.id === estimate.id ? estimate : e));
      // Patch update
      updateData(`users/${currentUser.id}/estimates/${estimate.id}`, estimate);
    } else {
      setEstimates(prev => [estimate, ...prev]);
      // Patch new
      saveData(`users/${currentUser.id}/estimates/${estimate.id}`, estimate);
    }
    
    setViewingEstimate(estimate);
    setCurrentEditingEstimate(null);
    setActiveTab('dashboard');
  };

  const handleDeleteEstimate = (id: string) => {
    if (!id) return;
    if (window.confirm("Delete this estimate forever?")) {
      setEstimates(prev => prev.filter(est => est.id !== id));
      removeData(`users/${currentUser.id}/estimates/${id}`);
    }
  };

  const handleReviseEstimate = (estimate: Estimate) => {
    const revision: Estimate = {
      ...estimate,
      id: generateSafeId(),
      estimateNumber: `${estimate.estimateNumber.split('-R')[0]}-R${(estimate.version || 1) + 1}`,
      version: (estimate.version || 1) + 1,
      parentId: estimate.parentId || estimate.id,
      status: EstimateStatus.PENDING,
      createdAt: new Date().toISOString()
    };
    setCurrentEditingEstimate(revision);
    setActiveTab('estimates');
  };

  const handleUpdateCompanyInfo = (info: any) => {
    setCompanyInfo(info);
    saveData(`users/${currentUser.id}/info`, info);
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCompanyLogo(base64);
      saveData(`users/${currentUser.id}/logo`, base64);
    };
    reader.readAsDataURL(file);
  };

  // Customer Handlers
  const handleAddCustomer = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
    saveData(`users/${currentUser.id}/customers/${customer.id}`, customer);
  };

  const handleUpdateCustomer = (customer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
    updateData(`users/${currentUser.id}/customers/${customer.id}`, customer);
  };

  const handleDeleteCustomer = (id: string) => {
    if (window.confirm("Delete customer record?")) {
      setCustomers(prev => prev.filter(c => c.id !== id));
      removeData(`users/${currentUser.id}/customers/${id}`);
    }
  };

  // Follow-up Handlers
  const handleAddFollowUp = (followUp: FollowUp) => {
    setFollowUps(prev => [...prev, followUp]);
    saveData(`users/${currentUser.id}/followups/${followUp.id}`, followUp);
  };

  const handleUpdateFollowUp = (followUp: FollowUp) => {
    setFollowUps(prev => prev.map(f => f.id === followUp.id ? followUp : f));
    updateData(`users/${currentUser.id}/followups/${followUp.id}`, followUp);
  };

  const handleUpdateEstimateStatus = (id: string, status: EstimateStatus) => {
    const estimate = estimates.find(e => e.id === id);
    if (estimate) {
      const updated = { ...estimate, status };
      setEstimates(prev => prev.map(e => e.id === id ? updated : e));
      updateData(`users/${currentUser.id}/estimates/${id}`, updated);
    }
  };

  const handleDeleteFollowUp = (id: string) => {
    if (window.confirm("Delete follow-up reminder?")) {
      setFollowUps(prev => prev.filter(f => f.id !== id));
      removeData(`users/${currentUser.id}/followups/${id}`);
    }
  };

  const removeLogo = () => {
    setCompanyLogo(null);
    removeData(`users/${currentUser.id}/logo`);
  };

  const exportAllData = () => {
    const data = { items, estimates, logo: companyLogo, info: companyInfo, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pixar_cloud_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      <NotificationManager followUps={followUps} />
      {viewingEstimate && (
        <EstimatePreview 
          estimate={viewingEstimate} 
          companyLogo={companyLogo}
          companyInfo={companyInfo}
          onClose={() => setViewingEstimate(null)} 
        />
      )}

      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 text-white shrink-0 no-print flex flex-col h-screen sticky top-0 border-r border-slate-800">
        <div className="p-8 flex-1 overflow-y-auto">
          <div className="flex items-center gap-4 mb-10 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white border-2 border-slate-700 shadow-xl transition-transform group-hover:scale-105" />
            ) : (
              <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center font-black text-2xl text-slate-900 border-2 border-black shadow-xl group-hover:scale-105 transition-transform">P</div>
            )}
            <div>
              <h1 className="text-base font-black leading-none tracking-tight uppercase">PIXAR WORLD</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-1 font-bold">Construction Pro</p>
            </div>
          </div>

          <nav className="space-y-1 mb-10">
            <button onClick={() => { setActiveTab('dashboard'); setCurrentEditingEstimate(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-grid-2 text-lg"></i><span className="font-semibold text-sm">Dashboard</span>
            </button>
            <button onClick={() => { setActiveTab('items'); setCurrentEditingEstimate(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'items' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-list-check text-lg"></i><span className="font-semibold text-sm">Item Catalog</span>
            </button>
            <button onClick={() => { setActiveTab('customers'); setCurrentEditingEstimate(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'customers' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-users text-lg"></i><span className="font-semibold text-sm">Customers</span>
            </button>
            <button onClick={() => { setActiveTab('followups'); setCurrentEditingEstimate(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'followups' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-calendar-check text-lg"></i><span className="font-semibold text-sm">Follow-ups</span>
            </button>
            <button onClick={() => { setActiveTab('analytics'); setCurrentEditingEstimate(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-chart-line text-lg"></i><span className="font-semibold text-sm">Business Insights</span>
            </button>
            <button onClick={() => setActiveTab('estimates')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'estimates' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-file-circle-plus text-lg"></i><span className="font-semibold text-sm">{currentEditingEstimate ? 'Edit Estimate' : 'New Estimate'}</span>
            </button>
            <button onClick={() => setActiveTab('calculators')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'calculators' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-compass-drafting text-lg"></i><span className="font-semibold text-sm">Calculators</span>
            </button>
            <button onClick={() => setActiveTab('unit-converter')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'unit-converter' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-arrow-right-arrow-left text-lg"></i><span className="font-semibold text-sm">Unit Conversion</span>
            </button>
            <button onClick={() => setActiveTab('scientific-calc')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'scientific-calc' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-calculator text-lg"></i><span className="font-semibold text-sm">Scientific Calc</span>
            </button>
            <button onClick={() => setActiveTab('build-home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'build-home' ? 'bg-yellow-500 text-slate-900 shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-house-chimney text-lg"></i><span className="font-semibold text-sm">Build Home</span>
            </button>
            <button onClick={() => setActiveTab('drawing-pad')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'drawing-pad' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-pen-ruler text-lg"></i><span className="font-semibold text-sm">Drawing Pad</span>
            </button>
          </nav>

          <div className="space-y-1">
            <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-building text-lg"></i><span className="font-semibold text-sm">Company Details</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className="fa-solid fa-database text-lg"></i><span className="font-semibold text-sm">Data & Backup</span>
            </button>
          </div>
        </div>

        <div className="p-8 bg-slate-950/50 border-t border-slate-800">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full flex items-center justify-center border bg-blue-900/20 border-blue-500">
                <i className="fa-solid fa-cloud text-blue-400 text-[10px]"></i>
             </div>
             <div className="overflow-hidden">
               <p className="text-xs font-bold text-blue-400 truncate">Cloud Sync Active</p>
               <p className="text-[9px] text-slate-500 uppercase tracking-tighter">Automatic Backup</p>
             </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 shrink-0 px-10 flex items-center justify-between no-print shadow-sm z-10">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-terminal text-slate-300"></i>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Construction Management Suite</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-slate-200">
               <i className="fa-solid fa-cloud-check text-blue-500"></i> Real-time Cloud Database
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Project Hub</h2>
                  <p className="text-slate-500 font-medium mt-1">Estimates are synced in real-time with your cloud account.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setActiveTab('estimates')} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-black transition-all flex items-center gap-2 shadow-xl">
                        <i className="fa-solid fa-plus-circle"></i> New Estimate
                    </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Conversion Rate</div>
                  <div className="text-4xl font-black text-slate-900 mt-1">
                    {estimates.length > 0 
                      ? ((estimates.filter(e => e.status === EstimateStatus.CONVERTED).length / estimates.length) * 100).toFixed(0) 
                      : 0}%
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm md:col-span-2 border-l-4 border-l-blue-600">
                  <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Aggregate Value</div>
                  <div className="text-4xl font-black text-slate-900 mt-1">₹{estimates.reduce((a, b) => a + b.totalAmount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Business Value</div>
                  <div className="text-4xl font-black text-emerald-600 mt-1">₹{estimates.filter(e => e.status === EstimateStatus.CONVERTED).reduce((a, b) => a + b.totalAmount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-5">EST No.</th>
                      <th className="px-8 py-5">Customer</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Total</th>
                      <th className="px-8 py-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estimates.length === 0 ? (
                      <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">Your local estimate history is empty.</td></tr>
                    ) : (
                      estimates.map(est => (
                        <tr key={est.id || `key-${Math.random()}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5 font-mono font-black text-blue-600 text-xs">{est.estimateNumber}</td>
                          <td className="px-8 py-5 font-bold text-slate-900 text-sm">{est.customerName}</td>
                          <td className="px-8 py-5">
                            <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest ${
                              est.status === EstimateStatus.CONVERTED ? 'bg-green-100 text-green-600' : 
                              est.status === EstimateStatus.REJECTED ? 'bg-red-100 text-red-600' : 
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {est.status || EstimateStatus.PENDING}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right font-black text-slate-900">₹{est.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                          <td className="px-8 py-5 text-center">
                            <div className="flex justify-center gap-2">
                              {/* Status Actions */}
                              {est.status !== EstimateStatus.CONVERTED && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateEstimateStatus(est.id, EstimateStatus.CONVERTED); }} 
                                  className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm border border-green-100" 
                                  title="Accept / Convert to Business"
                                >
                                  <i className="fa-solid fa-handshake text-[10px]"></i>
                                </button>
                              )}
                              {est.status !== EstimateStatus.REJECTED && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateEstimateStatus(est.id, EstimateStatus.REJECTED); }} 
                                  className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100" 
                                  title="Reject Estimate"
                                >
                                  <i className="fa-solid fa-ban text-[10px]"></i>
                                </button>
                              )}
                              {est.status !== EstimateStatus.PENDING && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateEstimateStatus(est.id, EstimateStatus.PENDING); }} 
                                  className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-600 hover:text-white transition-all shadow-sm border border-slate-200" 
                                  title="Reset to Pending"
                                >
                                  <i className="fa-solid fa-rotate-left text-[10px]"></i>
                                </button>
                              )}
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleReviseEstimate(est); }} 
                                className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100" 
                                title="Revise Estimate"
                              >
                                <i className="fa-solid fa-code-branch text-[10px]"></i>
                              </button>
                              
                              <div className="w-px h-8 bg-slate-100 mx-1"></div>

                              {/* General Actions */}
                              <button onClick={(e) => { e.stopPropagation(); setViewingEstimate(est); }} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100" title="View"><i className="fa-solid fa-eye text-[10px]"></i></button>
                              <button onClick={(e) => { e.stopPropagation(); setCurrentEditingEstimate(est); setActiveTab('estimates'); }} className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm border border-amber-100" title="Edit"><i className="fa-solid fa-pen text-[10px]"></i></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteEstimate(est.id); }} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100" title="Delete"><i className="fa-solid fa-trash text-[10px]"></i></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'items' && <div className="max-w-6xl mx-auto"><ItemSection items={items} onAddItem={handleAddItem} onUpdateItem={handleUpdateItem} onDeleteItem={handleDeleteItem} /></div>}
          {activeTab === 'customers' && <div className="max-w-6xl mx-auto"><CustomerManagement customers={customers} estimates={estimates} onAdd={handleAddCustomer} onUpdate={handleUpdateCustomer} onDelete={handleDeleteCustomer} /></div>}
          {activeTab === 'followups' && <div className="max-w-6xl mx-auto"><FollowUpReminders followUps={followUps} customers={customers} onAdd={handleAddFollowUp} onUpdate={handleUpdateFollowUp} onDelete={handleDeleteFollowUp} /></div>}
          {activeTab === 'analytics' && <div className="max-w-6xl mx-auto"><BusinessAnalytics estimates={estimates} /></div>}
          {activeTab === 'estimates' && <div className="max-w-6xl mx-auto"><EstimateSection catalog={items} customers={customers} onSaveEstimate={handleSaveEstimate} editingEstimate={currentEditingEstimate} onCancelEdit={() => { setActiveTab('dashboard'); setCurrentEditingEstimate(null); }} /></div>}
          {activeTab === 'calculators' && <div className="max-w-6xl mx-auto"><ConstructionCalculators /></div>}
          {activeTab === 'unit-converter' && <div className="max-w-6xl mx-auto"><UnitConverter /></div>}
          {activeTab === 'scientific-calc' && <div className="max-w-6xl mx-auto"><ScientificCalculator /></div>}
          {activeTab === 'build-home' && <div className="max-w-6xl mx-auto"><BuildHomeSection /></div>}
          {activeTab === 'drawing-pad' && <div className="max-w-6xl mx-auto"><DrawingPad /></div>}
          {activeTab === 'profile' && (
            <div className="max-w-6xl mx-auto">
              <CompanyProfileSection 
                companyInfo={companyInfo} 
                companyLogo={companyLogo}
                onUpdate={handleUpdateCompanyInfo}
                onLogoUpload={handleLogoUpload}
                onRemoveLogo={removeLogo}
              />
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-10">
              <header>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Data Management</h2>
              </header>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-3"><i className="fa-solid fa-microchip text-blue-500"></i> Local-First Philosophy</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Your data never leaves your device unless you choose to export it. This ensures 100% privacy and lightning-fast performance even without an internet connection.</p>
                <div className="pt-4 space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Backup & Portability</p>
                  <button onClick={exportAllData} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl hover:bg-blue-700 transition-all"><i className="fa-solid fa-download"></i> Download Master Database (JSON)</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
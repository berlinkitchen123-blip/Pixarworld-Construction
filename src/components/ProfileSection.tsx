import React, { useState } from 'react';

interface CompanyInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface CompanyProfileSectionProps {
  companyInfo: CompanyInfo;
  companyLogo: string | null;
  onUpdate: (updated: CompanyInfo) => void;
  onLogoUpload: (file: File) => void;
  onRemoveLogo: () => void;
}

const CompanyProfileSection: React.FC<CompanyProfileSectionProps> = ({ 
  companyInfo, 
  companyLogo, 
  onUpdate, 
  onLogoUpload,
  onRemoveLogo
}) => {
  const [formData, setFormData] = useState(companyInfo);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setStatus({ type: 'error', msg: 'Logo must be under 2MB' });
        return;
      }
      onLogoUpload(file);
      setStatus({ type: 'success', msg: 'Logo uploaded successfully!' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setStatus({ type: 'success', msg: 'Company identity updated successfully!' });
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Company Identity</h2>
        <p className="text-slate-500 font-medium mt-1">Configure the business details displayed on your estimates.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-center space-y-4">
            <div className="relative group mx-auto w-32 h-32">
              <div className="w-32 h-32 bg-slate-900 rounded-[2.5rem] mx-auto flex items-center justify-center border-4 border-slate-50 shadow-xl overflow-hidden">
                {companyLogo ? (
                  <img src={companyLogo} alt="Company Logo" className="w-full h-full object-contain bg-white" />
                ) : (
                  <span className="text-5xl font-black text-white">{formData.name.charAt(0)}</span>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[2.5rem]">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                <i className="fa-solid fa-camera text-white text-2xl"></i>
              </label>
              {companyLogo && (
                <button 
                  onClick={onRemoveLogo}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all"
                  title="Remove Logo"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              )}
            </div>
            <div>
              <h3 className="font-black text-slate-900">{formData.name}</h3>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active Workspace</p>
            </div>
          </div>
          
          <div className="bg-blue-600 p-6 rounded-[2rem] text-white space-y-2 shadow-xl shadow-blue-900/20">
            <i className="fa-solid fa-file-invoice-dollar text-2xl opacity-50"></i>
            <h4 className="font-black text-sm uppercase tracking-wider">Identity Note</h4>
            <p className="text-xs font-medium text-blue-100 leading-relaxed">Changes made here will automatically reflect on all new estimates and reports you generate.</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Organization Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Public Email</label>
                <input 
                  required
                  type="email" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contact Number</label>
                <input 
                  type="tel" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Registered Address</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            {status && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-xs animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                <i className={`fa-solid ${status.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
                {status.msg}
              </div>
            )}

            <div className="pt-4">
              <button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-black text-white p-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-[0.98] transition-all"
              >
                Save Identity Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileSection;
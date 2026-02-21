import React, { useState } from 'react';
import { Customer, Estimate, EstimateStatus } from '../types.ts';

interface CustomerManagementProps {
  customers: Customer[];
  estimates: Estimate[];
  onAdd: (customer: Customer) => void;
  onUpdate: (customer: Customer) => void;
  onDelete: (id: string) => void;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, estimates, onAdd, onUpdate, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    altPhone: '',
    email: '',
    address: '',
    siteAddress: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    if (editingId) {
      onUpdate({ ...formData, id: editingId } as Customer);
      setEditingId(null);
    } else {
      onAdd({
        ...formData,
        id: `CUST-${Date.now()}`,
        createdAt: new Date().toISOString()
      } as Customer);
      setIsAdding(false);
    }
    setFormData({ name: '', phone: '', altPhone: '', email: '', address: '', siteAddress: '', notes: '' });
  };

  const startEdit = (cust: Customer) => {
    setFormData(cust);
    setEditingId(cust.id);
    setIsAdding(true);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Customer Directory</h2>
          <p className="text-slate-500 font-medium">Manage your client relationships and contact details.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(!isAdding); setEditingId(null); setFormData({ name: '', phone: '', altPhone: '', email: '', address: '', siteAddress: '', notes: '' }); }}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-slate-200"
        >
          <i className={`fa-solid ${isAdding ? 'fa-times' : 'fa-plus'}`}></i>
          {isAdding ? 'Cancel' : 'Add New Customer'}
        </button>
      </header>

      {isAdding && (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name *</label>
              <input 
                required
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number *</label>
              <input 
                required
                type="tel" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Alternate Phone</label>
              <input 
                type="tel" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.altPhone}
                onChange={e => setFormData({...formData, altPhone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
              <input 
                type="email" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Current Address</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none h-24"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Site Address</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none h-24"
                value={formData.siteAddress}
                onChange={e => setFormData({...formData, siteAddress: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 pt-4">
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                {editingId ? 'Update Customer Record' : 'Save Customer Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="relative">
        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          className="w-full bg-white border border-slate-200 rounded-2xl p-4 pl-12 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] -mr-8 -mt-8 transition-all group-hover:bg-blue-50"></div>
            
            <div className="relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl">
                  {customer.name.charAt(0)}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(customer)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button onClick={() => onDelete(customer.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-1">{customer.name}</h3>
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <i className="fa-solid fa-phone text-xs w-4"></i>
                  <span className="text-sm font-bold">{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <i className="fa-solid fa-envelope text-xs w-4"></i>
                    <span className="text-sm font-bold truncate">{customer.email}</span>
                  </div>
                )}
                <div className="flex items-start gap-3 text-slate-500 mt-4 pt-4 border-t border-slate-100">
                  <i className="fa-solid fa-location-dot text-xs w-4 mt-1"></i>
                  <p className="text-[11px] font-medium leading-relaxed italic">{customer.address || 'No address provided'}</p>
                </div>

                {/* Related Estimates Section */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-file-invoice-dollar text-blue-500"></i>
                    Related Estimates
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {estimates
                      .filter(e => e.phoneNumber === customer.phone)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(est => (
                        <div key={est.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 hover:border-blue-200 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black text-blue-600 font-mono">{est.estimateNumber}</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                              est.status === EstimateStatus.CONVERTED ? 'bg-green-100 text-green-600' : 
                              est.status === EstimateStatus.REJECTED ? 'bg-red-100 text-red-600' : 
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {est.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-bold text-slate-700">₹{est.totalAmount.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] text-slate-400 font-medium">v{est.version || 1}</span>
                          </div>
                        </div>
                      ))}
                    {estimates.filter(e => e.phoneNumber === customer.phone).length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">No estimates found for this customer.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <i className="fa-solid fa-users text-4xl text-slate-200 mb-4"></i>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No customer records found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerManagement;

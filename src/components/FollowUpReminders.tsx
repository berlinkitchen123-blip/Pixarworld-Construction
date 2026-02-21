import React, { useState } from 'react';
import { FollowUp, Customer, FollowUpStatus } from '../types.ts';

interface FollowUpRemindersProps {
  followUps: FollowUp[];
  customers: Customer[];
  onAdd: (followUp: FollowUp) => void;
  onUpdate: (followUp: FollowUp) => void;
  onDelete: (id: string) => void;
}

const FollowUpReminders: React.FC<FollowUpRemindersProps> = ({ followUps, customers, onAdd, onUpdate, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<FollowUp>>({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    reason: '',
    notes: '',
    status: FollowUpStatus.PENDING
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.date || !formData.reason) return;

    const customer = customers.find(c => c.id === formData.customerId);
    if (!customer) return;

    onAdd({
      ...formData,
      id: `FLW-${Date.now()}`,
      customerName: customer.name,
      createdAt: new Date().toISOString()
    } as FollowUp);

    setIsAdding(false);
    setFormData({
      customerId: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      reason: '',
      notes: '',
      status: FollowUpStatus.PENDING
    });
  };

  const toggleStatus = (followUp: FollowUp) => {
    const nextStatus = followUp.status === FollowUpStatus.PENDING ? FollowUpStatus.COMPLETED : FollowUpStatus.PENDING;
    onUpdate({ ...followUp, status: nextStatus });
  };

  const sortedFollowUps = [...followUps].sort((a, b) => 
    new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime()
  );

  const upcoming = sortedFollowUps.filter(f => f.status === FollowUpStatus.PENDING);
  const completed = sortedFollowUps.filter(f => f.status === FollowUpStatus.COMPLETED);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Follow-up Reminders</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 font-medium">Schedule and track client calls, site visits, and meetings.</p>
            {typeof Notification !== 'undefined' && Notification.permission === 'granted' && (
              <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase bg-green-50 px-2 py-0.5 rounded-full">
                <i className="fa-solid fa-bell"></i> Alerts On
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('Test Notification', {
                  body: 'This is a test notification from Pixar World Construction.',
                  icon: 'https://picsum.photos/seed/construction/128/128'
                });
              } else {
                alert('Please enable notifications first.');
              }
            }}
            className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all"
          >
            <i className="fa-solid fa-vial"></i>
            Test Alert
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <i className={`fa-solid ${isAdding ? 'fa-times' : 'fa-calendar-plus'}`}></i>
            {isAdding ? 'Cancel' : 'Schedule Follow-up'}
          </button>
        </div>
      </header>

      {isAdding && (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Customer *</label>
              <select 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={formData.customerId}
                onChange={e => setFormData({...formData, customerId: e.target.value})}
              >
                <option value="">Choose a customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date *</label>
                <input 
                  required
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Time *</label>
                <input 
                  required
                  type="time" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.time}
                  onChange={e => setFormData({...formData, time: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Follow-up *</label>
              <input 
                required
                placeholder="e.g. Discuss estimate approval, Site visit for measurement"
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Additional Notes</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none h-24"
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 pt-4">
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-100">
                Schedule Reminder
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Upcoming Tasks</h3>
          </div>
          
          <div className="space-y-4">
            {upcoming.map(item => {
              const customer = customers.find(c => c.id === item.customerId);
              const phoneNumber = customer?.phone;
              const cleanPhone = phoneNumber?.replace(/\D/g, '');

              return (
                <div key={item.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                          {item.date} @ {item.time}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 leading-tight mb-1">{item.reason}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                          <i className="fa-solid fa-user text-[10px]"></i> {item.customerName}
                        </p>
                        {phoneNumber && (
                          <div className="flex items-center gap-2">
                            <a 
                              href={`tel:${phoneNumber}`} 
                              className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:text-blue-700"
                            >
                              <i className="fa-solid fa-phone"></i> Call
                            </a>
                            <a 
                              href={`https://wa.me/${cleanPhone}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 hover:text-emerald-700"
                            >
                              <i className="fa-brands fa-whatsapp"></i> WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                      {item.notes && <p className="mt-3 text-xs text-slate-400 italic leading-relaxed">{item.notes}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => toggleStatus(item)}
                      className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-green-500 hover:text-white transition-all"
                      title="Mark as Completed"
                    >
                      <i className="fa-solid fa-check"></i>
                    </button>
                    <button 
                      onClick={() => onDelete(item.id)}
                      className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                      title="Delete Reminder"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
            {upcoming.length === 0 && (
              <div className="py-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No upcoming follow-ups</p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recently Completed</h3>
          </div>

          <div className="space-y-4 opacity-60">
            {completed.slice(0, 5).map(item => {
              const customer = customers.find(c => c.id === item.customerId);
              const phoneNumber = customer?.phone;
              const cleanPhone = phoneNumber?.replace(/\D/g, '');

              return (
                <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-black text-slate-400 line-through leading-tight mb-1">{item.reason}</h4>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-bold text-slate-400">{item.customerName}</p>
                        {phoneNumber && (
                          <div className="flex items-center gap-2 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                            <a href={`tel:${phoneNumber}`} className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                              <i className="fa-solid fa-phone"></i>
                            </a>
                            <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noreferrer" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                              <i className="fa-brands fa-whatsapp"></i>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                    <button 
                      onClick={() => toggleStatus(item)}
                      className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center hover:bg-green-600 transition-all"
                      title="Undo Completion"
                    >
                      <i className="fa-solid fa-rotate-left"></i>
                    </button>
                    <button 
                      onClick={() => onDelete(item.id)}
                      className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                      title="Delete History"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
            {completed.length === 0 && (
              <div className="py-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">History is empty</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FollowUpReminders;

import React, { useState, useEffect } from 'react';
import { User } from '../types.ts';

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedUsers = JSON.parse(localStorage.getItem('pixar_users') || '[]');
    setUsers(savedUsers);
  }, []);

  const toggleRole = (userId: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return { ...u, role: u.role === 'admin' ? 'user' : 'admin' as any };
      }
      return u;
    });
    setUsers(updated);
    localStorage.setItem('pixar_users', JSON.stringify(updated));
  };

  const deleteUser = (userId: string) => {
    if (window.confirm("Are you sure? This will delete all estimates and items for this user.")) {
      const updated = users.filter(u => u.id !== userId);
      setUsers(updated);
      localStorage.setItem('pixar_users', JSON.stringify(updated));
      
      // Clear user data
      localStorage.removeItem(`pixar_items_${userId}`);
      localStorage.removeItem(`pixar_estimates_${userId}`);
      localStorage.removeItem(`pixar_company_logo_${userId}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">User Management</h2>
          <p className="text-slate-500 font-medium mt-1">Monitor and control project operator accounts across the system.</p>
        </div>
        <div className="relative w-full md:w-80">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input 
            type="text" 
            placeholder="Search organizations..." 
            className="w-full bg-white border border-slate-200 rounded-2xl p-4 pl-12 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Identity</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${user.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} rounded-2xl flex items-center justify-center font-black text-xl border-2 border-white shadow-sm`}>
                      {user.companyName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 leading-none">{user.companyName}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-blue-100 text-blue-600 border border-blue-200'}`}>
                    {user.role}
                   </span>
                </td>
                <td className="px-8 py-6 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Authorized</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => toggleRole(user.id)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                    >
                      Swap Role
                    </button>
                    <button 
                      onClick={() => deleteUser(user.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic font-medium">No organizations found matching your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUserManagement;
import React, { useState, useEffect } from 'react';
import { Item, ItemType } from '../types.ts';

interface ItemSectionProps {
  items: Item[];
  onAddItem: (item: Item) => void;
  onUpdateItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
}

const ItemSection: React.FC<ItemSectionProps> = ({ items, onAddItem, onUpdateItem, onDeleteItem }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    type: ItemType.GOODS,
    name: '',
    unit: 'Sqft',
    customUnit: '',
    hsnCode: '',
    saleRate: '',
    gstRate: '18'
  });

  // Safe ID generation helper
  const generateId = () => {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (e) {}
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  };

  // Populate form when editing
  useEffect(() => {
    if (editingItem) {
      const isStandardUnit = ['Box', 'Sqft', 'Sqmt', 'Kg', 'Running Ft'].includes(editingItem.unit);
      setFormData({
        type: editingItem.type,
        name: editingItem.name,
        unit: isStandardUnit ? editingItem.unit : 'Custom',
        customUnit: isStandardUnit ? '' : editingItem.unit,
        hsnCode: editingItem.hsnCode,
        saleRate: editingItem.saleRate.toString(),
        gstRate: (editingItem.gstRate || 0).toString()
      });
      setIsAdding(true);
    }
  }, [editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUnit = formData.unit === 'Custom' ? formData.customUnit : formData.unit;
    
    if (editingItem) {
      const updatedItem: Item = {
        ...editingItem,
        type: formData.type,
        name: formData.name,
        unit: finalUnit,
        hsnCode: formData.hsnCode,
        saleRate: parseFloat(formData.saleRate) || 0,
        gstRate: parseInt(formData.gstRate) || 0
      };
      onUpdateItem(updatedItem);
    } else {
      const newItem: Item = {
        id: generateId(),
        type: formData.type,
        name: formData.name,
        unit: finalUnit,
        hsnCode: formData.hsnCode,
        saleRate: parseFloat(formData.saleRate) || 0,
        gstRate: parseInt(formData.gstRate) || 0
      };
      onAddItem(newItem);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      type: ItemType.GOODS,
      name: '',
      unit: 'Sqft',
      customUnit: '',
      hsnCode: '',
      saleRate: '',
      gstRate: '18'
    });
    setIsAdding(false);
    setEditingItem(null);
  };

  const handleEditClick = (item: Item) => {
    setEditingItem(item);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Item Catalog</h2>
        <button 
          onClick={() => {
            if (isAdding) resetForm();
            else setIsAdding(true);
          }}
          className={`${isAdding ? 'bg-slate-500' : 'bg-blue-600'} hover:opacity-90 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2`}
        >
          <i className={`fa-solid ${isAdding ? 'fa-xmark' : 'fa-plus'}`}></i>
          {isAdding ? 'Cancel' : 'Add New Item'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="md:col-span-2 lg:col-span-3 border-b pb-2">
             <h3 className="font-bold text-slate-700">{editingItem ? 'Edit Existing Item' : 'Create New Item'}</h3>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600">Item Type</label>
            <select 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as ItemType})}
            >
              <option value={ItemType.GOODS}>Goods</option>
              <option value={ItemType.SERVICE}>Service</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600">Item Name</label>
            <input 
              required
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Cement, Tiling Service"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600">Unit</label>
            <div className="flex gap-2">
              <select 
                className="flex-1 border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              >
                <option value="Box">Box</option>
                <option value="Sqft">Sqft</option>
                <option value="Sqmt">Sqmt</option>
                <option value="Kg">Kg</option>
                <option value="Running Ft">Running Ft</option>
                <option value="Custom">Custom...</option>
              </select>
              {formData.unit === 'Custom' && (
                <input 
                  required
                  className="flex-1 border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter unit"
                  value={formData.customUnit}
                  onChange={(e) => setFormData({...formData, customUnit: e.target.value})}
                />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600">HSN Code</label>
            <input 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="HSN/SAC Code"
              value={formData.hsnCode}
              onChange={(e) => setFormData({...formData, hsnCode: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600 flex items-center gap-1">Sale Rate (<i className="fa-solid fa-indian-rupee-sign text-[10px]"></i>)</label>
            <input 
              required
              type="number"
              step="any"
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0.00"
              value={formData.saleRate}
              onChange={(e) => setFormData({...formData, saleRate: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600">GST Rate (%)</label>
            <select 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.gstRate}
              onChange={(e) => setFormData({...formData, gstRate: e.target.value})}
            >
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={resetForm}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-lg transition-colors font-medium"
            >
              Discard
            </button>
            <button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              {editingItem ? 'Update Item' : 'Save Item'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">GST%</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">HSN Code</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Sale Rate</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  No items in catalog. Add your first item to start creating estimates.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${item.type === ItemType.GOODS ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.gstRate || 0}%</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-sm">{item.hsnCode || '-'}</td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-800">
                    <i className="fa-solid fa-indian-rupee-sign text-xs mr-1 opacity-50"></i>
                    {item.saleRate.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-1">
                      <button 
                        onClick={() => handleEditClick(item)}
                        className="text-blue-400 hover:text-blue-600 transition-colors p-2"
                        title="Edit Item"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button 
                        onClick={() => onDeleteItem(item.id)}
                        className="text-red-400 hover:text-red-600 transition-colors p-2"
                        title="Delete Item"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemSection;
import React, { useState } from 'react';
import { ProductItem, ProductGroup } from '../types';
import { calculateProductStats, formatCurrency } from '../utils';
import { X } from 'lucide-react';

interface Props {
  group: ProductGroup;
  existingItems: ProductItem[];
  onSave: (item: ProductItem) => void;
  onCancel: () => void;
  initialData?: ProductItem;
  nextId: string;
}

// Helper to safely parse numbers
const parseNum = (val: string | number) => parseFloat(String(val)) || 0;

const ProductForm: React.FC<Props> = ({ group, onSave, onCancel, initialData, nextId }) => {
  // Use strings for internal form state to allow "0." and preserving trailing zeros (e.g. "0.250")
  const [formState, setFormState] = useState({
    name: initialData?.name || '',
    jpyPrice: initialData?.jpyPrice?.toString() || '',
    domesticShip: initialData?.domesticShip?.toString() || '0',
    handlingFee: initialData?.handlingFee?.toString() || '0',
    intlShip: initialData?.intlShip?.toString() || '0',
    // Sets defaults to 3 decimal places as requested
    rateSale: initialData?.rateSale?.toString() || '0.250',
    rateCost: initialData?.rateCost?.toString() || '0.205',
    inputPrice: initialData?.inputPrice?.toString() || ''
  });

  // Calculate stats in real-time based on current string inputs
  const currentStats = calculateProductStats({
    ...initialData, // preserve original IDs etc if needed for type safety context
    groupId: group.id,
    id: initialData?.id || nextId,
    name: formState.name,
    jpyPrice: parseNum(formState.jpyPrice),
    domesticShip: parseNum(formState.domesticShip),
    handlingFee: parseNum(formState.handlingFee),
    intlShip: parseNum(formState.intlShip),
    rateSale: parseNum(formState.rateSale),
    rateCost: parseNum(formState.rateCost),
    inputPrice: parseNum(formState.inputPrice)
  } as ProductItem);

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    const finalItem: ProductItem = {
      groupId: group.id,
      id: initialData?.id || nextId,
      name: formState.name,
      jpyPrice: parseNum(formState.jpyPrice),
      domesticShip: parseNum(formState.domesticShip),
      handlingFee: parseNum(formState.handlingFee),
      intlShip: parseNum(formState.intlShip),
      rateSale: parseNum(formState.rateSale),
      rateCost: parseNum(formState.rateCost),
      inputPrice: parseNum(formState.inputPrice)
    };
    onSave(finalItem);
  };

  // Optimized input styling for full screen
  const inputClass = "block w-full rounded-md border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 text-lg font-bold shadow-sm";
  const labelClass = "block text-xs font-bold text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-200">
      <div className="w-full max-w-lg mx-auto flex flex-col h-full bg-white shadow-2xl">
        
        {/* Header - Fixed Top */}
        <div className="px-5 py-4 border-b border-blue-900 bg-blue-950 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-cyan-400">
              {initialData ? '修改商品' : '新增商品'}
            </h3>
            <div className="text-blue-200 text-sm font-mono mt-0.5">{group.name} ({group.id}-{initialData?.id || nextId})</div>
          </div>
          <button 
            onClick={onCancel} 
            className="text-blue-300 hover:text-white p-2 rounded-full hover:bg-blue-900/50 transition-colors"
          >
             <X size={28} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
          
          {/* Name */}
          <div>
            <label className={labelClass}>商品名稱</label>
            <input
              type="text"
              className="block w-full rounded-md border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-blue-500 border px-3 py-2.5 text-xl font-bold"
              value={formState.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="請輸入商品名稱"
              autoFocus={!initialData}
            />
          </div>

          {/* Core Prices */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                <label className="block text-xs font-bold text-amber-700 mb-1">日幣單價 (¥)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="block w-full rounded-md border-amber-300 bg-white text-amber-900 border px-2 py-2 text-2xl font-bold focus:ring-amber-500 focus:border-amber-500 text-center shadow-inner"
                  value={formState.jpyPrice}
                  onChange={(e) => handleChange('jpyPrice', e.target.value)}
                  placeholder="0"
                />
             </div>
             <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 relative">
                <div className="flex justify-between items-baseline mb-1">
                    <label className="block text-xs font-bold text-blue-700">輸入價格 ($)</label>
                    <div className="text-[11px] font-bold text-blue-400" title="參考售價+運費">
                       售+運: <span className="text-blue-600 text-sm">{formatCurrency(currentStats.pricePlusShip)}</span>
                    </div>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  className="block w-full rounded-md border-blue-300 bg-white text-blue-900 border px-2 py-2 text-2xl font-bold focus:ring-blue-500 focus:border-blue-500 text-center shadow-inner"
                  value={formState.inputPrice}
                  onChange={(e) => handleChange('inputPrice', e.target.value)}
                  placeholder="0"
                />
             </div>
          </div>

          {/* Configs Group */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
             {/* Row: Costs */}
             <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>境內運</label>
                  <input type="number" className={inputClass} value={formState.domesticShip} onChange={(e) => handleChange('domesticShip', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>手續費</label>
                  <input type="number" className={inputClass} value={formState.handlingFee} onChange={(e) => handleChange('handlingFee', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>國際運</label>
                  <input type="number" className={inputClass} value={formState.intlShip} onChange={(e) => handleChange('intlShip', e.target.value)} />
                </div>
             </div>
             
             {/* Row: Rates */}
             <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className={labelClass}>售價匯率 (0.250)</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    className={inputClass} 
                    value={formState.rateSale} 
                    onChange={(e) => handleChange('rateSale', e.target.value)} 
                  />
                </div>
                <div>
                  <label className={labelClass}>成本匯率 (0.205)</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    className={inputClass} 
                    value={formState.rateCost} 
                    onChange={(e) => handleChange('rateCost', e.target.value)} 
                  />
                </div>
             </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-auto pt-2">
             <div className="bg-slate-800 text-slate-100 p-3 rounded-xl shadow-lg grid grid-cols-4 gap-2 text-center">
                 <div>
                    <div className="text-[10px] text-slate-400">售價+運</div>
                    <div className="font-bold text-sm">{formatCurrency(currentStats.pricePlusShip)}</div>
                 </div>
                 <div className="border-l border-slate-600">
                    <div className="text-[10px] text-slate-400">台幣成本</div>
                    <div className="font-bold text-sm">{formatCurrency(currentStats.twdCost)}</div>
                 </div>
                 <div className="border-l border-slate-600">
                    <div className="text-[10px] text-slate-400">成本+運</div>
                    <div className="font-bold text-sm">{formatCurrency(currentStats.costPlusShip)}</div>
                 </div>
                 <div className="border-l border-slate-600 bg-emerald-900/30 -my-3 py-3 rounded-r-xl">
                    <div className="text-[10px] text-emerald-400 font-bold">預估利潤</div>
                    <div className="font-bold text-emerald-400 text-base">{formatCurrency(currentStats.profit)}</div>
                 </div>
             </div>
          </div>

        </div>

        {/* Footer - Fixed Bottom */}
        <div className="p-4 border-t border-slate-200 bg-white flex gap-4 shrink-0 pb-6">
          <button 
            onClick={onCancel} 
            className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold text-lg transition-all"
          >
            取消
          </button>
          <button 
            onClick={handleSave} 
            disabled={!formState.name || !formState.jpyPrice || !formState.inputPrice}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-200 text-lg transition-all transform active:scale-[0.98]"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
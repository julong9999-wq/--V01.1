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
  const [formState, setFormState] = useState({
    name: initialData?.name || '',
    jpyPrice: initialData?.jpyPrice?.toString() || '',
    domesticShip: initialData?.domesticShip?.toString() || '0',
    handlingFee: initialData?.handlingFee?.toString() || '0',
    intlShip: initialData?.intlShip?.toString() || '0',
    rateSale: initialData?.rateSale?.toString() || '0.250',
    rateCost: initialData?.rateCost?.toString() || '0.205',
    inputPrice: initialData?.inputPrice?.toString() || ''
  });

  const currentStats = calculateProductStats({
    ...initialData,
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

  // 統一字體設定 (以購買明細為標準)
  // Input: text-lg (18px) - 清楚好讀
  // Label: text-sm (14px) - 輔助說明
  // Layout: Compact spacing
  const labelClass = "block text-sm font-bold text-slate-600 mb-1"; 
  const inputClass = "block w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 h-10 text-lg font-bold focus:border-blue-500 focus:ring-blue-500"; 

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-blue-900 bg-blue-950 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white">
              {initialData ? '修改商品' : '新增商品'}
            </h3>
            <div className="text-blue-200 text-xs font-mono mt-0.5 font-bold">{group.name} ({group.id}-{initialData?.id || nextId})</div>
          </div>
          <button onClick={onCancel} className="text-blue-300 hover:text-white p-1">
             <X size={28} />
          </button>
        </div>

        {/* Body - Optimized Spacing - Compact */}
        {/* Removed justify-between, using gap-3 for consistent, compact spacing */}
        <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
            
            {/* 1. Name */}
            <div>
              <label className={labelClass}>商品名稱</label>
              <input
                type="text"
                className={inputClass}
                value={formState.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="請輸入商品名稱"
                autoFocus={!initialData}
              />
            </div>

            {/* 2. Prices (Row) */}
            <div className="grid grid-cols-2 gap-3">
               <div>
                  <label className={labelClass}>日幣單價 (¥)</label>
                  <input
                    type="number" inputMode="numeric"
                    className={`${inputClass} text-right text-amber-900 border-amber-300`}
                    value={formState.jpyPrice}
                    onChange={(e) => handleChange('jpyPrice', e.target.value)}
                  />
               </div>
               <div>
                  <label className={labelClass}>輸入價格 ($)</label>
                  <input
                    type="number" inputMode="decimal"
                    className={`${inputClass} text-right text-blue-900 border-blue-300`}
                    value={formState.inputPrice}
                    onChange={(e) => handleChange('inputPrice', e.target.value)}
                  />
               </div>
            </div>

            {/* 3. Costs (Row) */}
            <div className="grid grid-cols-3 gap-2">
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

            {/* 4. Rates (Row) */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>售價匯率</label>
                  <input 
                    type="number" step="0.001" className={inputClass} value={formState.rateSale} onChange={(e) => handleChange('rateSale', e.target.value)} 
                  />
                </div>
                <div>
                  <label className={labelClass}>成本匯率</label>
                  <input 
                    type="number" step="0.001" className={inputClass} value={formState.rateCost} onChange={(e) => handleChange('rateCost', e.target.value)} 
                  />
                </div>
            </div>

            {/* 5. Stats Preview (Box) */}
            {/* Added mt-1 to give just a tiny bit more separation from inputs */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-sm text-sm mt-1">
                 <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">台幣成本:</span>
                        <span className="font-mono font-bold text-base">{formatCurrency(currentStats.twdCost)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">成本+運:</span>
                        <span className="font-mono font-bold text-base">{formatCurrency(currentStats.costPlusShip)}</span>
                    </div>
                 </div>
                 <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2">
                    <div className="flex justify-between text-blue-700">
                        <span className="font-bold">售價+運:</span>
                        <span className="font-mono font-bold text-base">{formatCurrency(currentStats.pricePlusShip)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                        <span className="font-bold">預估利潤:</span>
                        <span className="font-mono font-bold text-base">{formatCurrency(currentStats.profit)}</span>
                    </div>
                 </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex gap-3 shrink-0">
          <button onClick={onCancel} className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-600 font-bold text-lg">取消</button>
          <button onClick={handleSave} disabled={!formState.name || !formState.jpyPrice || !formState.inputPrice} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md text-lg disabled:opacity-50">儲存</button>
        </div>
    </div>
  );
};

export default ProductForm;
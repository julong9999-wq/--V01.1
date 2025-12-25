import React, { useState, useMemo, useEffect } from 'react';
import { ProductGroup, ProductItem, OrderGroup, OrderItem, ViewState } from './types';
import { INITIAL_PRODUCT_GROUPS, INITIAL_PRODUCT_ITEMS, INITIAL_ORDER_GROUPS, INITIAL_ORDER_ITEMS } from './constants';
import { getNextGroupId, getNextItemId, getNextOrderGroupId, calculateProductStats, formatCurrency, generateUUID, cleanProductName } from './utils';
import ProductForm from './components/ProductForm';
import { Trash2, Edit, Plus, Package, ShoppingCart, List, BarChart2, ChevronRight, ChevronDown, User, Box, X, Calculator, Download, Save, Wallet, ArrowUpCircle, ArrowDownCircle, Grid } from 'lucide-react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  writeBatch,
  setDoc,
  getDocs
} from 'firebase/firestore';

const DEFAULT_INCOME_DATA = {
    packagingRevenue: 0,
    cardCharge: 0,
    cardFee: 0,
    intlShipping: 0,
    dadReceivable: 0,
    paymentNote: ''
};

// --- UI Components ---

// 1. Standard Action Button (Compact for 3 buttons in a row)
const ActionButton = ({ icon: Icon, label, onClick, active = false, variant = 'primary' }: any) => {
    let bgClass = "bg-blue-700 hover:bg-blue-600 border-blue-600"; // Primary
    if (variant === 'success') bgClass = "bg-emerald-600 hover:bg-emerald-500 border-emerald-500";
    if (variant === 'danger') bgClass = "bg-rose-600 hover:bg-rose-500 border-rose-500";
    if (active) bgClass = "bg-yellow-500 text-blue-900 border-yellow-400 font-bold hover:bg-yellow-400";
    
    return (
        <button 
            onClick={onClick}
            className={`
                h-8 px-2 min-w-[72px] rounded border shadow-sm transition-all active:scale-95
                flex items-center justify-center gap-1
                text-xs font-bold tracking-wide text-white
                ${bgClass}
            `}
        >
            <Icon size={14} strokeWidth={2.5} />
            <span>{label}</span>
        </button>
    );
};

// 2. Order Batch Selector Button
const OrderBatchButton = ({ id, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`
            h-7 min-w-[75px] px-1 rounded border font-mono font-bold text-xs tracking-tight transition-all
            flex items-center justify-center shrink-0 shadow-sm
            ${active 
                ? 'bg-yellow-400 text-blue-900 border-yellow-300 shadow-md scale-105' 
                : 'bg-blue-800 text-blue-200 border-blue-700 hover:bg-blue-700'
            }
        `}
    >
        {id}
    </button>
);

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<ViewState>('products');
  
  // Data State
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<{ group: ProductGroup, item?: ProductItem, nextId: string } | null>(null);
  const [newGroupInput, setNewGroupInput] = useState<string>('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);

  const [renamingId, setRenamingId] = useState<{ type: 'group' | 'item', groupId: string, itemId?: string } | null>(null);
  const [tempName, setTempName] = useState('');

  const [selectedOrderGroup, setSelectedOrderGroup] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedOrderGroup && orderGroups.length > 0) {
        const sorted = [...orderGroups].sort((a, b) => a.id.localeCompare(b.id));
        setSelectedOrderGroup(sorted[sorted.length - 1].id);
    }
  }, [orderGroups, selectedOrderGroup]);

  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [newOrderDate, setNewOrderDate] = useState({ year: 2025, month: new Date().getMonth() + 1 });

  const [editingOrderItem, setEditingOrderItem] = useState<OrderItem | null>(null);
  const [isOrderEntryOpen, setIsOrderEntryOpen] = useState(false);

  // View Specific States
  const [detailSortMode, setDetailSortMode] = useState<'buyer' | 'product'>('buyer');
  const [analysisSortMode, setAnalysisSortMode] = useState<'buyer' | 'product'>('buyer');
  const [depositMode, setDepositMode] = useState<'income' | 'expense'>('income');
  
  const [incomeData, setIncomeData] = useState(DEFAULT_INCOME_DATA);

  // --- Firestore Listeners ---
  useEffect(() => {
    const unsubGroups = onSnapshot(collection(db, 'productGroups'), (snapshot) => {
        const groups = snapshot.docs.map(d => d.data() as ProductGroup).sort((a, b) => a.id.localeCompare(b.id));
        setProductGroups(groups);
        if (snapshot.empty) {
            const batch = writeBatch(db);
            INITIAL_PRODUCT_GROUPS.forEach(g => batch.set(doc(collection(db, 'productGroups')), g));
            batch.commit();
        }
    });

    const unsubItems = onSnapshot(collection(db, 'productItems'), (snapshot) => {
        const items = snapshot.docs.map(d => d.data() as ProductItem);
        setProductItems(items);
        if (snapshot.empty) {
             const batch = writeBatch(db);
             INITIAL_PRODUCT_ITEMS.forEach(i => batch.set(doc(collection(db, 'productItems')), i));
             batch.commit();
        }
    });

    const unsubOrderGroups = onSnapshot(collection(db, 'orderGroups'), (snapshot) => {
        const groups = snapshot.docs.map(d => d.data() as OrderGroup).sort((a, b) => a.id.localeCompare(b.id));
        setOrderGroups(groups);
        if (snapshot.empty) {
             const batch = writeBatch(db);
             INITIAL_ORDER_GROUPS.forEach(g => batch.set(doc(collection(db, 'orderGroups')), g));
             batch.commit();
        }
    });

    const unsubOrderItems = onSnapshot(collection(db, 'orderItems'), (snapshot) => {
        const items = snapshot.docs.map(d => d.data() as OrderItem);
        setOrderItems(items);
        if (snapshot.empty) {
             const batch = writeBatch(db);
             INITIAL_ORDER_ITEMS.forEach(i => batch.set(doc(collection(db, 'orderItems')), i));
             batch.commit();
        }
    });

    return () => { unsubGroups(); unsubItems(); unsubOrderGroups(); unsubOrderItems(); };
  }, []);

  useEffect(() => {
    if (!selectedOrderGroup) { setIncomeData(DEFAULT_INCOME_DATA); return; }
    setIncomeData(DEFAULT_INCOME_DATA);
    const unsubIncome = onSnapshot(doc(db, 'incomeSettings', selectedOrderGroup), (docSnap) => {
        if (docSnap.exists()) setIncomeData(docSnap.data() as any);
        else setIncomeData(DEFAULT_INCOME_DATA);
    });
    return () => unsubIncome();
  }, [selectedOrderGroup]);

  // --- Computed ---
  const filteredProducts = useMemo(() => {
    return productGroups.map(group => ({
      group,
      items: productItems
        .filter(item => item.groupId === group.id)
        .sort((a, b) => a.id.localeCompare(b.id))
    }));
  }, [productGroups, productItems]);

  const activeOrderGroup = useMemo(() => 
    orderGroups.find(g => g.id === selectedOrderGroup), 
  [orderGroups, selectedOrderGroup]);

  const activeOrderItems = useMemo(() => {
    return orderItems
        .filter(i => i.orderGroupId === selectedOrderGroup)
        .sort((a, b) => {
            if (a.productGroupId !== b.productGroupId) return a.productGroupId.localeCompare(b.productGroupId);
            if (a.productItemId !== b.productItemId) return a.productItemId.localeCompare(b.productItemId);
            return a.buyer.localeCompare(b.buyer, 'zh-TW');
        });
  }, [orderItems, selectedOrderGroup]);

  // --- Income Stats Calculation ---
  const incomeStats = useMemo(() => {
    let totalSales = 0, totalBaseCost = 0, totalJpy = 0, totalDomestic = 0, totalHandling = 0;
    let rateSum = 0, rateCount = 0;

    activeOrderItems.forEach(item => {
         const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
         if (product) {
             const stats = calculateProductStats(product);
             const qty = item.quantity;
             totalSales += product.inputPrice * qty;
             totalBaseCost += stats.twdCost * qty;
             totalJpy += product.jpyPrice * qty;
             totalDomestic += product.domesticShip * qty;
             totalHandling += product.handlingFee * qty;
             if (product.rateCost) { rateSum += product.rateCost; rateCount++; }
         }
    });

    const avgRateCost = rateCount > 0 ? rateSum / rateCount : 0.205;
    
    // Manual inputs
    const cardCharge = incomeData.cardCharge || 0;
    const packaging = incomeData.packagingRevenue || 0;
    const cardFeeInput = incomeData.cardFee || 0;
    const actualIntlShip = incomeData.intlShipping || 0;
    
    const totalRevenue = totalSales + packaging;
    const totalExpenses = cardCharge + actualIntlShip + cardFeeInput;
    const netProfit = totalRevenue - totalExpenses;
    const profitRate = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const cardFeeRate = cardCharge > 0 ? (cardFeeInput / cardCharge) * 100 : 0;
    
    return {
        totalJpy, totalDomestic, totalHandling, totalSales, totalBaseCost,
        avgRateCost, packaging, cardFeeInput, actualIntlShip, cardCharge,
        totalRevenue, totalExpenses, netProfit, profitRate, cardFeeRate
    };
  }, [activeOrderItems, productItems, incomeData]);

  // --- Actions ---
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportProducts = () => {
    const headers = ['類別ID', '類別名稱', '商品ID', '商品名稱', '日幣價格', '境內運', '手續費', '國際運', '售價匯率', '成本匯率', '輸入價格'];
    const rows = productItems.map(item => {
        const groupName = productGroups.find(g => g.id === item.groupId)?.name || '';
        return [item.groupId, groupName, item.id, item.name, item.jpyPrice, item.domesticShip, item.handlingFee, item.intlShip, item.rateSale, item.rateCost, item.inputPrice];
    });
    downloadCSV(`產品資料_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handleExportOrders = () => {
    if (!selectedOrderGroup) return;
    const headers = ['訂單批次', '商品類別', '商品ID', '商品名稱', '描述', '買家', '數量', '備註', '說明', '日期'];
    const rows = activeOrderItems.map(item => {
        const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
        return [item.orderGroupId, item.productGroupId, item.productItemId, product?.name || '', item.description, item.buyer, item.quantity, item.remarks, item.note, item.date];
    });
    downloadCSV(`訂單_${selectedOrderGroup}`, headers, rows);
  };

  const handleExportDetails = () => {
    if (!selectedOrderGroup) return;
    const map = new Map<string, { label: string, totalQty: number, totalPrice: number, items: any[] }>();
    activeOrderItems.forEach(item => {
          const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
          const total = (product?.inputPrice || 0) * item.quantity;
          let key = detailSortMode === 'buyer' ? item.buyer : `${item.productGroupId}-${item.productItemId}`;
          let label = detailSortMode === 'buyer' ? item.buyer : `${product?.name || '未知商品'}`;
          if (!map.has(key)) map.set(key, { label, totalQty: 0, totalPrice: 0, items: [] });
          const group = map.get(key)!;
          group.totalQty += item.quantity;
          group.totalPrice += total;
          group.items.push({ ...item, product, total });
    });
    const groupedData = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-TW'));
    const headers = detailSortMode === 'buyer' ? ['買家', '商品描述', '商品原名', '數量', '單項總價', '買家總計'] : ['商品', '買家', '描述', '數量', '單項總價', '商品總計'];
    const rows: (string | number)[][] = [];
    groupedData.forEach(g => g.items.forEach(i => rows.push([g.label, i.description, i.product?.name || '', i.quantity, i.total, g.totalPrice])));
    downloadCSV(`購買明細_${detailSortMode}_${selectedOrderGroup}`, headers, rows);
  };

  const handleExportAnalysis = () => {
    if (!selectedOrderGroup) return;
    const statsMap = new Map<string, { label: string, qty: number, total: number }>();
    activeOrderItems.forEach(item => {
        const p = productItems.find(i => i.groupId === item.productGroupId && i.id === item.productItemId);
        const revenue = (p?.inputPrice || 0) * item.quantity;
        let key = ''; let label = '';
        if (analysisSortMode === 'buyer') { key = item.buyer; label = item.buyer; } 
        else { key = `${item.productGroupId}-${item.productItemId}`; label = cleanProductName(p?.name || '未知商品'); }
        if (!statsMap.has(key)) statsMap.set(key, { label, qty: 0, total: 0 });
        const s = statsMap.get(key)!; s.qty += item.quantity; s.total += revenue;
    });
    const list = Array.from(statsMap.values()).sort((a, b) => b.total - a.total);
    const headers = analysisSortMode === 'buyer' ? ['買家', '總數量', '總金額'] : ['商品', '總數量', '總金額'];
    const rows = list.map(s => [s.label, s.qty, s.total]);
    downloadCSV(`分析資料_${analysisSortMode}_${selectedOrderGroup}`, headers, rows);
  };
  
  const handleExportDeposits = () => {
    if (!selectedOrderGroup) return;
    const targetItems = orderItems.filter(i => i.orderGroupId === selectedOrderGroup && i.remarks?.trim()).sort((a, b) => a.buyer.localeCompare(b.buyer, 'zh-TW'));
    const rows = targetItems.map(item => {
        const p = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
        return [item.buyer, item.remarks, item.note, p?.name || '', item.description, item.quantity, item.date];
    });
    downloadCSV(`預收款項_${selectedOrderGroup}`, ['訂購者', '備註欄', '說明', '商品名稱', '描述', '數量', '日期'], rows);
  };

  const handleExportIncome = () => {
    if (!selectedOrderGroup) return;
    const { totalJpy, totalDomestic, totalHandling, totalSales, avgRateCost, packaging, cardFeeInput, actualIntlShip, cardCharge, netProfit, profitRate, cardFeeRate } = incomeStats;
    const rows = [
        ['項目', '金額/數值'], ['日幣總計', totalJpy], ['境內運總計', totalDomestic], ['手續費總計', totalHandling], ['商品收入', totalSales], ['包材收入', packaging], ['刷卡費(成本)', cardCharge], ['刷卡手續費', cardFeeInput], ['國際運費', actualIntlShip], ['平均匯率', avgRateCost.toFixed(3)], ['手續費佔比', `${cardFeeRate.toFixed(2)}%`], ['總利潤', netProfit], ['利潤率', `${profitRate.toFixed(2)}%`], ['利潤(爸爸20%)', Math.round(netProfit * 0.2)], ['利潤(妹妹80%)', Math.round(netProfit * 0.8)], ['爸爸應收', incomeData.dadReceivable], ['收款說明', incomeData.paymentNote]
    ];
    downloadCSV(`收支計算表_${selectedOrderGroup}`, ['項目', '數值'], rows);
  };

  const handleManualSaveIncome = async () => {
      if (!selectedOrderGroup) return;
      try { await setDoc(doc(db, 'incomeSettings', selectedOrderGroup), incomeData); alert("儲存成功！"); } catch (e) { alert("儲存失敗"); }
  };

  const handleAddGroup = async () => {
    if (!newGroupInput.trim()) return;
    try { await addDoc(collection(db, 'productGroups'), { id: getNextGroupId(productGroups.map(p => p.id)), name: newGroupInput }); setNewGroupInput(''); setShowNewGroupInput(false); } catch (e) { alert("新增失敗"); }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    
    // 防呆機制 A: 檢查該類別下是否有商品
    // Safety check: Ensure no products exist in this group
    const groupItems = productItems.filter(i => i.groupId === groupId);
    if (groupItems.length > 0) {
        alert(`無法刪除：此類別「${groupId}」內尚有 ${groupItems.length} 個商品。\n\n請先清空該類別下的所有商品，才能刪除類別。`);
        return;
    }

    if (!window.confirm("確定刪除此類別？")) return;

    try {
        const batch = writeBatch(db);
        const q = query(collection(db, 'productGroups'), where('id', '==', groupId));
        const snapshot = await getDocs(q);
        snapshot.forEach(d => batch.delete(d.ref));
        
        // Safety Clean (even though check passed, good to be thorough)
        const qItems = query(collection(db, 'productItems'), where('groupId', '==', groupId));
        const snapshotItems = await getDocs(qItems);
        snapshotItems.forEach(d => batch.delete(d.ref));

        await batch.commit();
    } catch(e) { 
        alert("刪除失敗"); 
        console.error(e);
    }
  };

  const handleStartRename = (type: 'group' | 'item', groupId: string, itemId: string | undefined, currentName: string) => {
    setRenamingId({ type, groupId, itemId }); setTempName(currentName);
  };

  const handleSaveRename = async () => {
    if (!renamingId) return;
    if (!tempName.trim()) { setRenamingId(null); return; }
    try {
        const col = renamingId.type === 'group' ? 'productGroups' : 'productItems';
        const q = renamingId.type === 'group' 
            ? query(collection(db, col), where('id', '==', renamingId.groupId))
            : query(collection(db, col), where('groupId', '==', renamingId.groupId), where('id', '==', renamingId.itemId));
        const snaps = await getDocs(q);
        if (!snaps.empty) await updateDoc(snaps.docs[0].ref, { name: tempName.trim() });
    } catch(e) { console.error(e); }
    setRenamingId(null); setTempName('');
  };

  const handleSaveProduct = async (item: ProductItem) => {
    try {
        const q = query(collection(db, 'productItems'), where('groupId', '==', item.groupId), where('id', '==', item.id));
        const snaps = await getDocs(q);
        if (!snaps.empty) await updateDoc(snaps.docs[0].ref, { ...item });
        else await addDoc(collection(db, 'productItems'), item);
        setEditingProduct(null);
    } catch (e) { alert("儲存商品失敗"); }
  };

  const handleDeleteProduct = async (e: React.MouseEvent, groupId: string, itemId: string) => {
    e.stopPropagation();

    // 防呆機制 B: 檢查是否有訂單使用此商品
    // Safety Check: Check if any orders reference this product
    const relatedOrders = orderItems.filter(
        o => o.productGroupId === groupId && o.productItemId === itemId
    );

    if (relatedOrders.length > 0) {
        const exampleOrder = relatedOrders[0];
        const exampleBuyer = exampleOrder.buyer || '未知買家';
        alert(`無法刪除：此商品已被 ${relatedOrders.length} 筆訂單引用。\n\n範例：${exampleOrder.orderGroupId} - ${exampleBuyer}\n\n請先移除相關訂單資料，才能刪除商品。`);
        return;
    }

    if (window.confirm("確定刪除此商品？")) {
        try {
            const batch = writeBatch(db);
            const q = query(collection(db, 'productItems'), where('groupId', '==', groupId), where('id', '==', itemId));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                alert("找不到該商品，可能已被刪除。");
                return;
            }

            snapshot.forEach(d => batch.delete(d.ref));
            await batch.commit();
        } catch (error) {
            console.error("刪除商品失敗:", error);
            alert("刪除失敗，請稍後再試。");
        }
    }
  };

  const handleCreateOrderGroup = async () => {
    try {
        await addDoc(collection(db, 'orderGroups'), { 
            id: getNextOrderGroupId(newOrderDate.year, newOrderDate.month, orderGroups.filter(g => g.year === newOrderDate.year && g.month === newOrderDate.month).map(g => g.id)), 
            year: newOrderDate.year, month: newOrderDate.month, suffix: '' 
        });
        setShowNewOrderModal(false);
    } catch (e) { alert("建立失敗"); }
  };

  const handleDeleteOrderGroup = async (e: React.MouseEvent, groupId: string) => {
      e.stopPropagation();
      if (orderItems.some(i => i.orderGroupId === groupId)) { alert("請先清空訂單"); return; }
      if (!window.confirm("確定刪除？")) return;
      try {
          const batch = writeBatch(db);
          (await getDocs(query(collection(db, 'orderGroups'), where('id', '==', groupId)))).forEach(d => batch.delete(d.ref));
          await batch.commit();
          if (selectedOrderGroup === groupId) setSelectedOrderGroup(null);
          alert("刪除成功");
      } catch (e) { alert("刪除失敗"); }
  };

  const handleSaveOrderItem = async (item: OrderItem) => {
    try {
        if (editingOrderItem) {
             const snaps = await getDocs(query(collection(db, 'orderItems'), where('id', '==', item.id)));
             if (!snaps.empty) await updateDoc(snaps.docs[0].ref, { ...item });
        } else {
            await addDoc(collection(db, 'orderItems'), { ...item, id: generateUUID() });
        }
        setIsOrderEntryOpen(false); setEditingOrderItem(null);
    } catch (e) { alert("儲存失敗"); }
  };
  
  const handleDeleteOrderItem = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm("確定刪除？")) {
          const batch = writeBatch(db);
          (await getDocs(query(collection(db, 'orderItems'), where('id', '==', id)))).forEach(d => batch.delete(d.ref));
          await batch.commit();
      }
  }

  // --- Views ---
  // Shared Compact Header
  const Header = ({ title, actions, showOrderSelector = false }: any) => (
      <div className="bg-blue-900 shadow-lg border-b border-blue-800 shrink-0 z-10 flex flex-col relative pb-2">
         {/* Top Bar: Title & Actions */}
         <div className="flex justify-between items-center px-3 pt-3 pb-1">
             <div className="flex flex-col justify-center">
                 <h2 className="text-xl font-bold text-white tracking-wide drop-shadow-sm leading-tight">{title}</h2>
                 <span className="text-blue-300 text-[9px] font-bold tracking-widest opacity-80 scale-90 origin-left">LONG CHEN</span>
             </div>
             <div className="flex gap-1.5 items-center">
                 {actions}
             </div>
         </div>
         
         {/* Order Selector (Conditional) */}
         {showOrderSelector && (
             <div className="px-3 mt-1">
                 <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar mask-gradient-right">
                     {orderGroups.slice().reverse().map(group => (
                         <OrderBatchButton 
                            key={group.id} 
                            id={group.id} 
                            active={selectedOrderGroup === group.id} 
                            onClick={() => setSelectedOrderGroup(group.id)} 
                         />
                     ))}
                 </div>
             </div>
         )}
      </div>
  );

  const renderIncomeView = () => {
    // Only destructure variables that are actually used in the field labels or non-input displays.
    // Variables used in input 'value' props come from 'incomeData' state, not 'incomeStats'.
    const { totalJpy, totalDomestic, totalHandling, totalSales, avgRateCost, netProfit, profitRate, cardFeeRate } = incomeStats;
    const Field = ({ label, value, isInput = false, onChange, colorClass = "text-slate-700", prefix = "" }: any) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold text-slate-400 ml-1">{label}</span>
        <div className={`relative flex items-center px-2 h-9 rounded-lg border ${isInput ? 'bg-white border-blue-300 shadow-sm' : 'bg-slate-100 border-slate-200'} overflow-hidden`}>
           {isInput ? (
             <input type={typeof value === 'number' ? 'number' : 'text'} className={`w-full bg-transparent outline-none font-mono font-bold text-lg text-right ${colorClass}`} value={value} onChange={onChange} />
           ) : (
             <div className={`w-full font-mono font-bold text-lg text-right truncate ${colorClass}`}>{prefix}{value}</div>
           )}
        </div>
      </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50">
             <Header title="收支計算" showOrderSelector={true} actions={
                <>
                  <ActionButton icon={Save} label="儲存" onClick={handleManualSaveIncome} />
                  <ActionButton icon={Download} label="匯出" onClick={handleExportIncome} variant="success" />
                </>
             }/>
             <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto">
                <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-2 mt-1">
                        <Field label="日幣總計" value={formatCurrency(totalJpy)} />
                        <Field label="境內運總計" value={formatCurrency(totalDomestic)} />
                        <Field label="手續費總計" value={formatCurrency(totalHandling)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="商品收入" value={formatCurrency(totalSales)} colorClass="text-blue-600" />
                        <Field label="包材收入 (輸入)" value={incomeData.packagingRevenue} isInput onChange={(e:any) => setIncomeData({...incomeData, packagingRevenue: parseFloat(e.target.value) || 0})} colorClass="text-blue-600" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <Field label="刷卡費 (成本)" value={incomeData.cardCharge} isInput onChange={(e:any) => setIncomeData({...incomeData, cardCharge: parseFloat(e.target.value) || 0})} />
                        <Field label="刷卡手續費" value={incomeData.cardFee} isInput onChange={(e:any) => setIncomeData({...incomeData, cardFee: parseFloat(e.target.value) || 0})} />
                        <Field label="國際運費" value={incomeData.intlShipping} isInput onChange={(e:any) => setIncomeData({...incomeData, intlShipping: parseFloat(e.target.value) || 0})} />
                    </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <Field label="平均匯率" value={avgRateCost.toFixed(3)} colorClass="text-purple-600" />
                        <Field label="手續費佔比" value={`${cardFeeRate.toFixed(2)}%`} colorClass="text-purple-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="總利潤" value={formatCurrency(netProfit)} colorClass="text-emerald-600" />
                        <Field label="利潤率 ROI" value={`${profitRate.toFixed(2)}%`} colorClass="text-emerald-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="爸爸 (20%)" value={formatCurrency(Math.round(netProfit * 0.2))} colorClass="text-indigo-600" />
                        <Field label="妹妹 (80%)" value={formatCurrency(Math.round(netProfit * 0.8))} colorClass="text-rose-500" />
                    </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-2">
                    <div className="grid grid-cols-12 gap-2 mt-1">
                        <div className="col-span-4"><Field label="爸爸應收" value={incomeData.dadReceivable} isInput onChange={(e:any) => setIncomeData({...incomeData, dadReceivable: parseFloat(e.target.value) || 0})} /></div>
                        <div className="col-span-8"><Field label="收款說明" value={incomeData.paymentNote || ''} isInput onChange={(e:any) => setIncomeData({...incomeData, paymentNote: e.target.value})} /></div>
                    </div>
                </div>
             </div>
        </div>
    );
  };

  const OrderEntryModal = () => {
    const [localItem, setLocalItem] = useState<Partial<OrderItem>>(editingOrderItem || { quantity: 1, date: new Date().toISOString().split('T')[0], description: '', buyer: '', remarks: '', note: '', productGroupId: '', productItemId: '' });
    const currentGroupItems = productItems.filter(i => i.groupId === localItem.productGroupId);
    
    useEffect(() => {
        if (localItem.productGroupId && localItem.productItemId && !editingOrderItem) {
            const p = productItems.find(i => i.groupId === localItem.productGroupId && i.id === localItem.productItemId);
            if (p) setLocalItem(prev => ({ ...prev, description: p.name }));
        }
    }, [localItem.productGroupId, localItem.productItemId]);

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-200">
            <div className="px-4 py-3 border-b border-blue-900 bg-blue-950 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-cyan-400 text-lg">訂單項目</h3>
                <button onClick={() => setIsOrderEntryOpen(false)}><X size={24} className="text-blue-200" /></button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
                <div><label className="text-xs font-bold text-slate-500">商品類別</label><select className="w-full p-2 border rounded" value={localItem.productGroupId || ''} onChange={e => setLocalItem({...localItem, productGroupId: e.target.value, productItemId: ''})}><option value="">選擇類別</option>{productGroups.map(g => <option key={g.id} value={g.id}>{g.id} {g.name}</option>)}</select></div>
                <div><label className="text-xs font-bold text-slate-500">商品名稱</label><select className="w-full p-2 border rounded" value={localItem.productItemId || ''} onChange={e => setLocalItem({...localItem, productItemId: e.target.value})} disabled={!localItem.productGroupId}><option value="">選擇商品</option>{currentGroupItems.map(i => <option key={i.id} value={i.id}>{i.id} {i.name}</option>)}</select></div>
                <div><label className="text-xs font-bold text-slate-500">商品描述</label><input type="text" className="w-full p-2 border rounded" value={localItem.description} onChange={e => setLocalItem({...localItem, description: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500">訂購者</label><input type="text" className="w-full p-2 border rounded" value={localItem.buyer} onChange={e => setLocalItem({...localItem, buyer: e.target.value})} /></div>
                <div className="flex gap-2">
                    <div className="flex-1"><label className="text-xs font-bold text-slate-500">數量</label><input type="number" className="w-full p-2 border rounded" value={localItem.quantity} onChange={e => setLocalItem({...localItem, quantity: parseInt(e.target.value) || 0})} /></div>
                    <div className="flex-1"><label className="text-xs font-bold text-slate-500">日期</label><input type="date" className="w-full p-2 border rounded" value={localItem.date} onChange={e => setLocalItem({...localItem, date: e.target.value})} /></div>
                </div>
                <div><label className="text-xs font-bold text-slate-500">備註</label><input type="text" className="w-full p-2 border rounded" value={localItem.remarks} onChange={e => setLocalItem({...localItem, remarks: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500">說明</label><input type="text" className="w-full p-2 border rounded" value={localItem.note} onChange={e => setLocalItem({...localItem, note: e.target.value})} /></div>
            </div>
            <div className="p-3 border-t bg-white flex gap-2">
                {editingOrderItem && <button onClick={() => handleDeleteOrderItem(null as any, editingOrderItem.id)} className="p-3 bg-rose-50 text-rose-600 rounded"><Trash2 size={20} /></button>}
                <button onClick={() => setIsOrderEntryOpen(false)} className="flex-1 py-3 border rounded text-slate-500">取消</button>
                <button onClick={() => handleSaveOrderItem({ ...localItem, orderGroupId: selectedOrderGroup! } as OrderItem)} disabled={!localItem.productItemId || !localItem.buyer} className="flex-1 py-3 bg-blue-600 text-white rounded font-bold">儲存</button>
            </div>
        </div>
    )
  }

  const renderDetailsView = () => {
    const map = new Map<string, { label: string, totalQty: number, totalPrice: number, items: any[] }>();
    activeOrderItems.forEach(item => {
          const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
          const total = (product?.inputPrice || 0) * item.quantity;
          let key = detailSortMode === 'buyer' ? item.buyer : `${item.productGroupId}-${item.productItemId}`;
          let label = detailSortMode === 'buyer' ? item.buyer : `${cleanProductName(product?.name || '未知商品')}`;
          if (!map.has(key)) map.set(key, { label, totalQty: 0, totalPrice: 0, items: [] });
          const group = map.get(key)!;
          group.totalQty += item.quantity;
          group.totalPrice += total;
          group.items.push({ ...item, product, total });
    });
    const groupedData = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-TW'));

    return (
        <div className="flex-1 overflow-y-auto p-2 pb-24 space-y-2">
            {groupedData.map((g, i) => (
                <div key={i} className="bg-white rounded shadow-sm border border-slate-200">
                    <div className="bg-slate-50 p-2 flex justify-between items-center border-b border-slate-100">
                        <div className="font-bold text-blue-800">{g.label || '(未以此分類)'}</div>
                        <div className="text-xs text-slate-500 font-mono">
                            {g.totalQty} 件 • <span className="text-emerald-600 font-bold">{formatCurrency(g.totalPrice)}</span>
                        </div>
                    </div>
                    <div>
                        {g.items.map((item, idx) => (
                             <div key={idx} className="p-2 border-b border-slate-50 last:border-0 text-sm flex justify-between items-center">
                                 <div>
                                     <div className="text-slate-700 font-bold">{detailSortMode === 'buyer' ? cleanProductName(item.product?.name || '') : item.buyer}</div>
                                     {item.description && <div className="text-xs text-slate-400">{item.description}</div>}
                                 </div>
                                 <div className="text-right">
                                     <div className="text-xs font-bold text-slate-600">x{item.quantity}</div>
                                     <div className="text-xs text-slate-400 font-mono">{formatCurrency(item.total)}</div>
                                 </div>
                             </div>
                        ))}
                    </div>
                </div>
            ))}
            {groupedData.length === 0 && <div className="text-center py-10 text-slate-400">無資料</div>}
        </div>
    );
  };

  const renderAnalysisView = () => {
    const statsMap = new Map<string, { label: string, qty: number, total: number }>();
    activeOrderItems.forEach(item => {
        const p = productItems.find(i => i.groupId === item.productGroupId && i.id === item.productItemId);
        const revenue = (p?.inputPrice || 0) * item.quantity;
        let key = ''; let label = '';
        if (analysisSortMode === 'buyer') { key = item.buyer; label = item.buyer; } 
        else { key = `${item.productGroupId}-${item.productItemId}`; label = cleanProductName(p?.name || '未知商品'); }
        if (!statsMap.has(key)) statsMap.set(key, { label, qty: 0, total: 0 });
        const s = statsMap.get(key)!; s.qty += item.quantity; s.total += revenue;
    });
    const list = Array.from(statsMap.values()).sort((a, b) => b.total - a.total);

    return (
        <div className="flex-1 overflow-y-auto p-2 pb-24 space-y-2">
             <div className="grid grid-cols-2 gap-2">
                 <div className="bg-white p-3 rounded border border-slate-200 shadow-sm text-center">
                     <div className="text-xs text-slate-500 font-bold">總項次</div>
                     <div className="text-xl font-bold text-slate-700">{list.length}</div>
                 </div>
                 <div className="bg-white p-3 rounded border border-slate-200 shadow-sm text-center">
                     <div className="text-xs text-slate-500 font-bold">總件數</div>
                     <div className="text-xl font-bold text-slate-700">{activeOrderItems.reduce((acc, i) => acc + i.quantity, 0)}</div>
                 </div>
             </div>
             <div className="bg-white border rounded shadow-sm overflow-hidden">
                 <table className="w-full text-sm">
                     <thead className="bg-slate-50 text-slate-500 border-b">
                         <tr><th className="p-2 text-left">{analysisSortMode === 'buyer' ? '買家' : '商品'}</th><th className="p-2 text-right">數量</th><th className="p-2 text-right">營收</th></tr>
                     </thead>
                     <tbody>
                         {list.map((stat, i) => (
                             <tr key={i} className="border-b border-slate-50 last:border-0">
                                 <td className="p-2 font-bold text-slate-700 truncate max-w-[150px]">{stat.label}</td>
                                 <td className="p-2 text-right text-slate-500">{stat.qty}</td>
                                 <td className="p-2 text-right font-mono font-bold text-blue-600">{formatCurrency(stat.total)}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
    );
  };

  const renderDepositsView = () => {
    const list = activeOrderItems.filter(i => {
         const hasRemark = (i.remarks && i.remarks.trim().length > 0);
         const isTransfer = (i.buyer && i.buyer.includes('匯'));
         if (depositMode === 'income') { if (i.remarks?.includes('退') || i.remarks?.includes('支')) return false; return hasRemark || isTransfer; } 
         else { return i.remarks?.includes('退') || i.remarks?.includes('支') || i.quantity < 0; }
    }).sort((a, b) => a.buyer.localeCompare(b.buyer, 'zh-TW'));

    return (
        <div className="flex-1 overflow-y-auto p-2 pb-24 space-y-2">
            {list.length === 0 ? <div className="text-center py-10 text-slate-400">無資料</div> : 
             list.map((item, idx) => {
                 const p = productItems.find(x => x.groupId === item.productGroupId && x.id === item.productItemId);
                 return (
                     <div key={idx} className="bg-white p-3 rounded shadow-sm border border-slate-200">
                         <div className="flex justify-between mb-1">
                             <div className="font-bold text-blue-800 text-lg">{item.buyer}</div>
                             <div className="text-xs text-slate-400 font-mono">{item.date}</div>
                         </div>
                         <div className="text-sm text-slate-700 mb-2 pb-2 border-b border-slate-50">
                             {cleanProductName(p?.name || '')} <span className="text-slate-400">x{item.quantity}</span>
                         </div>
                         <div className="flex flex-wrap gap-2 text-sm">
                             {item.remarks && <span className={`px-2 py-0.5 rounded border ${depositMode === 'expense' ? 'bg-rose-50 text-rose-800 border-rose-100' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>{item.remarks}</span>}
                             {item.buyer.includes('匯') && <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100">已匯款</span>}
                         </div>
                         {item.note && <div className="mt-2 text-xs text-slate-500">說明: {item.note}</div>}
                     </div>
                 );
             })
            }
        </div>
    );
  };

  const NavButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => setView(id)} 
        className={`flex-1 flex flex-col items-center justify-center h-full transition-all duration-200 ${view === id ? 'text-yellow-400 bg-blue-900/50' : 'text-blue-200 hover:text-white'}`}
      >
        <Icon size={24} strokeWidth={view === id ? 2.5 : 2} className={view === id ? 'drop-shadow-sm' : ''} />
        <span className="text-[10px] font-bold mt-1 tracking-wide">{label}</span>
      </button>
  );

  // --- Main Layout ---
  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
            {view === 'products' && (
                <div className="flex flex-col h-full">
                    <Header title="產品管理" actions={<><ActionButton icon={Grid} label="新增" onClick={() => setShowNewGroupInput(!showNewGroupInput)} /><ActionButton icon={Download} label="匯出" onClick={handleExportProducts} variant="success" /></>} />
                    {showNewGroupInput && <div className="p-2 bg-blue-800 flex gap-2"><input autoFocus type="text" className="flex-1 p-2 text-sm rounded" value={newGroupInput} onChange={e => setNewGroupInput(e.target.value)} placeholder="類別名稱" /><button onClick={handleAddGroup} className="text-xs bg-cyan-600 text-white px-3 rounded font-bold">確定</button></div>}
                    <div className="flex-1 overflow-y-auto p-2 pb-24 space-y-2">
                        {filteredProducts.map(({ group, items }) => (
                            <div key={group.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}>
                                    <div className="flex items-center gap-2"><span className="font-mono text-blue-700 font-bold bg-blue-50 px-1.5 rounded text-sm">{group.id}</span>
                                    {renamingId?.type === 'group' && renamingId.groupId === group.id ? 
                                        <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={handleSaveRename} onClick={e => e.stopPropagation()} className="font-bold text-lg border-b border-blue-500 w-32"/> : 
                                        <span className="font-bold text-lg" onClick={(e) => { e.stopPropagation(); handleStartRename('group', group.id, undefined, group.name); }}>{group.name}</span>}
                                    <span className="text-xs text-slate-400">({items.length})</span></div>
                                    {expandedGroup === group.id ? <ChevronDown size={20} className="text-blue-500"/> : <ChevronRight size={20} className="text-slate-400"/>}
                                </div>
                                {expandedGroup === group.id && <div className="p-2 bg-slate-50 border-t border-slate-100 space-y-2">
                                    <div className="flex justify-between gap-2"><button onClick={(e) => handleDeleteGroup(e, group.id)} className="text-xs text-rose-600 border border-rose-200 bg-white px-2 py-1.5 rounded flex items-center font-bold"><Trash2 size={12} className="mr-1"/>刪除類別</button><button onClick={() => setEditingProduct({ group, nextId: getNextItemId(items.map(i => i.id)) })} className="text-xs text-white bg-emerald-600 px-3 py-1.5 rounded flex items-center font-bold"><Plus size={14} className="mr-1"/>新增商品</button></div>
                                    {items.map(item => {
                                        const stats = calculateProductStats(item);
                                        return (
                                            <div key={item.id} className="bg-white border rounded p-2 text-sm shadow-sm relative">
                                                <div className="flex justify-between mb-1"><div className="flex-1 mr-2"><span className="font-mono bg-slate-100 px-1 rounded text-xs mr-1">{item.id}</span>
                                                {renamingId?.type === 'item' && renamingId.itemId === item.id ? <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={handleSaveRename} className="font-bold border-b border-blue-500 w-full"/> : <span className="font-bold" onClick={(e) => { e.stopPropagation(); handleStartRename('item', group.id, item.id, item.name); }}>{cleanProductName(item.name)}</span>}
                                                </div><div className="flex gap-2"><Edit size={16} className="text-blue-500 cursor-pointer" onClick={() => setEditingProduct({ group, item, nextId: item.id })} /><Trash2 size={16} className="text-rose-500 cursor-pointer" onClick={(e) => handleDeleteProduct(e, group.id, item.id)} /></div></div>
                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600 bg-slate-50 p-1.5 rounded">
                                                    <div className="flex justify-between"><span>日幣:</span> <span className="font-bold">¥{item.jpyPrice}</span></div>
                                                    <div className="flex justify-between text-emerald-600 font-bold"><span>利潤:</span> <span>{formatCurrency(stats.profit)}</span></div>
                                                    <div className="flex justify-between"><span>成本+運:</span> <span>{formatCurrency(stats.costPlusShip)}</span></div>
                                                    <div className="flex justify-between text-rose-500 font-bold"><span>售價+運:</span> <span>{formatCurrency(stats.pricePlusShip)}</span></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>}
                            </div>
                        ))}
                    </div>
                    {editingProduct && <ProductForm group={editingProduct.group} existingItems={productItems} initialData={editingProduct.item} nextId={editingProduct.nextId} onSave={handleSaveProduct} onCancel={() => setEditingProduct(null)} />}
                </div>
            )}
            {view === 'orders' && (
                <div className="flex flex-col h-full">
                    <Header title="訂單管理" showOrderSelector={true} actions={<><ActionButton icon={Plus} label="訂單" onClick={() => setShowNewOrderModal(true)} /><ActionButton icon={Download} label="匯出" onClick={handleExportOrders} variant="success" /></>} />
                    <div className="flex-1 overflow-y-auto p-2 pb-24 space-y-2">
                        {activeOrderGroup && (
                            <div className="bg-white rounded shadow-sm p-2 flex justify-between items-center border-l-4 border-blue-600 mb-2">
                                <div><div className="text-xs text-slate-400 font-bold">批次</div><div className="text-2xl font-mono font-bold text-slate-800">{activeOrderGroup.id}</div></div>
                                <div className="flex gap-2"><button onClick={(e) => handleDeleteOrderGroup(e, activeOrderGroup.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2/></button><button onClick={() => { setIsOrderEntryOpen(true); setEditingOrderItem(null); }} className="bg-emerald-600 text-white px-4 py-2 rounded font-bold flex items-center"><Plus size={18} className="mr-1"/>新增</button></div>
                            </div>
                        )}
                        {activeOrderItems.length === 0 ? <div className="text-center py-10 text-slate-400">無訂單資料</div> : activeOrderItems.map(item => {
                            const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
                            const group = productGroups.find(g => g.id === item.productGroupId);
                            return (
                                <div key={item.id} className="bg-white p-2.5 rounded shadow-sm border border-slate-200 text-sm relative">
                                    <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-50"><span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 rounded">{group?.name}</span><div className="flex gap-2"><Edit size={16} className="text-blue-500" onClick={() => { setEditingOrderItem(item); setIsOrderEntryOpen(true); }} /><Trash2 size={16} className="text-rose-500" onClick={(e) => handleDeleteOrderItem(e, item.id)} /></div></div>
                                    <div className="flex justify-between items-start mb-1"><div className="font-bold text-slate-800 text-base">{cleanProductName(product?.name || '')} {item.description && <span className="text-slate-500 text-xs font-normal"> : {item.description}</span>}</div><div className="text-[10px] text-slate-400 font-mono">{item.date}</div></div>
                                    <div className="bg-slate-50 p-1.5 rounded flex justify-between items-center"><div className="font-bold text-blue-700 flex items-center gap-1"><User size={14}/> {item.buyer}</div><div className="flex items-center gap-2"><span className="font-bold text-slate-600 bg-white px-1 rounded shadow-sm">x{item.quantity}</span><span className="font-mono font-bold text-emerald-600 text-base">{formatCurrency((product?.inputPrice || 0) * item.quantity)}</span></div></div>
                                    {item.remarks && <div className="mt-1 text-amber-600 text-xs border-t border-slate-100 pt-1">備註: {item.remarks}</div>}
                                </div>
                            )
                        })}
                    </div>
                    {showNewOrderModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-lg w-full max-w-sm"><h3 className="font-bold mb-4">建立批次</h3><div className="flex gap-2 mb-4"><select className="border p-2 rounded flex-1" value={newOrderDate.year} onChange={e => setNewOrderDate({...newOrderDate, year: +e.target.value})}><option value="2025">2025</option><option value="2026">2026</option></select><select className="border p-2 rounded flex-1" value={newOrderDate.month} onChange={e => setNewOrderDate({...newOrderDate, month: +e.target.value})}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}月</option>)}</select></div><div className="flex justify-end gap-2"><button onClick={()=>setShowNewOrderModal(false)} className="px-4 py-2 text-slate-500">取消</button><button onClick={handleCreateOrderGroup} className="px-4 py-2 bg-blue-600 text-white rounded">建立</button></div></div></div>}
                    {isOrderEntryOpen && <OrderEntryModal />}
                </div>
            )}
            {view === 'details' && (
                <div className="flex flex-col h-full">
                    <Header title="購買明細" showOrderSelector={true} actions={<><ActionButton icon={User} label="買家" onClick={() => setDetailSortMode('buyer')} active={detailSortMode === 'buyer'} /><ActionButton icon={Box} label="商品" onClick={() => setDetailSortMode('product')} active={detailSortMode === 'product'} /><ActionButton icon={Download} label="匯出" onClick={handleExportDetails} variant="success" /></>}/>
                    {renderDetailsView()}
                </div>
            )}
            {view === 'analysis' && (
                <div className="flex flex-col h-full">
                    <Header title="分析資料" showOrderSelector={true} actions={<><ActionButton icon={User} label="買家" onClick={() => setAnalysisSortMode('buyer')} active={analysisSortMode === 'buyer'} /><ActionButton icon={Box} label="商品" onClick={() => setAnalysisSortMode('product')} active={analysisSortMode === 'product'} /><ActionButton icon={Download} label="匯出" onClick={handleExportAnalysis} variant="success" /></>}/>
                    {renderAnalysisView()}
                </div>
            )}
            {view === 'deposits' && (
                <div className="flex flex-col h-full">
                    <Header title="預收款項" showOrderSelector={true} actions={<><ActionButton icon={ArrowUpCircle} label="收入" onClick={() => setDepositMode('income')} active={depositMode === 'income'} /><ActionButton icon={ArrowDownCircle} label="支出" onClick={() => setDepositMode('expense')} active={depositMode === 'expense'} /><ActionButton icon={Download} label="匯出" onClick={handleExportDeposits} variant="success" /></>} />
                    {renderDepositsView()}
                </div>
            )}
            {view === 'income' && renderIncomeView()}
        </div>

        <div className="bg-blue-900 border-t border-blue-800 flex justify-around items-center pb-safe shadow-2xl shrink-0 z-50 text-white h-20">
            <NavButton id="products" label="產品管理" icon={Package} />
            <NavButton id="orders" label="訂單管理" icon={ShoppingCart} />
            <NavButton id="details" label="購買明細" icon={List} />
            <NavButton id="analysis" label="分析資料" icon={BarChart2} />
            <NavButton id="deposits" label="預收款項" icon={Wallet} />
            <NavButton id="income" label="收支計算" icon={Calculator} />
        </div>
    </div>
  );
};

export default App;
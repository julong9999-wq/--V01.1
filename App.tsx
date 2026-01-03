import React, { useState, useMemo, useEffect } from 'react';
import { ProductGroup, ProductItem, OrderGroup, OrderItem, ViewState } from './types';
import { INITIAL_PRODUCT_GROUPS, INITIAL_PRODUCT_ITEMS, INITIAL_ORDER_GROUPS, INITIAL_ORDER_ITEMS } from './constants';
import { getNextGroupId, getNextItemId, getNextOrderGroupId, calculateProductStats, formatCurrency, generateUUID, cleanProductName } from './utils';
import ProductForm from './components/ProductForm';
import { Trash2, Edit, Plus, Package, ShoppingCart, List, BarChart2, ChevronRight, ChevronDown, User, Box, X, Calculator, Download, Save, Wallet, ArrowUpCircle, ArrowDownCircle, Grid, PieChart, Check } from 'lucide-react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
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
    paymentNote: '',
    status: 'processing' // Default 'processing' (Green)
};

// --- UI Components ---

// 1. Standard Action Button (Unified Design)
// Rules: Height h-9 (Small), Text-sm (14px), Font-Bold, Icon (16px) + 2 Chars
const ActionButton = ({ icon: Icon, label, onClick, active = false, variant = 'primary', className = '' }: any) => {
    let colorClass = "bg-blue-700 hover:bg-blue-600 border-blue-600 text-white"; // Primary
    if (variant === 'success') colorClass = "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white";
    // if (variant === 'danger') colorClass = "bg-rose-600 hover:bg-rose-500 border-rose-500 text-white"; // User cancelled Red Delete
    if (variant === 'danger') colorClass = "bg-white border-slate-300 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"; // Reverted to outline-ish with subtle hover
    if (variant === 'warning') colorClass = "bg-amber-600 hover:bg-amber-500 border-amber-500 text-white";
    if (variant === 'outline') colorClass = "bg-white border-slate-300 text-slate-600 hover:bg-slate-50";
    if (active) colorClass = "bg-yellow-400 text-blue-900 border-yellow-400 font-bold hover:bg-yellow-300";
    
    return (
        <button 
            onClick={onClick}
            className={`
                h-9 px-3 min-w-[80px] rounded-lg border shadow-sm transition-all active:scale-95
                flex items-center justify-center gap-1.5
                text-sm font-bold tracking-wide
                ${colorClass}
                ${className}
            `}
        >
            <Icon size={18} strokeWidth={2.5} />
            <span>{label}</span>
        </button>
    );
};

// 2. Order Batch Selector Button (Unified Size)
const OrderBatchButton = ({ id, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`
            h-9 min-w-[80px] px-2 rounded-lg border font-mono font-bold text-sm tracking-tight transition-all
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

// 3. Income Field Component (Optimized Typography: 12px thin label, 16px bold content)
const IncomeField = ({ label, value, isInput = false, onChange, colorClass = "text-slate-700", prefix = "" }: any) => (
  <div className="flex flex-col w-full">
    {/* Label: 12px gray thin */}
    <span className="text-[12px] font-light text-slate-500 ml-1 mb-0.5">{label}</span>
    <div className={`relative flex items-center px-2 h-10 rounded-lg border ${isInput ? 'bg-white border-blue-200' : 'bg-slate-50 border-slate-100'} overflow-hidden w-full`}>
       {isInput ? (
         <input 
            type={typeof value === 'number' ? 'number' : 'text'}
            inputMode={typeof value === 'number' ? 'decimal' : 'text'} 
            step="any" 
            // Input: 16px (text-base) font-bold
            className={`w-full bg-transparent outline-none font-mono font-bold text-base text-right ${colorClass}`} 
            value={value} 
            onChange={onChange} 
            onFocus={(e) => e.target.select()} 
         />
       ) : (
         // Display: 16px (text-base) font-bold
         <div className={`w-full font-mono font-bold text-base text-right truncate ${colorClass}`}>{prefix}{value}</div>
       )}
    </div>
  </div>
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
  
  // State for Income Analysis Modal
  const [showIncomeAnalysisModal, setShowIncomeAnalysisModal] = useState(false);

  // View Specific States
  const [detailSortMode, setDetailSortMode] = useState<'buyer' | 'product'>('buyer');
  
  // Updated: Analysis mode tracks 'expenditure' or 'income'
  const [analysisMode, setAnalysisMode] = useState<'expenditure' | 'income'>('income');
  
  // Current Batch Manual Data (allow any type to support string input during editing)
  const [incomeData, setIncomeData] = useState<any>(DEFAULT_INCOME_DATA);
  // All Batches Manual Data (for Global Analysis)
  const [allIncomeSettings, setAllIncomeSettings] = useState<Record<string, typeof DEFAULT_INCOME_DATA>>({});

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

    // NEW: Listen to all income settings for global analysis
    const unsubAllIncome = onSnapshot(collection(db, 'incomeSettings'), (snapshot) => {
        const settingsMap: Record<string, typeof DEFAULT_INCOME_DATA> = {};
        snapshot.docs.forEach(doc => {
            settingsMap[doc.id] = doc.data() as typeof DEFAULT_INCOME_DATA;
        });
        setAllIncomeSettings(settingsMap);
    });

    return () => { unsubGroups(); unsubItems(); unsubOrderGroups(); unsubOrderItems(); unsubAllIncome(); };
  }, []);

  // Update local incomeData when selected group changes or global settings update
  useEffect(() => {
    if (selectedOrderGroup && allIncomeSettings[selectedOrderGroup]) {
        setIncomeData(allIncomeSettings[selectedOrderGroup]);
    } else {
        setIncomeData(DEFAULT_INCOME_DATA);
    }
  }, [selectedOrderGroup, allIncomeSettings]);

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

  // --- Income Stats Calculation (Main View) ---
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
    
    // Use local incomeData state for real-time updates, parse safely
    const packaging = parseFloat(String(incomeData.packagingRevenue || 0)) || 0;
    const cardCharge = parseFloat(String(incomeData.cardCharge || 0)) || 0;
    const cardFeeInput = parseFloat(String(incomeData.cardFee || 0)) || 0;
    const actualIntlShip = parseFloat(String(incomeData.intlShipping || 0)) || 0;
    
    const totalRevenue = totalSales + packaging;
    const totalExpenses = cardCharge + cardFeeInput + actualIntlShip;
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

  const getDocRef = async (col: string, idField: string, idValue: string) => {
    const q = query(collection(db, col), where(idField, '==', idValue));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].ref;
    return null;
  };

  const handleAddGroup = async () => {
    if (!newGroupInput.trim()) return;
    const newId = getNextGroupId(productGroups.map(g => g.id));
    const newGroup: ProductGroup = { id: newId, name: newGroupInput.trim() };
    await addDoc(collection(db, 'productGroups'), newGroup);
    setNewGroupInput('');
    setShowNewGroupInput(false);
  };

  const handleStartRename = (type: 'group' | 'item', groupId: string, itemId: string | undefined, currentName: string) => {
    setRenamingId({ type, groupId, itemId });
    setTempName(currentName);
  };

  const handleSaveRename = async () => {
    if (!renamingId) return;
    const { type, groupId, itemId } = renamingId;
    if (type === 'group') {
        const ref = await getDocRef('productGroups', 'id', groupId);
        if(ref) await updateDoc(ref, { name: tempName });
    } else if (itemId) {
         const q = query(collection(db, 'productItems'), where('groupId', '==', groupId), where('id', '==', itemId));
         const snap = await getDocs(q);
         if(!snap.empty) await updateDoc(snap.docs[0].ref, { name: tempName });
    }
    setRenamingId(null);
    setTempName('');
  };

  const handleDeleteGroup = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(!confirm('確定刪除此類別？')) return;
    const ref = await getDocRef('productGroups', 'id', id);
    if(ref) await deleteDoc(ref);
  };

  const handleSaveProduct = async (item: ProductItem) => {
    if (editingProduct?.item) {
        // Update
        const q = query(collection(db, 'productItems'), where('groupId', '==', item.groupId), where('id', '==', item.id));
        const snap = await getDocs(q);
        if(!snap.empty) await updateDoc(snap.docs[0].ref, { ...item });
    } else {
        // Add
        await addDoc(collection(db, 'productItems'), item);
    }
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (e: React.MouseEvent, groupId: string, itemId: string) => {
    e.stopPropagation();
    if(!confirm('確定刪除此商品？')) return;
    const q = query(collection(db, 'productItems'), where('groupId', '==', groupId), where('id', '==', itemId));
    const snap = await getDocs(q);
    if(!snap.empty) await deleteDoc(snap.docs[0].ref);
  };

  const handleCreateOrderGroup = async () => {
    const id = getNextOrderGroupId(newOrderDate.year, newOrderDate.month, orderGroups.filter(g => g.year === newOrderDate.year && g.month === newOrderDate.month).map(g => g.id));
    const newGroup: OrderGroup = { id, year: newOrderDate.year, month: newOrderDate.month, suffix: id.slice(-1) };
    await addDoc(collection(db, 'orderGroups'), newGroup);
    setShowNewOrderModal(false);
    setSelectedOrderGroup(id);
  };

  const handleDeleteOrderGroup = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(!confirm(`確定刪除訂單批次 ${id} 及其所有訂單？`)) return;
    const gRef = await getDocRef('orderGroups', 'id', id);
    if(gRef) await deleteDoc(gRef);

    const q = query(collection(db, 'orderItems'), where('orderGroupId', '==', id));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    if (selectedOrderGroup === id) setSelectedOrderGroup(null);
  };

  const handleSaveOrderItem = async (item: OrderItem) => {
    if (editingOrderItem) {
        const ref = await getDocRef('orderItems', 'id', item.id);
        if(ref) await updateDoc(ref, { ...item });
    } else {
        const newItem = { ...item, id: generateUUID() };
        await addDoc(collection(db, 'orderItems'), newItem);
    }
    setIsOrderEntryOpen(false);
    setEditingOrderItem(null);
  };

  const handleDeleteOrderItem = async (e: React.MouseEvent | null, id: string) => {
    if(e) e.stopPropagation();
    if(!confirm('確定刪除此訂單項目？')) return;
    const ref = await getDocRef('orderItems', 'id', id);
    if(ref) await deleteDoc(ref);
    if(isOrderEntryOpen) setIsOrderEntryOpen(false);
  };

  const handleManualSaveIncome = async () => {
    if (!selectedOrderGroup) return;
    // Ensure we save parsed numbers
    const dataToSave = {
        packagingRevenue: parseFloat(String(incomeData.packagingRevenue)) || 0,
        cardCharge: parseFloat(String(incomeData.cardCharge)) || 0,
        cardFee: parseFloat(String(incomeData.cardFee)) || 0,
        intlShipping: parseFloat(String(incomeData.intlShipping)) || 0,
        dadReceivable: parseFloat(String(incomeData.dadReceivable)) || 0,
        paymentNote: incomeData.paymentNote || '',
        status: incomeData.status || 'processing' // Save status as well
    };
    await setDoc(doc(db, 'incomeSettings', selectedOrderGroup), dataToSave);
    alert('儲存成功');
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
    const headers = ['分類', '商品/買家', '數量', '金額'];
    const rows: (string | number)[][] = [];
    
    // Logic similar to view but for CSV
    const map = new Map<string, { id: string, label: string, totalQty: number, totalPrice: number, items: any[] }>();
    activeOrderItems.forEach(item => {
          const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
          if (!product) return; 
          const total = product.inputPrice * item.quantity;
          let key = ''; let label = '';
          if (detailSortMode === 'buyer') { key = item.buyer; label = item.buyer; } 
          else { key = item.productGroupId; const group = productGroups.find(g => g.id === item.productGroupId); label = group ? group.name : item.productGroupId; }
          if (!map.has(key)) map.set(key, { id: key, label, totalQty: 0, totalPrice: 0, items: [] });
          const group = map.get(key)!;
          group.totalQty += item.quantity;
          group.totalPrice += total;
          group.items.push({ ...item, product, total });
    });
    const groupedData = Array.from(map.values()).sort((a, b) => {
        if (detailSortMode === 'product') return a.id.localeCompare(b.id);
        return a.label.localeCompare(b.label, 'zh-TW');
    });

    groupedData.forEach(g => {
        rows.push([g.label, '總計', g.totalQty, g.totalPrice]);
        g.items.forEach(item => {
            const desc = item.description || cleanProductName(item.product.name);
            rows.push(['', desc, item.quantity, item.total]);
        });
    });

    downloadCSV(`購買明細_${selectedOrderGroup}`, headers, rows);
  };

  const handleExportAnalysis = () => {
    if (!selectedOrderGroup) return;
    
    // Aggregate data first
    const groupMap = new Map<string, Map<string, {
        item: ProductItem,
        qty: number,
        jpyTotal: number,
        domesticTotal: number,
        twdTotal: number
    }>>();

    activeOrderItems.forEach(orderItem => {
        const { productGroupId, productItemId, quantity } = orderItem;
        const product = productItems.find(p => p.groupId === productGroupId && p.id === productItemId);
        if (!product) return;

        if (!groupMap.has(productGroupId)) groupMap.set(productGroupId, new Map());
        const itemMap = groupMap.get(productGroupId)!;

        if (!itemMap.has(productItemId)) {
            itemMap.set(productItemId, { item: product, qty: 0, jpyTotal: 0, domesticTotal: 0, twdTotal: 0 });
        }
        const stats = itemMap.get(productItemId)!;
        stats.qty += quantity;
        stats.jpyTotal += product.jpyPrice * quantity;
        stats.domesticTotal += product.domesticShip * quantity;
        stats.twdTotal += product.inputPrice * quantity;
    });

    const rows: (string | number)[][] = [];
    const sortedGroupIds = Array.from(groupMap.keys()).sort();
    
    let headers: string[] = [];
    if (analysisMode === 'expenditure') {
        headers = ['類別', '商品ID', '商品名稱', '數量', '日幣總價', '境內運總價'];
    } else {
        headers = ['類別', '商品ID', '商品名稱', '數量', '台幣總價'];
    }

    sortedGroupIds.forEach(gid => {
        const groupName = productGroups.find(g => g.id === gid)?.name || gid;
        const itemMap = groupMap.get(gid)!;
        const sortedItemIds = Array.from(itemMap.keys()).sort();

        sortedItemIds.forEach(iid => {
            const stat = itemMap.get(iid)!;
            const name = cleanProductName(stat.item.name);
            if (analysisMode === 'expenditure') {
                rows.push([groupName, `${gid}-${iid}`, name, stat.qty, stat.jpyTotal, stat.domesticTotal]);
            } else {
                rows.push([groupName, `${gid}-${iid}`, name, stat.qty, stat.twdTotal]);
            }
        });
    });

    const modeName = analysisMode === 'expenditure' ? '支出' : '收入';
    downloadCSV(`分析_${modeName}_${selectedOrderGroup}`, headers, rows);
  };

  const handleExportDeposits = () => {
    if (!selectedOrderGroup) return;
    const headers = ['買家', '備註', '說明'];
    
    // Export ALL items that have remarks
    const list = activeOrderItems.filter(i => {
         return i.remarks && i.remarks.trim().length > 0;
    }).sort((a, b) => {
         // Sort by Product (Order Item) then Buyer
         if (a.productGroupId !== b.productGroupId) return a.productGroupId.localeCompare(b.productGroupId);
         if (a.productItemId !== b.productItemId) return a.productItemId.localeCompare(b.productItemId);
         return a.buyer.localeCompare(b.buyer, 'zh-TW');
    });

    const rows = list.map(item => {
        return [item.buyer, item.remarks, item.note];
    });
    downloadCSV(`預收款項_${selectedOrderGroup}`, headers, rows);
  };

  const handleExportIncome = () => {
    if (!selectedOrderGroup) return;

    // Export DETAILED order items with cost/profit calculations
    const headers = [
        '日期', '訂購者', '類別', '商品名稱', '商品描述', '數量',
        '日幣單價', '匯率(成)', '匯率(售)',
        '台幣成本(單)', '台幣售價(單)', '國際運',
        '成本總計', '營收總計', '毛利'
    ];

    const rows = activeOrderItems.map(item => {
        const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
        if (!product) return [];
        const stats = calculateProductStats(product);

        // Per item calculations
        const totalCost = stats.costPlusShip * item.quantity;
        const totalRev = product.inputPrice * item.quantity;
        const grossProfit = totalRev - totalCost;

        return [
            item.date,
            item.buyer,
            item.productGroupId,
            cleanProductName(product.name),
            item.description,
            item.quantity,
            product.jpyPrice,
            product.rateCost,
            product.rateSale,
            stats.costPlusShip,
            product.inputPrice,
            product.intlShip,
            totalCost,
            totalRev,
            grossProfit
        ];
    });

    downloadCSV(`收支明細_${selectedOrderGroup}`, headers, rows);
  };

  const renderDetailsView = () => {
    if (!selectedOrderGroup) return;

    const subTableStyle = "text-slate-500 font-normal text-base";

    if (detailSortMode === 'buyer') {
        const buyerMap = new Map<string, { buyer: string, totalTwd: number, products: Map<string, { product: ProductItem, totalPrice: number, items: OrderItem[] }> }>();

        activeOrderItems.forEach(item => {
            const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
            if (!product) return;
            const buyer = item.buyer;
            if (!buyerMap.has(buyer)) buyerMap.set(buyer, { buyer, totalTwd: 0, products: new Map() });
            const buyerEntry = buyerMap.get(buyer)!;
            const productKey = `${item.productGroupId}-${item.productItemId}`; 
            if (!buyerEntry.products.has(productKey)) buyerEntry.products.set(productKey, { product, totalPrice: 0, items: [] });
            const prodEntry = buyerEntry.products.get(productKey)!;
            const lineTotal = product.inputPrice * item.quantity;
            prodEntry.items.push(item);
            prodEntry.totalPrice += lineTotal;
            buyerEntry.totalTwd += lineTotal;
        });

        const sortedBuyers = Array.from(buyerMap.values()).sort((a, b) => a.buyer.localeCompare(b.buyer, 'zh-TW'));

        return (
            <div className="flex-1 overflow-y-auto p-2 pb-24 space-y-3">
                {sortedBuyers.map((b, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-blue-50 p-3 flex justify-between items-center border-b border-blue-100">
                            <div className="flex items-center gap-2">
                                <User size={20} className="text-blue-600"/>
                                <span className="font-bold text-xl text-blue-900">{b.buyer}</span>
                            </div>
                            <span className="font-mono font-bold text-xl text-blue-700">{formatCurrency(b.totalTwd)}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {Array.from(b.products.values()).sort((x, y) => x.product.id.localeCompare(y.product.id)).map((p, pIdx) => (
                                <div key={pIdx} className="p-0">
                                    <div className="p-2 flex justify-between items-center bg-slate-50/30">
                                        <div className="font-bold text-lg text-slate-800">
                                            <span className="inline-block bg-slate-200 text-slate-600 text-sm px-1.5 rounded mr-2 align-middle">{p.product.id}</span>
                                            {cleanProductName(p.product.name)}
                                        </div>
                                        <div className="font-mono font-bold text-lg text-slate-700">
                                            {formatCurrency(p.totalPrice)}
                                        </div>
                                    </div>
                                    <div className="px-4 pb-2">
                                        {p.items.map((item, itemIdx) => (
                                            <div key={itemIdx} className={`flex justify-between items-center py-1 ${subTableStyle} border-t border-dashed border-slate-100 first:border-t-0`}>
                                                <div className="flex-1 truncate pr-2">{item.description || '單一款式'}</div>
                                                <div className="flex gap-4 font-mono shrink-0"><span>x{item.quantity}</span><span>${p.product.inputPrice}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {sortedBuyers.length === 0 && <div className="text-center py-10 text-slate-400 text-lg">無資料</div>}
            </div>
        );
    } else {
        const productMap = new Map<string, { product: ProductItem, description: string, totalQty: number, totalPrice: number, buyers: OrderItem[] }>();

        activeOrderItems.forEach(item => {
            const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
            if (!product) return;
            const key = `${item.productGroupId}-${item.productItemId}-${item.description || ''}`;
            if (!productMap.has(key)) productMap.set(key, { product, description: item.description, totalQty: 0, totalPrice: 0, buyers: [] });
            const entry = productMap.get(key)!;
            const lineTotal = product.inputPrice * item.quantity;
            entry.totalQty += item.quantity;
            entry.totalPrice += lineTotal;
            entry.buyers.push(item);
        });

        const sortedProducts = Array.from(productMap.values()).sort((a, b) => {
             const idDiff = a.product.id.localeCompare(b.product.id);
             if (idDiff !== 0) return idDiff;
             return (a.description || '').localeCompare(b.description || '');
        });

        return (
            <div className="flex-1 overflow-y-auto p-2 pb-24 space-y-3">
                {sortedProducts.map((p, i) => {
                     const productName = cleanProductName(p.product.name);
                     const fullName = p.description ? `${productName} : ${p.description}` : productName;
                     return (
                        <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                             <div className="bg-emerald-50 p-3 flex justify-between items-center border-b border-emerald-100">
                                <div className="font-bold text-lg text-slate-800 pr-2 leading-tight">
                                    <span className="inline-block bg-emerald-200 text-emerald-800 text-sm px-1.5 rounded mr-2 align-middle">{p.product.id}</span>
                                    {fullName}
                                </div>
                                <div className="font-mono font-bold text-xl text-emerald-700 shrink-0">{formatCurrency(p.totalPrice)}</div>
                             </div>
                             <div className="px-3 py-1">
                                {p.buyers.map((item, itemIdx) => (
                                    <div key={itemIdx} className={`flex justify-between items-center py-1.5 ${subTableStyle} border-b border-slate-50 last:border-0`}>
                                        <div className="flex-1 truncate font-medium">{item.buyer}</div>
                                        <div className="flex gap-4 font-mono shrink-0"><span>x{item.quantity}</span><span>${p.product.inputPrice}</span></div>
                                    </div>
                                ))}
                             </div>
                        </div>
                     );
                })}
                {sortedProducts.length === 0 && <div className="text-center py-10 text-slate-400 text-lg">無資料</div>}
            </div>
        );
    }
  };

  const renderAnalysisView = () => {
    const groupMap = new Map<string, { group: ProductGroup, items: Map<string, { item: ProductItem, qty: number, jpyTotal: number, domesticTotal: number, twdTotal: number }> }>();
    let totalQty = 0; let grandTotalJPY = 0; let grandTotalDomestic = 0; let grandTotalTWD = 0;

    activeOrderItems.forEach(orderItem => {
        const { productGroupId, productItemId, quantity } = orderItem;
        const product = productItems.find(p => p.groupId === productGroupId && p.id === productItemId);
        if (!product) return;
        const group = productGroups.find(g => g.id === productGroupId);
        if (!group) return;

        if (!groupMap.has(productGroupId)) groupMap.set(productGroupId, { group, items: new Map() });
        const groupEntry = groupMap.get(productGroupId)!;
        if (!groupEntry.items.has(productItemId)) groupEntry.items.set(productItemId, { item: product, qty: 0, jpyTotal: 0, domesticTotal: 0, twdTotal: 0 });
        const stats = groupEntry.items.get(productItemId)!;
        stats.qty += quantity;
        const lineJpy = product.jpyPrice * quantity;
        const lineDom = product.domesticShip * quantity;
        const lineTwd = product.inputPrice * quantity;
        stats.jpyTotal += lineJpy; stats.domesticTotal += lineDom; stats.twdTotal += lineTwd;
        totalQty += quantity; grandTotalJPY += lineJpy; grandTotalDomestic += lineDom; grandTotalTWD += lineTwd;
    });

    const sortedGroupIds = Array.from(groupMap.keys()).sort();
    const subTableStyle = "text-slate-500 font-light text-base";

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-base font-bold text-slate-600 uppercase tracking-wider">商品項目 (類別)</th>
                            <th className="p-3 text-right text-base font-bold text-slate-600 uppercase tracking-wider w-16">數量</th>
                            {analysisMode === 'expenditure' ? (
                                <><th className="p-3 text-right text-base font-bold text-amber-600 uppercase tracking-wider">日幣總價</th><th className="p-3 text-right text-base font-bold text-orange-600 uppercase tracking-wider">境內運</th></>
                            ) : (
                                <th className="p-3 text-right text-base font-bold text-emerald-600 uppercase tracking-wider">台幣總價</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedGroupIds.map(gid => {
                            const entry = groupMap.get(gid)!;
                            const sortedItemIds = Array.from(entry.items.keys()).sort();
                            return (
                                <React.Fragment key={gid}>
                                    <tr className="bg-slate-100/80 border-t border-slate-200 first:border-t-0">
                                        <td colSpan={analysisMode === 'expenditure' ? 4 : 3} className="px-3 py-2">
                                            <span className="font-mono text-sm font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-2">{gid}</span>
                                            <span className="font-bold text-slate-800 text-lg">{entry.group.name}</span>
                                        </td>
                                    </tr>
                                    {sortedItemIds.map(iid => {
                                        const stat = entry.items.get(iid)!;
                                        return (
                                            <tr key={`${gid}-${iid}`} className="hover:bg-slate-50 transition-colors">
                                                <td className={`p-3 pl-8 ${subTableStyle}`}>
                                                    <div className="line-clamp-2 leading-tight">
                                                        <span className="font-mono text-xs mr-1 opacity-70">{iid}</span>
                                                        {cleanProductName(stat.item.name)}
                                                    </div>
                                                </td>
                                                <td className={`p-3 text-right font-mono ${subTableStyle}`}>{stat.qty}</td>
                                                {analysisMode === 'expenditure' ? (
                                                    <><td className={`p-3 text-right font-mono ${subTableStyle}`}>¥{stat.jpyTotal}</td><td className={`p-3 text-right font-mono ${subTableStyle}`}>¥{stat.domesticTotal}</td></>
                                                ) : (
                                                    <td className={`p-3 text-right font-mono ${subTableStyle}`}>{formatCurrency(stat.twdTotal)}</td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </React.Fragment>
                            )
                        })}
                        {sortedGroupIds.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-lg">無資料</td></tr>}
                    </tbody>
                    <tfoot className="bg-blue-100 text-blue-900 sticky bottom-0 z-10 shadow-lg border-t-2 border-blue-200">
                        <tr>
                            <td className="p-3 font-bold text-base text-right">總計</td>
                            <td className="p-3 text-right font-bold font-mono text-base">{totalQty}</td>
                            {analysisMode === 'expenditure' ? (
                                <><td className="p-3 text-right font-bold font-mono text-base text-blue-900">¥{grandTotalJPY}</td><td className="p-3 text-right font-bold font-mono text-base text-blue-900">¥{grandTotalDomestic}</td></>
                            ) : (
                                <td className="p-3 text-right font-bold font-mono text-base text-blue-900">{formatCurrency(grandTotalTWD)}</td>
                            )}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    )
  };

  const renderDepositsView = () => {
    const itemsWithRemarks = activeOrderItems.filter(i => i.remarks && i.remarks.trim().length > 0);
    const displayList = itemsWithRemarks.sort((a, b) => a.buyer.localeCompare(b.buyer, 'zh-TW'));

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-base font-bold text-slate-600 uppercase tracking-wider w-1/3">訂購者</th>
                            <th className="p-3 text-base font-bold text-slate-600 uppercase tracking-wider w-1/3">備註欄</th>
                            <th className="p-3 text-base font-bold text-slate-600 uppercase tracking-wider w-1/3">說明</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayList.length === 0 ? (
                            <tr><td colSpan={3} className="text-center py-10 text-slate-400 text-lg">無符合資料</td></tr>
                        ) : (
                            displayList.map((item, idx) => {
                                return (
                                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors`}>
                                        <td className="p-3 text-lg font-bold text-blue-800 align-top">{item.buyer}</td>
                                        <td className="p-3 align-top"><span className={`px-3 py-1 rounded-lg text-lg font-bold border whitespace-nowrap block text-center bg-yellow-50 text-yellow-800 border-yellow-200 shadow-sm`}>{item.remarks}</span></td>
                                        <td className="p-3 text-lg text-slate-700 font-bold align-top">{item.note || '-'}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };
  
  const renderIncomeAnalysisModal = () => {
    const batchStats = orderGroups.map(group => {
        const itemsInBatch = orderItems.filter(i => i.orderGroupId === group.id);
        const settings = allIncomeSettings[group.id] || DEFAULT_INCOME_DATA;
        const packaging = settings.packagingRevenue || 0;
        const cardCharge = settings.cardCharge || 0;
        const cardFee = settings.cardFee || 0;
        const intlShip = settings.intlShipping || 0;
        const status = settings.status || 'processing'; 

        let totalItemSales = 0;
        itemsInBatch.forEach(item => {
            const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
            if (product) totalItemSales += product.inputPrice * item.quantity;
        });
        
        const batchIncome = totalItemSales + packaging;
        const batchExpense = cardCharge + cardFee + intlShip;
        const batchProfit = batchIncome - batchExpense;

        return { id: group.id, income: batchIncome, expense: batchExpense, profit: batchProfit, status };
    }).sort((a, b) => b.id.localeCompare(a.id));

    const totalIncome = batchStats.reduce((acc, cur) => acc + cur.income, 0);
    const totalExpense = batchStats.reduce((acc, cur) => acc + cur.expense, 0);
    const totalProfit = batchStats.reduce((acc, cur) => acc + cur.profit, 0);

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'processing': return 'bg-emerald-500 shadow-emerald-200'; // Green - 進行
            case 'closed': return 'bg-yellow-400 shadow-yellow-200'; // Yellow - 結案
            default: return 'bg-rose-500 shadow-rose-200'; // Red - 預購
        }
    };

    const subTableStyle = "text-sm font-light text-slate-600";

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-200">
            <div className="px-4 py-3 border-b border-blue-900 bg-blue-950 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold text-white">收支分析表</h3>
                <button onClick={() => setShowIncomeAnalysisModal(false)} className="text-blue-300 hover:text-white"><X size={28} /></button>
            </div>
            
            {/* Summary Box (Top - 16px Bold) */}
            <div className="bg-white p-4 shadow-sm border-b border-slate-200 shrink-0">
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-col items-center">
                        <div className="text-blue-600 text-xs font-bold mb-0.5">收入總計</div>
                        <div className="text-base font-bold font-mono text-blue-900">{formatCurrency(totalIncome)}</div>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex flex-col items-center">
                        <div className="text-rose-600 text-xs font-bold mb-0.5">支出總計</div>
                        <div className="text-base font-bold font-mono text-rose-900">{formatCurrency(totalExpense)}</div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex flex-col items-center">
                        <div className="text-emerald-600 text-xs font-bold mb-0.5">利潤</div>
                        <div className="text-base font-bold font-mono text-emerald-700">{formatCurrency(totalProfit)}</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 sticky top-0 shadow-sm z-10 border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-sm font-bold text-slate-500 w-16 text-center">狀態</th>
                            <th className="p-3 text-sm font-bold text-slate-500">批次</th>
                            <th className="p-3 text-right text-sm font-bold text-blue-600">收入</th>
                            <th className="p-3 text-right text-sm font-bold text-rose-600">支出</th>
                            <th className="p-3 text-right text-sm font-bold text-emerald-600">利潤</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {batchStats.map((batch) => (
                            <tr key={batch.id} className="hover:bg-slate-50">
                                <td className="p-3 text-center">
                                    <div 
                                        className={`w-5 h-5 rounded-full mx-auto shadow-md border-2 border-white ${getStatusColor(batch.status)}`}
                                    />
                                </td>
                                <td className={`p-3 font-mono ${subTableStyle}`}>{batch.id}</td>
                                <td className={`p-3 text-right font-mono ${subTableStyle}`}>{formatCurrency(batch.income)}</td>
                                <td className={`p-3 text-right font-mono ${subTableStyle}`}>{formatCurrency(batch.expense)}</td>
                                <td className={`p-3 text-right font-mono ${subTableStyle} ${batch.profit < 0 ? 'text-rose-500' : ''}`}>{formatCurrency(batch.profit)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  const Header = ({ title, actions, showOrderSelector = false }: any) => (
      <div className="bg-blue-900 shadow-lg border-b border-blue-800 shrink-0 z-10 flex flex-col relative pb-2">
         <div className="flex justify-between items-center px-3 pt-3 pb-1">
             <div className="flex flex-col justify-center">
                 <h2 className="text-xl font-bold text-white tracking-wide drop-shadow-sm leading-tight">{title}</h2>
                 <span className="text-blue-300 text-xs font-bold tracking-widest opacity-80 scale-90 origin-left">LONG CHEN</span>
             </div>
             <div className="flex gap-1.5 items-center">
                 {actions}
             </div>
         </div>
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

  // Single Page Order Entry Modal
  const OrderEntryModal = () => {
    const [localItem, setLocalItem] = useState<Partial<OrderItem>>(editingOrderItem || { quantity: 1, date: new Date().toISOString().split('T')[0], description: '', buyer: '', remarks: '', note: '', productGroupId: '', productItemId: '' });
    const currentGroupItems = productItems.filter(i => i.groupId === localItem.productGroupId);
    
    useEffect(() => {
        if (localItem.productGroupId && localItem.productItemId && !editingOrderItem) {
            const p = productItems.find(i => i.groupId === localItem.productGroupId && i.id === localItem.productItemId);
            if (p) setLocalItem(prev => ({ ...prev, description: p.name }));
        }
    }, [localItem.productGroupId, localItem.productItemId]);

    const inputClass = "block w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 h-10 text-lg font-bold focus:border-blue-500 focus:ring-blue-500";
    const labelClass = "block text-sm font-bold text-slate-600 mb-0.5";

    return (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in fade-in duration-200">
            <div className="px-5 py-4 border-b border-blue-900 bg-blue-950 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-white text-xl">{editingOrderItem ? '修改訂單' : '新增訂單'}</h3>
                <button onClick={() => setIsOrderEntryOpen(false)} className="text-blue-200 hover:text-white"><X size={28} /></button>
            </div>
            <div className="flex-1 p-5 flex flex-col gap-3 overflow-hidden">
                <div><label className={labelClass}>商品類別</label><select className={inputClass} value={localItem.productGroupId || ''} onChange={e => setLocalItem({...localItem, productGroupId: e.target.value, productItemId: ''})}><option value="">選擇類別</option>{productGroups.map(g => <option key={g.id} value={g.id}>{g.id} {g.name}</option>)}</select></div>
                <div><label className={labelClass}>商品名稱</label><select className={inputClass} value={localItem.productItemId || ''} onChange={e => setLocalItem({...localItem, productItemId: e.target.value})} disabled={!localItem.productGroupId}><option value="">選擇商品</option>{currentGroupItems.map(i => <option key={i.id} value={i.id}>{i.id} {i.name}</option>)}</select></div>
                <div><label className={labelClass}>商品描述</label><input type="text" className={inputClass} value={localItem.description} onChange={e => setLocalItem({...localItem, description: e.target.value})} placeholder="規格/款式" /></div>
                <div><label className={labelClass}>訂購者</label><input type="text" className={inputClass} value={localItem.buyer} onChange={e => setLocalItem({...localItem, buyer: e.target.value})} placeholder="買家名稱" /></div>
                <div className="flex gap-4"><div className="flex-1"><label className={labelClass}>數量</label><input type="number" className={`${inputClass} text-center`} value={localItem.quantity} onChange={e => setLocalItem({...localItem, quantity: parseInt(e.target.value) || 0})} /></div><div className="flex-1"><label className={labelClass}>日期</label><input type="date" className={inputClass} value={localItem.date} onChange={e => setLocalItem({...localItem, date: e.target.value})} /></div></div>
                <div><label className={labelClass}>備註</label><input type="text" className={inputClass} value={localItem.remarks} onChange={e => setLocalItem({...localItem, remarks: e.target.value})} placeholder="匯款/自留..." /></div>
                <div><label className={labelClass}>說明</label><input type="text" className={inputClass} value={localItem.note} onChange={e => setLocalItem({...localItem, note: e.target.value})} placeholder="其他說明" /></div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-white flex gap-3 shrink-0">
                {editingOrderItem && <ActionButton icon={Trash2} label="刪除" onClick={() => handleDeleteOrderItem(null as any, editingOrderItem.id)} variant="danger" />}
                <ActionButton icon={X} label="取消" onClick={() => setIsOrderEntryOpen(false)} variant="outline" className="flex-1" />
                <ActionButton icon={Save} label="儲存" onClick={() => handleSaveOrderItem({ ...localItem, orderGroupId: selectedOrderGroup! } as OrderItem)} disabled={!localItem.productItemId || !localItem.buyer} className="flex-1" />
            </div>
        </div>
    )
  }

  const renderIncomeView = () => {
    const { totalJpy, totalDomestic, totalHandling, totalSales, avgRateCost, netProfit, profitRate, cardFeeRate } = incomeStats;
    const currentStatus = incomeData.status || 'processing';

    const statusOptions = [
        { value: 'processing', label: '進行', color: 'text-emerald-600', activeBg: 'bg-emerald-50 border-emerald-300' },
        { value: 'preorder', label: '預購', color: 'text-rose-600', activeBg: 'bg-rose-50 border-rose-300' },
        { value: 'closed', label: '結案', color: 'text-yellow-700', activeBg: 'bg-yellow-50 border-yellow-300' },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
             <Header title="收支計算" showOrderSelector={true} actions={
                <>
                  <ActionButton icon={PieChart} label="分析" onClick={() => setShowIncomeAnalysisModal(true)} variant="warning" />
                  <ActionButton icon={Save} label="儲存" onClick={handleManualSaveIncome} />
                  <ActionButton icon={Download} label="匯出" onClick={handleExportIncome} variant="success" />
                </>
             }/>
             <div className="flex-1 p-2 flex flex-col gap-2 overflow-hidden justify-start">
                
                {/* Status Selector - Custom Radio Look */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-1 shrink-0">
                    <span className="text-[12px] font-light text-slate-500 ml-1">狀態</span>
                    <div className="flex gap-2">
                        {statusOptions.map(opt => (
                            <button 
                                key={opt.value}
                                onClick={() => setIncomeData({...incomeData, status: opt.value})}
                                className={`flex-1 h-10 rounded-lg border flex items-center justify-center gap-2 transition-all
                                    ${currentStatus === opt.value ? `${opt.activeBg} border-2 shadow-sm` : 'bg-slate-50 border-slate-200 hover:bg-white'}
                                `}
                            >
                                {/* Radio Circle */}
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${currentStatus === opt.value ? opt.color.replace('text', 'border') : 'border-slate-300'}`}>
                                    {currentStatus === opt.value && <div className={`w-2 h-2 rounded-full ${opt.color.replace('text', 'bg')}`} />}
                                </div>
                                {/* Text 16px Bold */}
                                <span className={`text-base font-bold ${currentStatus === opt.value ? opt.color : 'text-slate-400'}`}>
                                    {opt.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-2 shrink-0">
                    <div className="grid grid-cols-3 gap-2"><IncomeField label="日幣總計" value={formatCurrency(totalJpy)} /><IncomeField label="境內運總計" value={formatCurrency(totalDomestic)} /><IncomeField label="手續費總計" value={formatCurrency(totalHandling)} /></div>
                    <div className="grid grid-cols-2 gap-2"><IncomeField label="商品收入" value={formatCurrency(totalSales)} colorClass="text-blue-600" /><IncomeField label="包材收入 (輸入)" value={incomeData.packagingRevenue} isInput onChange={(e:any) => setIncomeData({...incomeData, packagingRevenue: e.target.value})} colorClass="text-blue-600" /></div>
                    <div className="grid grid-cols-3 gap-2"><IncomeField label="刷卡費 (成本)" value={incomeData.cardCharge} isInput onChange={(e:any) => setIncomeData({...incomeData, cardCharge: e.target.value})} /><IncomeField label="刷卡手續費" value={incomeData.cardFee} isInput onChange={(e:any) => setIncomeData({...incomeData, cardFee: e.target.value})} /><IncomeField label="國際運費" value={incomeData.intlShipping} isInput onChange={(e:any) => setIncomeData({...incomeData, intlShipping: e.target.value})} /></div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-2 shrink-0">
                    <div className="grid grid-cols-2 gap-2"><IncomeField label="平均匯率" value={avgRateCost.toFixed(3)} colorClass="text-purple-600" /><IncomeField label="手續費佔比" value={`${cardFeeRate.toFixed(2)}%`} colorClass="text-purple-600" /></div>
                    <div className="grid grid-cols-2 gap-2"><IncomeField label="總利潤" value={formatCurrency(netProfit)} colorClass="text-emerald-600" /><IncomeField label="利潤率 ROI" value={`${profitRate.toFixed(2)}%`} colorClass="text-emerald-600" /></div>
                    <div className="grid grid-cols-2 gap-2"><IncomeField label="爸爸 (20%)" value={formatCurrency(Math.round(netProfit * 0.2))} colorClass="text-indigo-600" /><IncomeField label="妹妹 (80%)" value={formatCurrency(Math.round(netProfit * 0.8))} colorClass="text-rose-500" /></div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-center shrink-0">
                    <div className="grid grid-cols-12 gap-2"><div className="col-span-4"><IncomeField label="爸爸應收" value={incomeData.dadReceivable} isInput onChange={(e:any) => setIncomeData({...incomeData, dadReceivable: e.target.value})} /></div><div className="col-span-8"><IncomeField label="收款說明" value={incomeData.paymentNote || ''} isInput onChange={(e:any) => setIncomeData({...incomeData, paymentNote: e.target.value})} /></div></div>
                </div>
             </div>
             {showIncomeAnalysisModal && renderIncomeAnalysisModal()}
        </div>
    );
  };

  const NavButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => setView(id)} 
        className={`flex-1 flex flex-col items-center justify-center h-full transition-all duration-200 ${view === id ? 'text-yellow-400 bg-blue-900/50' : 'text-blue-200 hover:text-white'}`}
      >
        <Icon size={24} strokeWidth={view === id ? 2.5 : 2} className={view === id ? 'drop-shadow-sm' : ''} />
        <span className="text-sm font-bold mt-1 tracking-wide">{label}</span>
      </button>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
            {view === 'products' && (
                <div className="flex flex-col h-full">
                    <Header title="產品管理" actions={<><ActionButton icon={Grid} label="新增" onClick={() => setShowNewGroupInput(!showNewGroupInput)} /><ActionButton icon={Download} label="匯出" onClick={handleExportProducts} variant="success" /></>} />
                    {showNewGroupInput && <div className="p-3 bg-blue-800 flex gap-2"><input autoFocus type="text" className="flex-1 p-2 px-3 text-lg rounded-lg" value={newGroupInput} onChange={e => setNewGroupInput(e.target.value)} placeholder="類別名稱" /><ActionButton icon={Check} label="確定" onClick={handleAddGroup} variant="success" /></div>}
                    <div className="flex-1 overflow-y-auto p-2 pb-24 space-y-2">
                        {filteredProducts.map(({ group, items }) => (
                            <div key={group.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}>
                                    <div className="flex items-center gap-3"><span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded text-base">{group.id}</span>
                                    {renamingId?.type === 'group' && renamingId.groupId === group.id ? 
                                        <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={handleSaveRename} onClick={e => e.stopPropagation()} className="font-bold text-xl border-b border-blue-500 w-40"/> : 
                                        <span className="font-bold text-xl" onClick={(e) => { e.stopPropagation(); handleStartRename('group', group.id, undefined, group.name); }}>{group.name}</span>}
                                    <span className="text-sm text-slate-400 font-bold">({items.length})</span></div>
                                    {expandedGroup === group.id ? <ChevronDown size={24} className="text-blue-500"/> : <ChevronRight size={24} className="text-slate-400"/>}
                                </div>
                                {expandedGroup === group.id && <div className="p-2 bg-slate-50 border-t border-slate-100 space-y-2">
                                    <div className="flex justify-between gap-2"><ActionButton icon={Trash2} label="刪除" onClick={(e:any) => handleDeleteGroup(e, group.id)} variant="danger" className="flex-1" /><ActionButton icon={Plus} label="新增" onClick={() => setEditingProduct({ group, nextId: getNextItemId(items.map(i => i.id)) })} variant="success" className="flex-1" /></div>
                                    {items.map(item => {
                                        const stats = calculateProductStats(item);
                                        return (
                                            <div key={item.id} className="bg-white border rounded-lg p-2 text-base shadow-sm relative">
                                                <div className="flex justify-between mb-2"><div className="flex-1 mr-2"><span className="font-mono bg-slate-100 px-1.5 rounded text-sm mr-2 font-bold">{item.id}</span>
                                                {renamingId?.type === 'item' && renamingId.itemId === item.id ? <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={handleSaveRename} className="font-bold border-b border-blue-500 w-full text-lg"/> : <span className="font-bold text-lg" onClick={(e) => { e.stopPropagation(); handleStartRename('item', group.id, item.id, item.name); }}>{cleanProductName(item.name)}</span>}
                                                </div><div className="flex gap-4"><Edit size={20} className="text-blue-500 cursor-pointer" onClick={() => setEditingProduct({ group, item, nextId: item.id })} /><Trash2 size={20} className="text-rose-500 cursor-pointer" onClick={(e) => handleDeleteProduct(e, group.id, item.id)} /></div></div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg font-medium">
                                                    <div className="flex justify-between"><span>日幣:</span> <span className="font-bold text-base">¥{item.jpyPrice}</span></div>
                                                    <div className="flex justify-between text-emerald-600 font-bold"><span>利潤:</span> <span className="text-base">{formatCurrency(stats.profit)}</span></div>
                                                    <div className="flex justify-between"><span>成本+運:</span> <span className="text-base">{formatCurrency(stats.costPlusShip)}</span></div>
                                                    <div className="flex justify-between text-rose-500 font-bold"><span>售價+運:</span> <span className="text-base">{formatCurrency(stats.pricePlusShip)}</span></div>
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
                    {activeOrderGroup && (
                        <div className="shrink-0 px-2 pt-2 bg-slate-100 z-10">
                            <div className="bg-white rounded-lg shadow-sm p-3 flex justify-between items-center border-l-4 border-blue-600">
                                <div><div className="text-sm text-slate-400 font-bold">批次</div><div className="text-xl font-mono font-bold text-slate-800">{activeOrderGroup.id}</div></div>
                                <div className="flex gap-2"><ActionButton icon={Trash2} label="刪除" onClick={(e:any) => handleDeleteOrderGroup(e, activeOrderGroup.id)} variant="danger" /><ActionButton icon={Plus} label="新增" onClick={() => { setIsOrderEntryOpen(true); setEditingOrderItem(null); }} variant="success" /></div>
                            </div>
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto px-2 pt-2 pb-24 space-y-2">
                        {activeOrderItems.length === 0 ? <div className="text-center py-10 text-slate-400">無訂單資料</div> : activeOrderItems.map(item => {
                            const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
                            const group = productGroups.find(g => g.id === item.productGroupId);
                            const total = (product?.inputPrice || 0) * item.quantity;
                            return (
                                <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 text-base relative">
                                    <div className="flex justify-between items-center mb-1"><span className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{group?.name}</span><div className="flex gap-4"><Edit size={20} className="text-blue-500" onClick={() => { setEditingOrderItem(item); setIsOrderEntryOpen(true); }} /><Trash2 size={20} className="text-rose-500" onClick={(e) => handleDeleteOrderItem(e, item.id)} /></div></div>
                                    <div className="flex justify-between items-start mb-1"><div className="font-bold text-slate-800 text-lg leading-tight pr-2">{cleanProductName(product?.name || '')} {item.description && <span className="text-slate-500 font-normal"> : {item.description}</span>}</div><div className="text-sm text-slate-400 font-mono whitespace-nowrap pt-1">{item.date}</div></div>
                                    <div className="bg-slate-50 p-2 rounded flex justify-between items-center"><div className="font-bold text-blue-700 flex items-center gap-2 text-lg"><User size={18}/> {item.buyer}</div><div className="flex items-center gap-3"><span className="font-bold text-slate-600 bg-white px-2 rounded shadow-sm text-lg">x{item.quantity}</span><span className="font-mono font-bold text-emerald-600 text-xl">{formatCurrency(total)}</span></div></div>
                                    {item.remarks && <div className="mt-2 text-amber-600 text-sm border-t border-slate-100 pt-2 font-bold">備註: {item.remarks}</div>}
                                </div>
                            )
                        })}
                    </div>
                    {showNewOrderModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-lg w-full max-w-sm"><h3 className="font-bold mb-4 text-xl">建立批次</h3><div className="flex gap-2 mb-4"><select className="border p-3 rounded-lg flex-1 text-lg" value={newOrderDate.year} onChange={e => setNewOrderDate({...newOrderDate, year: +e.target.value})}><option value="2025">2025</option><option value="2026">2026</option></select><select className="border p-3 rounded-lg flex-1 text-lg" value={newOrderDate.month} onChange={e => setNewOrderDate({...newOrderDate, month: +e.target.value})}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}月</option>)}</select></div><div className="flex justify-end gap-3"><ActionButton icon={X} label="取消" onClick={()=>setShowNewOrderModal(false)} variant="outline" /><ActionButton icon={Check} label="建立" onClick={handleCreateOrderGroup} /></div></div></div>}
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
                    <Header title="分析資料" showOrderSelector={true} actions={<><ActionButton icon={ArrowDownCircle} label="支出" onClick={() => setAnalysisMode('expenditure')} active={analysisMode === 'expenditure'} /><ActionButton icon={ArrowUpCircle} label="收入" onClick={() => setAnalysisMode('income')} active={analysisMode === 'income'} /><ActionButton icon={Download} label="匯出" onClick={handleExportAnalysis} variant="success" /></>}/>
                    {renderAnalysisView()}
                </div>
            )}
            {view === 'deposits' && (
                <div className="flex flex-col h-full">
                    <Header title="預收款項" showOrderSelector={true} actions={<><ActionButton icon={Download} label="匯出" onClick={handleExportDeposits} variant="success" /></>} />
                    {renderDepositsView()}
                </div>
            )}
            {view === 'income' && renderIncomeView()}
        </div>

        <div className="bg-blue-900 border-t border-blue-800 flex justify-around items-center pb-safe shadow-2xl shrink-0 z-50 text-white h-20">
            <NavButton id="products" label="產品" icon={Package} />
            <NavButton id="orders" label="訂單" icon={ShoppingCart} />
            <NavButton id="details" label="明細" icon={List} />
            <NavButton id="analysis" label="分析" icon={BarChart2} />
            <NavButton id="deposits" label="預收" icon={Wallet} />
            <NavButton id="income" label="收支" icon={Calculator} />
        </div>
    </div>
  );
};

export default App;
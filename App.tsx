import React, { useState, useMemo, useEffect } from 'react';
import { ProductGroup, ProductItem, OrderGroup, OrderItem, ViewState } from './types';
import { INITIAL_PRODUCT_GROUPS, INITIAL_PRODUCT_ITEMS, INITIAL_ORDER_GROUPS, INITIAL_ORDER_ITEMS } from './constants';
import { getNextGroupId, getNextItemId, getNextOrderGroupId, calculateProductStats, formatCurrency, generateUUID, cleanProductName } from './utils';
import ProductForm from './components/ProductForm';
import { Trash2, Edit, Plus, Package, ShoppingCart, List, BarChart2, ChevronRight, ChevronDown, User, Box, X, Calculator, Download, Save, Wallet, ArrowUpCircle, ArrowDownCircle, Grid, PieChart } from 'lucide-react';
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
    paymentNote: ''
};

// --- UI Components ---

// 1. Standard Action Button (Compact for 3 buttons in a row)
const ActionButton = ({ icon: Icon, label, onClick, active = false, variant = 'primary' }: any) => {
    let bgClass = "bg-blue-700 hover:bg-blue-600 border-blue-600"; // Primary
    if (variant === 'success') bgClass = "bg-emerald-600 hover:bg-emerald-500 border-emerald-500";
    if (variant === 'danger') bgClass = "bg-rose-600 hover:bg-rose-500 border-rose-500";
    if (variant === 'warning') bgClass = "bg-amber-600 hover:bg-amber-500 border-amber-500"; // Added warning variant
    if (active) bgClass = "bg-yellow-500 text-blue-900 border-yellow-400 font-bold hover:bg-yellow-400";
    
    return (
        <button 
            onClick={onClick}
            className={`
                h-9 px-3 min-w-[80px] rounded-lg border shadow-sm transition-all active:scale-95
                flex items-center justify-center gap-1.5
                text-sm font-bold tracking-wide text-white
                ${bgClass}
            `}
        >
            <Icon size={16} strokeWidth={2.5} />
            <span>{label}</span>
        </button>
    );
};

// 2. Order Batch Selector Button
const OrderBatchButton = ({ id, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`
            h-8 min-w-[85px] px-2 rounded-lg border font-mono font-bold text-sm tracking-tight transition-all
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
  
  // State for Income Analysis Modal
  const [showIncomeAnalysisModal, setShowIncomeAnalysisModal] = useState(false);

  // View Specific States
  const [detailSortMode, setDetailSortMode] = useState<'buyer' | 'product'>('buyer');
  
  // Updated: Analysis mode tracks 'expenditure' or 'income'
  const [analysisMode, setAnalysisMode] = useState<'expenditure' | 'income'>('income');
  
  // Current Batch Manual Data
  const [incomeData, setIncomeData] = useState(DEFAULT_INCOME_DATA);
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
    
    // Manual inputs from global state for the active group
    const currentSettings = selectedOrderGroup ? (allIncomeSettings[selectedOrderGroup] || DEFAULT_INCOME_DATA) : DEFAULT_INCOME_DATA;
    
    const packaging = currentSettings.packagingRevenue || 0;
    const cardCharge = currentSettings.cardCharge || 0;
    const cardFeeInput = currentSettings.cardFee || 0;
    const actualIntlShip = currentSettings.intlShipping || 0; // Manual override/addition
    
    // Logic updated to match user request:
    // Revenue = Sales + Packaging
    const totalRevenue = totalSales + packaging;
    
    // Expense = Card Charge (Cost) + Card Fee + Intl Ship
    // Note: User formula says "支出總計" = "刷卡費"+"刷卡手續費"+"國際運費"
    const totalExpenses = cardCharge + cardFeeInput + actualIntlShip;
    
    const netProfit = totalRevenue - totalExpenses;
    const profitRate = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const cardFeeRate = cardCharge > 0 ? (cardFeeInput / cardCharge) * 100 : 0;
    
    return {
        totalJpy, totalDomestic, totalHandling, totalSales, totalBaseCost,
        avgRateCost, packaging, cardFeeInput, actualIntlShip, cardCharge,
        totalRevenue, totalExpenses, netProfit, profitRate, cardFeeRate
    };
  }, [activeOrderItems, productItems, allIncomeSettings, selectedOrderGroup]);

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
    // Update local state is handled by input, but we save to Firestore here
    await setDoc(doc(db, 'incomeSettings', selectedOrderGroup), incomeData);
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

  // Updated Export Analysis Logic to respect modes
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

    return (
        <div className="flex-1 overflow-y-auto p-2 pb-24 space-y-2">
            {groupedData.map((g, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200">
                    <div className="bg-slate-50 p-2 flex justify-between items-center border-b border-slate-100">
                        <div className="font-bold text-blue-800 text-xl">{g.label || '(未以此分類)'}</div>
                        <div className="text-sm text-slate-500 font-mono flex items-center gap-3">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{g.totalQty} 件</span>
                            <span className="text-emerald-600 font-bold text-xl">{formatCurrency(g.totalPrice)}</span>
                        </div>
                    </div>
                    <div>
                        {detailSortMode === 'buyer' ? (
                            (() => {
                                const subGroups = new Map<string, { id: string, name: string, total: number, items: any[] }>();
                                g.items.forEach(item => {
                                    const gid = item.productGroupId;
                                    if (!subGroups.has(gid)) {
                                        const groupName = productGroups.find(p => p.id === gid)?.name || '';
                                        subGroups.set(gid, { id: gid, name: groupName, total: 0, items: [] });
                                    }
                                    const sub = subGroups.get(gid)!; sub.items.push(item); sub.total += item.total;
                                });
                                return Array.from(subGroups.values()).sort((a, b) => a.id.localeCompare(b.id)).map((sub, subIdx) => (
                                    <div key={subIdx} className="border-b border-slate-100 last:border-0">
                                        <div className="bg-slate-50/50 p-2 flex justify-between items-center"><div className="font-bold text-slate-800 text-lg pl-1.5 border-l-4 border-blue-400">{sub.name}</div><div className="font-mono font-bold text-emerald-600 text-lg">{formatCurrency(sub.total)}</div></div>
                                        {sub.items.sort((x:any, y:any) => x.productItemId.localeCompare(y.productItemId)).map((item, itemIdx) => {
                                            const product = item.product; const productName = cleanProductName(product?.name || ''); const desc = item.description || ''; const row2Main = desc ? `${productName} : ${desc}` : productName;
                                            return (
                                                <div key={itemIdx} className="p-2 pl-4 flex justify-between items-center text-sm border-t border-slate-50 first:border-t-0">
                                                    <div className="flex-1 truncate pr-2 text-slate-700 font-medium text-lg">{row2Main}</div>
                                                    <div className="flex items-center gap-2 font-mono shrink-0 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm"><span className="text-slate-400 scale-90">x</span><span className="font-bold text-slate-800 text-base">{item.quantity}</span><div className="w-px h-4 bg-slate-300 mx-1"></div><span className="text-slate-600 font-bold">${item.product.inputPrice}</span></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ));
                            })()
                        ) : (
                            (() => {
                                const subGroups = new Map<string, { productItemId: string, productName: string, description: string, total: number, unitPrice: number, items: any[] }>();
                                g.items.forEach(item => {
                                    const product = item.product; const productName = cleanProductName(product?.name || ''); const description = item.description || ''; const uniqueKey = `${item.productItemId}_${description}`;
                                    if (!subGroups.has(uniqueKey)) subGroups.set(uniqueKey, { productItemId: item.productItemId, productName, description, total: 0, unitPrice: product.inputPrice, items: [] });
                                    const sub = subGroups.get(uniqueKey)!; sub.items.push(item); sub.total += item.total;
                                });
                                const sortedSubGroups = Array.from(subGroups.values()).sort((a, b) => { const idDiff = a.productItemId.localeCompare(b.productItemId); if (idDiff !== 0) return idDiff; return a.description.localeCompare(b.description, 'zh-TW'); });
                                return sortedSubGroups.map((sub, subIdx) => {
                                    const row1Main = sub.description ? `${sub.productName} : ${sub.description}` : sub.productName;
                                    return (
                                        <div key={subIdx} className="border-b border-slate-100 last:border-0">
                                            <div className="bg-slate-50/50 p-2 flex justify-between items-center"><div className="font-bold text-slate-800 text-lg pl-1.5 border-l-4 border-emerald-400 truncate pr-2">{row1Main}</div><div className="font-mono font-bold text-emerald-600 text-lg shrink-0">{formatCurrency(sub.total)}</div></div>
                                            {sub.items.map((item, itemIdx) => (
                                                <div key={itemIdx} className="p-2 pl-4 flex justify-between items-center text-sm border-t border-slate-50 first:border-t-0"><div className="flex-1 truncate pr-2 text-slate-700 font-medium text-lg">{item.buyer}</div><div className="flex items-center gap-2 font-mono shrink-0 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm"><div className="flex items-center gap-1"><span className="text-slate-400 scale-90 text-xs">數量</span><span className="font-bold text-slate-800 text-base">{item.quantity}</span></div><div className="w-px h-4 bg-slate-300 mx-1"></div><div className="flex items-center gap-1"><span className="text-slate-400 scale-90 text-xs">單價</span><span className="font-bold text-slate-600 text-base">{sub.unitPrice}</span></div></div></div>
                                            ))}
                                        </div>
                                    );
                                });
                            })()
                        )}
                    </div>
                </div>
            ))}
            {groupedData.length === 0 && <div className="text-center py-10 text-slate-400">無資料</div>}
        </div>
    );
  };

  // Completely Revised Analysis View - Table Format with Larger Fonts
  const renderAnalysisView = () => {
    // 1. Aggregate Data
    const groupMap = new Map<string, Map<string, {
        item: ProductItem,
        qty: number,
        jpyTotal: number,
        domesticTotal: number,
        twdTotal: number
    }>>();

    let totalQty = 0;
    let grandTotalJPY = 0;
    let grandTotalDomestic = 0;
    let grandTotalTWD = 0;

    activeOrderItems.forEach(orderItem => {
        const { productGroupId, productItemId, quantity } = orderItem;
        const product = productItems.find(p => p.groupId === productGroupId && p.id === productItemId);
        if (!product) return;

        if (!groupMap.has(productGroupId)) {
            groupMap.set(productGroupId, new Map());
        }
        const itemMap = groupMap.get(productGroupId)!;

        if (!itemMap.has(productItemId)) {
            itemMap.set(productItemId, {
                item: product,
                qty: 0,
                jpyTotal: 0,
                domesticTotal: 0,
                twdTotal: 0
            });
        }

        const stats = itemMap.get(productItemId)!;
        stats.qty += quantity;
        const lineJpy = product.jpyPrice * quantity;
        const lineDom = product.domesticShip * quantity;
        const lineTwd = product.inputPrice * quantity;

        stats.jpyTotal += lineJpy;
        stats.domesticTotal += lineDom;
        stats.twdTotal += lineTwd;

        totalQty += quantity;
        grandTotalJPY += lineJpy;
        grandTotalDomestic += lineDom;
        grandTotalTWD += lineTwd;
    });

    const sortedGroupIds = Array.from(groupMap.keys()).sort();

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-base font-bold text-slate-600 uppercase tracking-wider">商品名稱</th>
                            <th className="p-3 text-right text-base font-bold text-slate-600 uppercase tracking-wider w-16">數量</th>
                            {analysisMode === 'expenditure' ? (
                                <>
                                    <th className="p-3 text-right text-base font-bold text-amber-600 uppercase tracking-wider">日幣總價</th>
                                    <th className="p-3 text-right text-base font-bold text-orange-600 uppercase tracking-wider">境內運</th>
                                </>
                            ) : (
                                <th className="p-3 text-right text-base font-bold text-emerald-600 uppercase tracking-wider">台幣總價</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedGroupIds.map(gid => {
                            const groupName = productGroups.find(g => g.id === gid)?.name || gid;
                            const itemMap = groupMap.get(gid)!;
                            const sortedItemIds = Array.from(itemMap.keys()).sort();
                            
                            return (
                                <React.Fragment key={gid}>
                                    {/* Group Header Row */}
                                    <tr className="bg-slate-100/80">
                                        <td colSpan={analysisMode === 'expenditure' ? 4 : 3} className="px-3 py-2">
                                            <span className="font-mono text-sm font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-2">{gid}</span>
                                            <span className="font-bold text-slate-700 text-base">{groupName}</span>
                                        </td>
                                    </tr>
                                    {/* Items */}
                                    {sortedItemIds.map(iid => {
                                        const stat = itemMap.get(iid)!;
                                        return (
                                            <tr key={`${gid}-${iid}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 text-lg font-bold text-slate-800 max-w-[180px]">
                                                    <div className="line-clamp-2 leading-tight">{cleanProductName(stat.item.name)}</div>
                                                </td>
                                                <td className="p-3 text-right text-lg font-bold text-slate-900 font-mono">
                                                    {stat.qty}
                                                </td>
                                                {analysisMode === 'expenditure' ? (
                                                    <>
                                                        <td className="p-3 text-right text-lg font-bold text-amber-700 font-mono">
                                                            ¥{stat.jpyTotal}
                                                        </td>
                                                        <td className="p-3 text-right text-lg font-bold text-orange-700 font-mono">
                                                            ¥{stat.domesticTotal}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td className="p-3 text-right text-xl font-bold text-emerald-600 font-mono">
                                                        {formatCurrency(stat.twdTotal)}
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </React.Fragment>
                            )
                        })}
                        {sortedGroupIds.length === 0 && (
                             <tr><td colSpan={5} className="text-center py-10 text-slate-400">無資料</td></tr>
                        )}
                    </tbody>
                    {/* Light Blue Footer */}
                    <tfoot className="bg-blue-100 text-blue-900 sticky bottom-0 z-10 shadow-lg border-t-2 border-blue-200">
                        <tr>
                            <td className="p-3 font-bold text-lg text-right">總計</td>
                            <td className="p-3 text-right font-bold font-mono text-xl">{totalQty}</td>
                            {analysisMode === 'expenditure' ? (
                                <>
                                    <td className="p-3 text-right font-bold font-mono text-xl text-blue-900">¥{grandTotalJPY}</td>
                                    <td className="p-3 text-right font-bold font-mono text-xl text-blue-900">¥{grandTotalDomestic}</td>
                                </>
                            ) : (
                                <td className="p-3 text-right font-bold font-mono text-2xl text-blue-900">{formatCurrency(grandTotalTWD)}</td>
                            )}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    )
  };

  // Completely Revised Deposits View - Filter by Product, Show only relevant info
  const renderDepositsView = () => {
    // 1. Get ALL items that have text in remarks
    const itemsWithRemarks = activeOrderItems.filter(i => i.remarks && i.remarks.trim().length > 0);
    
    // Sort logic
    const displayList = itemsWithRemarks.sort((a, b) => a.buyer.localeCompare(b.buyer, 'zh-TW'));

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
            {/* Removed Filter Buttons Section */}

            {/* Table: Buyer, Remark, Note */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-sm font-bold text-slate-600 uppercase tracking-wider w-1/3">訂購者</th>
                            <th className="p-3 text-sm font-bold text-slate-600 uppercase tracking-wider w-1/3">備註欄</th>
                            <th className="p-3 text-sm font-bold text-slate-600 uppercase tracking-wider w-1/3">說明</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayList.length === 0 ? (
                            <tr><td colSpan={3} className="text-center py-10 text-slate-400 text-lg">無符合資料</td></tr>
                        ) : (
                            displayList.map((item, idx) => {
                                return (
                                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors`}>
                                        <td className="p-3 text-lg font-bold text-blue-800 align-top">
                                            {item.buyer}
                                        </td>
                                        <td className="p-3 align-top">
                                            <span className={`px-3 py-1 rounded-lg text-lg font-bold border whitespace-nowrap block text-center bg-yellow-50 text-yellow-800 border-yellow-200 shadow-sm`}>
                                                {item.remarks}
                                            </span>
                                        </td>
                                        <td className="p-3 text-lg text-slate-700 font-bold align-top">
                                            {item.note || '-'}
                                        </td>
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
    // 1. Calculate stats per Order Group (Batch)
    const batchStats = orderGroups.map(group => {
        const itemsInBatch = orderItems.filter(i => i.orderGroupId === group.id);
        
        // Manual settings for this specific batch
        const settings = allIncomeSettings[group.id] || DEFAULT_INCOME_DATA;
        const packaging = settings.packagingRevenue || 0;
        const cardCharge = settings.cardCharge || 0;
        const cardFee = settings.cardFee || 0;
        const intlShip = settings.intlShipping || 0;

        let totalItemSales = 0;

        itemsInBatch.forEach(item => {
            const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
            if (product) {
                // "收入金額" = Input Price * Quantity
                totalItemSales += product.inputPrice * item.quantity;
            }
        });

        // "收入總計" = ("收入金額" + "包材收入")
        const batchIncome = totalItemSales + packaging;
        
        // “支出總計” ="刷卡費"+"刷卡手續費"+"國際運費"
        const batchExpense = cardCharge + cardFee + intlShip;
        
        // "利潤"=("收入金額""+"包材收入")-("刷卡費"+"刷卡手續費"+"國際運費" )
        const batchProfit = batchIncome - batchExpense;

        return {
            id: group.id,
            income: batchIncome,
            expense: batchExpense,
            profit: batchProfit,
            itemCount: itemsInBatch.length
        };
    }).sort((a, b) => b.id.localeCompare(a.id)); // Sort descending (newest first)

    // 2. Grand Totals
    const totalIncome = batchStats.reduce((acc, cur) => acc + cur.income, 0);
    const totalExpense = batchStats.reduce((acc, cur) => acc + cur.expense, 0);
    const totalProfit = batchStats.reduce((acc, cur) => acc + cur.profit, 0);

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-200">
            <div className="px-4 py-3 border-b border-blue-900 bg-blue-950 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold text-white">收支分析詳細表</h3>
                <button onClick={() => setShowIncomeAnalysisModal(false)} className="text-blue-300 hover:text-white"><X size={28} /></button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 flex flex-col">
                {/* Summary Section (Placed at Top) */}
                <div className="bg-white p-4 shadow-sm border-b border-slate-200 shrink-0">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <div className="text-blue-600 text-sm font-bold mb-1">收入總計</div>
                            <div className="text-2xl font-mono font-bold text-blue-800">{formatCurrency(totalIncome)}</div>
                        </div>
                        <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                            <div className="text-rose-600 text-sm font-bold mb-1">支出總計</div>
                            <div className="text-2xl font-mono font-bold text-rose-800">{formatCurrency(totalExpense)}</div>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                            <div className="text-emerald-600 text-sm font-bold mb-1">總利潤</div>
                            <div className="text-2xl font-mono font-bold text-emerald-700">{formatCurrency(totalProfit)}</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 sticky top-0 shadow-sm z-10 border-b border-slate-200">
                            <tr>
                                <th className="p-3 text-sm font-bold text-slate-600">訂單項</th>
                                <th className="p-3 text-right text-sm font-bold text-blue-600">收入總計</th>
                                <th className="p-3 text-right text-sm font-bold text-rose-600">支出總計</th>
                                <th className="p-3 text-right text-sm font-bold text-emerald-600">利潤</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {batchStats.map((batch) => (
                                <tr key={batch.id} className="hover:bg-slate-50">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-800 text-xl font-mono">{batch.id}</div>
                                        <div className="text-xs text-slate-400 font-bold mt-0.5">{batch.itemCount} 筆訂單</div>
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-blue-700 text-lg">{formatCurrency(batch.income)}</td>
                                    <td className="p-3 text-right font-mono font-bold text-rose-600 text-lg">{formatCurrency(batch.expense)}</td>
                                    <td className={`p-3 text-right font-mono font-bold text-lg ${batch.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(batch.profit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  // Restored Original Blue Header
  const Header = ({ title, actions, showOrderSelector = false }: any) => (
      <div className="bg-blue-900 shadow-lg border-b border-blue-800 shrink-0 z-10 flex flex-col relative pb-2">
         {/* Top Bar: Title & Actions */}
         <div className="flex justify-between items-center px-3 pt-3 pb-1">
             <div className="flex flex-col justify-center">
                 <h2 className="text-2xl font-bold text-white tracking-wide drop-shadow-sm leading-tight">{title}</h2>
                 <span className="text-blue-300 text-xs font-bold tracking-widest opacity-80 scale-90 origin-left">LONG CHEN</span>
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

    // Unified Font Styles
    // Input: text-lg
    // Label: text-sm
    const inputClass = "block w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 h-10 text-lg font-bold focus:border-blue-500 focus:ring-blue-500";
    const labelClass = "block text-sm font-bold text-slate-600 mb-0.5";

    return (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in fade-in duration-200">
            <div className="px-5 py-4 border-b border-blue-900 bg-blue-950 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-white text-xl">
                    {editingOrderItem ? '修改訂單' : '新增訂單'}
                </h3>
                <button onClick={() => setIsOrderEntryOpen(false)} className="text-blue-200 hover:text-white"><X size={28} /></button>
            </div>
            
            {/* Body - Optimized Spacing - No Scroll - Flex Distribution */}
            {/* Removed justify-between, using gap-3 for compact layout */}
            <div className="flex-1 p-5 flex flex-col gap-3 overflow-hidden">
                
                {/* 1. Category */}
                <div>
                    <label className={labelClass}>商品類別</label>
                    <select className={inputClass} value={localItem.productGroupId || ''} onChange={e => setLocalItem({...localItem, productGroupId: e.target.value, productItemId: ''})}><option value="">選擇類別</option>{productGroups.map(g => <option key={g.id} value={g.id}>{g.id} {g.name}</option>)}</select>
                </div>
                
                {/* 2. Product Name */}
                <div>
                    <label className={labelClass}>商品名稱</label>
                    <select className={inputClass} value={localItem.productItemId || ''} onChange={e => setLocalItem({...localItem, productItemId: e.target.value})} disabled={!localItem.productGroupId}><option value="">選擇商品</option>{currentGroupItems.map(i => <option key={i.id} value={i.id}>{i.id} {i.name}</option>)}</select>
                </div>

                {/* 3. Description */}
                <div>
                    <label className={labelClass}>商品描述</label>
                    <input type="text" className={inputClass} value={localItem.description} onChange={e => setLocalItem({...localItem, description: e.target.value})} placeholder="規格/款式" />
                </div>
                
                {/* 4. Buyer */}
                <div>
                    <label className={labelClass}>訂購者</label>
                    <input type="text" className={inputClass} value={localItem.buyer} onChange={e => setLocalItem({...localItem, buyer: e.target.value})} placeholder="買家名稱" />
                </div>

                {/* 5. Quantity & Date (Row) */}
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className={labelClass}>數量</label>
                        <input type="number" className={`${inputClass} text-center`} value={localItem.quantity} onChange={e => setLocalItem({...localItem, quantity: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="flex-1">
                        <label className={labelClass}>日期</label>
                        <input type="date" className={inputClass} value={localItem.date} onChange={e => setLocalItem({...localItem, date: e.target.value})} />
                    </div>
                </div>

                {/* 6. Remarks */}
                <div>
                    <label className={labelClass}>備註</label>
                    <input type="text" className={inputClass} value={localItem.remarks} onChange={e => setLocalItem({...localItem, remarks: e.target.value})} placeholder="匯款/自留..." />
                </div>
                
                {/* 7. Notes */}
                <div>
                    <label className={labelClass}>說明</label>
                    <input type="text" className={inputClass} value={localItem.note} onChange={e => setLocalItem({...localItem, note: e.target.value})} placeholder="其他說明" />
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex gap-3 shrink-0">
                {editingOrderItem && <button onClick={() => handleDeleteOrderItem(null as any, editingOrderItem.id)} className="p-3 bg-rose-50 text-rose-600 rounded-lg border border-rose-200"><Trash2 size={24} /></button>}
                <button onClick={() => setIsOrderEntryOpen(false)} className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-600 font-bold text-lg">取消</button>
                <button onClick={() => handleSaveOrderItem({ ...localItem, orderGroupId: selectedOrderGroup! } as OrderItem)} disabled={!localItem.productItemId || !localItem.buyer} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md text-lg">儲存</button>
            </div>
        </div>
    )
  }

  // Modified Income View: Single Page, No Scroll, Even Distribution
  const renderIncomeView = () => {
    const { totalJpy, totalDomestic, totalHandling, totalSales, avgRateCost, netProfit, profitRate, cardFeeRate } = incomeStats;
    
    // Helper for Income Fields
    const Field = ({ label, value, isInput = false, onChange, colorClass = "text-slate-700", prefix = "" }: any) => (
      <div className="flex flex-col w-full">
        <span className="text-sm font-bold text-slate-500 ml-1 mb-0.5">{label}</span>
        <div className={`relative flex items-center px-2 h-10 rounded-lg border-2 ${isInput ? 'bg-white border-blue-300' : 'bg-slate-50 border-slate-200'} overflow-hidden w-full`}>
           {isInput ? (
             <input type={typeof value === 'number' ? 'number' : 'text'} className={`w-full bg-transparent outline-none font-mono font-bold text-xl text-right ${colorClass}`} value={value} onChange={onChange} />
           ) : (
             <div className={`w-full font-mono font-bold text-xl text-right truncate ${colorClass}`}>{prefix}{value}</div>
           )}
        </div>
      </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
             <Header title="收支計算" showOrderSelector={true} actions={
                <>
                  <ActionButton icon={PieChart} label="分析" onClick={() => setShowIncomeAnalysisModal(true)} variant="warning" />
                  <ActionButton icon={Save} label="儲存" onClick={handleManualSaveIncome} />
                  <ActionButton icon={Download} label="匯出" onClick={handleExportIncome} variant="success" />
                </>
             }/>
             
             {/* Main Content Container: Adjusted spacing (gap-2, p-2, overflow-hidden) */}
             <div className="flex-1 p-2 flex flex-col gap-2 overflow-hidden justify-start">
                
                {/* Card 1: Base Costs & Inputs */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-2 shrink-0">
                    <div className="grid grid-cols-3 gap-2">
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

                {/* Card 2: Profit Analysis */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-2 shrink-0">
                    <div className="grid grid-cols-2 gap-2">
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

                {/* Card 3: Receivables & Notes */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-center shrink-0">
                    <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-4"><Field label="爸爸應收" value={incomeData.dadReceivable} isInput onChange={(e:any) => setIncomeData({...incomeData, dadReceivable: parseFloat(e.target.value) || 0})} /></div>
                        <div className="col-span-8"><Field label="收款說明" value={incomeData.paymentNote || ''} isInput onChange={(e:any) => setIncomeData({...incomeData, paymentNote: e.target.value})} /></div>
                    </div>
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
        <Icon size={28} strokeWidth={view === id ? 2.5 : 2} className={view === id ? 'drop-shadow-sm' : ''} />
        <span className="text-xs font-bold mt-1 tracking-wide">{label}</span>
      </button>
  );

  // --- Main Layout ---
  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
            {view === 'products' && (
                <div className="flex flex-col h-full">
                    <Header title="產品管理" actions={<><ActionButton icon={Grid} label="新增" onClick={() => setShowNewGroupInput(!showNewGroupInput)} /><ActionButton icon={Download} label="匯出" onClick={handleExportProducts} variant="success" /></>} />
                    {showNewGroupInput && <div className="p-3 bg-blue-800 flex gap-2"><input autoFocus type="text" className="flex-1 p-3 text-lg rounded-lg" value={newGroupInput} onChange={e => setNewGroupInput(e.target.value)} placeholder="類別名稱" /><button onClick={handleAddGroup} className="text-sm bg-cyan-600 text-white px-4 rounded-lg font-bold">確定</button></div>}
                    <div className="flex-1 overflow-y-auto p-2 pb-24 space-y-2">
                        {filteredProducts.map(({ group, items }) => (
                            <div key={group.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}>
                                    <div className="flex items-center gap-3"><span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded text-base">{group.id}</span>
                                    {renamingId?.type === 'group' && renamingId.groupId === group.id ? 
                                        <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={handleSaveRename} onClick={e => e.stopPropagation()} className="font-bold text-2xl border-b border-blue-500 w-40"/> : 
                                        <span className="font-bold text-xl" onClick={(e) => { e.stopPropagation(); handleStartRename('group', group.id, undefined, group.name); }}>{group.name}</span>}
                                    <span className="text-sm text-slate-400 font-bold">({items.length})</span></div>
                                    {expandedGroup === group.id ? <ChevronDown size={24} className="text-blue-500"/> : <ChevronRight size={24} className="text-slate-400"/>}
                                </div>
                                {expandedGroup === group.id && <div className="p-2 bg-slate-50 border-t border-slate-100 space-y-2">
                                    <div className="flex justify-between gap-2"><button onClick={(e) => handleDeleteGroup(e, group.id)} className="text-sm text-rose-600 border border-rose-200 bg-white px-3 py-2 rounded-lg flex items-center font-bold"><Trash2 size={16} className="mr-1"/>刪除類別</button><button onClick={() => setEditingProduct({ group, nextId: getNextItemId(items.map(i => i.id)) })} className="text-sm text-white bg-emerald-600 px-4 py-2 rounded-lg flex items-center font-bold"><Plus size={18} className="mr-1"/>新增商品</button></div>
                                    {items.map(item => {
                                        const stats = calculateProductStats(item);
                                        return (
                                            <div key={item.id} className="bg-white border rounded-lg p-2 text-base shadow-sm relative">
                                                <div className="flex justify-between mb-2"><div className="flex-1 mr-2"><span className="font-mono bg-slate-100 px-1.5 rounded text-sm mr-2 font-bold">{item.id}</span>
                                                {renamingId?.type === 'item' && renamingId.itemId === item.id ? <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={handleSaveRename} className="font-bold border-b border-blue-500 w-full text-lg"/> : <span className="font-bold text-lg" onClick={(e) => { e.stopPropagation(); handleStartRename('item', group.id, item.id, item.name); }}>{cleanProductName(item.name)}</span>}
                                                </div><div className="flex gap-4"><Edit size={20} className="text-blue-500 cursor-pointer" onClick={() => setEditingProduct({ group, item, nextId: item.id })} /><Trash2 size={20} className="text-rose-500 cursor-pointer" onClick={(e) => handleDeleteProduct(e, group.id, item.id)} /></div></div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg font-medium">
                                                    <div className="flex justify-between"><span>日幣:</span> <span className="font-bold text-sm">¥{item.jpyPrice}</span></div>
                                                    <div className="flex justify-between text-emerald-600 font-bold"><span>利潤:</span> <span className="text-sm">{formatCurrency(stats.profit)}</span></div>
                                                    <div className="flex justify-between"><span>成本+運:</span> <span className="text-sm">{formatCurrency(stats.costPlusShip)}</span></div>
                                                    <div className="flex justify-between text-rose-500 font-bold"><span>售價+運:</span> <span className="text-sm">{formatCurrency(stats.pricePlusShip)}</span></div>
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
                    
                    {/* Fixed Header Section for Batch Info */}
                    {activeOrderGroup && (
                        <div className="shrink-0 px-2 pt-2 bg-slate-100 z-10">
                            <div className="bg-white rounded-lg shadow-sm p-3 flex justify-between items-center border-l-4 border-blue-600">
                                <div><div className="text-sm text-slate-400 font-bold">批次</div><div className="text-3xl font-mono font-bold text-slate-800">{activeOrderGroup.id}</div></div>
                                <div className="flex gap-3"><button onClick={(e) => handleDeleteOrderGroup(e, activeOrderGroup.id)} className="p-3 text-slate-300 hover:text-rose-500"><Trash2 size={24}/></button><button onClick={() => { setIsOrderEntryOpen(true); setEditingOrderItem(null); }} className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold flex items-center text-lg"><Plus size={20} className="mr-1"/>新增</button></div>
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
                                    {/* Row 1: Group Name + Actions */}
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{group?.name}</span>
                                        <div className="flex gap-4">
                                            <Edit size={20} className="text-blue-500" onClick={() => { setEditingOrderItem(item); setIsOrderEntryOpen(true); }} />
                                            <Trash2 size={20} className="text-rose-500" onClick={(e) => handleDeleteOrderItem(e, item.id)} />
                                        </div>
                                    </div>
                                    
                                    {/* Row 2: Product Name : Description ... Date */}
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold text-slate-800 text-lg leading-tight pr-2">
                                            {cleanProductName(product?.name || '')} 
                                            {item.description && <span className="text-slate-500 font-normal"> : {item.description}</span>}
                                        </div>
                                        <div className="text-xs text-slate-400 font-mono whitespace-nowrap pt-1">{item.date}</div>
                                    </div>

                                    {/* Row 3: Buyer ... Qty ... Price */}
                                    <div className="bg-slate-50 p-2 rounded flex justify-between items-center">
                                        <div className="font-bold text-blue-700 flex items-center gap-2 text-lg">
                                            <User size={18}/> {item.buyer}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-600 bg-white px-2 rounded shadow-sm">x{item.quantity}</span>
                                            <span className="font-mono font-bold text-emerald-600 text-xl">{formatCurrency(total)}</span>
                                        </div>
                                    </div>

                                    {item.remarks && <div className="mt-2 text-amber-600 text-sm border-t border-slate-100 pt-2 font-bold">備註: {item.remarks}</div>}
                                </div>
                            )
                        })}
                    </div>
                    {showNewOrderModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-lg w-full max-w-sm"><h3 className="font-bold mb-4 text-xl">建立批次</h3><div className="flex gap-2 mb-4"><select className="border p-3 rounded-lg flex-1 text-lg" value={newOrderDate.year} onChange={e => setNewOrderDate({...newOrderDate, year: +e.target.value})}><option value="2025">2025</option><option value="2026">2026</option></select><select className="border p-3 rounded-lg flex-1 text-lg" value={newOrderDate.month} onChange={e => setNewOrderDate({...newOrderDate, month: +e.target.value})}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}月</option>)}</select></div><div className="flex justify-end gap-3"><button onClick={()=>setShowNewOrderModal(false)} className="px-5 py-3 text-slate-500 font-bold">取消</button><button onClick={handleCreateOrderGroup} className="px-5 py-3 bg-blue-600 text-white rounded-lg font-bold">建立</button></div></div></div>}
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
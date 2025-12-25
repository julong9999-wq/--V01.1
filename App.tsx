import React, { useState, useMemo, useEffect } from 'react';
import { ProductGroup, ProductItem, OrderGroup, OrderItem, ViewState } from './types';
import { INITIAL_PRODUCT_GROUPS, INITIAL_PRODUCT_ITEMS, INITIAL_ORDER_GROUPS, INITIAL_ORDER_ITEMS } from './constants';
import { getNextGroupId, getNextItemId, getNextOrderGroupId, calculateProductStats, formatCurrency, generateUUID } from './utils';
import ProductForm from './components/ProductForm';
import { Trash2, Edit, Plus, Package, ShoppingCart, List, BarChart2, ChevronRight, ChevronDown, User, Box, X, Calculator, Download, Save } from 'lucide-react';
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

// --- Helper Components for Income View (Defined outside to prevent re-renders) ---
const IncomeStatBox = ({ label, value, type = 'currency', subColor = "text-slate-800" }: any) => {
    const fmtInt = (n: number) => Math.round(n).toLocaleString('zh-TW');
    const fmtPct = (n: number) => n.toFixed(2) + '%';
    const fmtRate = (n: number) => n.toFixed(3);
    
    let displayVal = '';
    if (type === 'currency') displayVal = fmtInt(value);
    else if (type === 'percent') displayVal = fmtPct(value);
    else if (type === 'rate') displayVal = fmtRate(value);
    else displayVal = value;

    return (
        <div className={`p-2 rounded-xl border border-slate-200 bg-slate-100 flex flex-col justify-center h-full`}>
            <div className="block text-xs font-bold text-slate-500 mb-0.5">{label}</div>
            <div className={`text-xl font-bold text-slate-800 font-mono ${subColor} truncate`}>
                {displayVal}
            </div>
        </div>
    );
};

const IncomeInputBox = ({ label, value, onChange, type = 'number', placeholder = "0" }: any) => (
    <div className="h-full flex flex-col">
            <label className="block text-xs font-bold text-slate-500 mb-0.5 ml-1">{label}</label>
            <input 
            type={type}
            className="w-full flex-1 rounded-xl px-3 py-1 text-lg font-bold text-slate-900 shadow-sm outline-none transition-all bg-white border-2 border-blue-100 focus:border-blue-400 focus:ring-blue-400"
            value={value}
            onChange={e => onChange(type === 'text' ? e.target.value : (parseFloat(e.target.value) || 0))}
            placeholder={placeholder}
            onFocus={(e) => e.target.select()} 
            />
    </div>
);

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<ViewState>('products');
  
  // Data State - Now managed by Firestore Listeners
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<{ group: ProductGroup, item?: ProductItem, nextId: string } | null>(null);
  const [newGroupInput, setNewGroupInput] = useState<string>('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);

  // Inline Renaming State
  const [renamingId, setRenamingId] = useState<{ type: 'group' | 'item', groupId: string, itemId?: string } | null>(null);
  const [tempName, setTempName] = useState('');

  // Default to the last (latest) group based on current state
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<string | null>(null);

  // Effect to select the latest order group once loaded
  useEffect(() => {
    if (!selectedOrderGroup && orderGroups.length > 0) {
        // Sort by ID (YYYYMMA) roughly works for chronological order if format is consistent
        const sorted = [...orderGroups].sort((a, b) => a.id.localeCompare(b.id));
        setSelectedOrderGroup(sorted[sorted.length - 1].id);
    }
  }, [orderGroups, selectedOrderGroup]);

  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [newOrderDate, setNewOrderDate] = useState({ year: 2025, month: new Date().getMonth() + 1 });

  // Order Item Entry
  const [editingOrderItem, setEditingOrderItem] = useState<OrderItem | null>(null);
  const [isOrderEntryOpen, setIsOrderEntryOpen] = useState(false);

  // Details View Mode
  const [detailSortMode, setDetailSortMode] = useState<'buyer' | 'product'>('buyer');

  // Income View State
  const [incomeData, setIncomeData] = useState({
      packagingRevenue: 0,
      cardCharge: 0,
      cardFee: 0,
      intlShipping: 0,
      dadReceivable: 0,
      paymentNote: ''
  });

  // --- Firestore Real-time Listeners ---
  useEffect(() => {
    // 1. Product Groups
    const unsubGroups = onSnapshot(collection(db, 'productGroups'), (snapshot) => {
        const groups = snapshot.docs.map(d => d.data() as ProductGroup).sort((a, b) => a.id.localeCompare(b.id));
        setProductGroups(groups);
        
        // --- DATA MIGRATION CHECK ---
        // If DB is empty, initialize with Constants
        if (snapshot.empty) {
            console.log("Empty DB detected. Initializing data...");
            const batch = writeBatch(db);
            INITIAL_PRODUCT_GROUPS.forEach(g => {
                const ref = doc(collection(db, 'productGroups'));
                batch.set(ref, g);
            });
            // We'll commit batch later or separately for safety, 
            // but here we trigger items load too
            batch.commit();
        }
    });

    // 2. Product Items
    const unsubItems = onSnapshot(collection(db, 'productItems'), (snapshot) => {
        const items = snapshot.docs.map(d => d.data() as ProductItem);
        setProductItems(items);
        if (snapshot.empty) {
             const batch = writeBatch(db);
             INITIAL_PRODUCT_ITEMS.forEach(i => {
                 const ref = doc(collection(db, 'productItems'));
                 batch.set(ref, i);
             });
             batch.commit();
        }
    });

    // 3. Order Groups
    const unsubOrderGroups = onSnapshot(collection(db, 'orderGroups'), (snapshot) => {
        const groups = snapshot.docs.map(d => d.data() as OrderGroup).sort((a, b) => a.id.localeCompare(b.id));
        setOrderGroups(groups);
        if (snapshot.empty) {
             const batch = writeBatch(db);
             INITIAL_ORDER_GROUPS.forEach(g => {
                 const ref = doc(collection(db, 'orderGroups'));
                 batch.set(ref, g);
             });
             batch.commit();
        }
    });

    // 4. Order Items
    const unsubOrderItems = onSnapshot(collection(db, 'orderItems'), (snapshot) => {
        const items = snapshot.docs.map(d => d.data() as OrderItem);
        setOrderItems(items);
        if (snapshot.empty) {
             const batch = writeBatch(db);
             INITIAL_ORDER_ITEMS.forEach(i => {
                 // Use the item.id as document ID to ensure uniqueness and easier updates if we used it
                 // But for now, simple add
                 const ref = doc(collection(db, 'orderItems'));
                 batch.set(ref, i);
             });
             batch.commit();
        }
    });

    // 5. Settings (Income Data)
    const unsubIncome = onSnapshot(doc(db, 'settings', 'income'), (docSnap) => {
        if (docSnap.exists()) {
            setIncomeData(docSnap.data() as any);
        } else {
             // Initialize income if missing
             setDoc(doc(db, 'settings', 'income'), {
                packagingRevenue: 0,
                cardCharge: 0,
                cardFee: 0,
                intlShipping: 0,
                dadReceivable: 0,
                paymentNote: ''
             });
        }
    });

    return () => {
        unsubGroups();
        unsubItems();
        unsubOrderGroups();
        unsubOrderItems();
        unsubIncome();
    };
  }, []);


  // --- Computed ---
  const filteredProducts = useMemo(() => {
    return productGroups.map(group => ({
      group,
      items: productItems.filter(item => item.groupId === group.id)
    }));
  }, [productGroups, productItems]);

  const activeOrderGroup = useMemo(() => 
    orderGroups.find(g => g.id === selectedOrderGroup), 
  [orderGroups, selectedOrderGroup]);

  const activeOrderItems = useMemo(() => 
    orderItems.filter(i => i.orderGroupId === selectedOrderGroup),
  [orderItems, selectedOrderGroup]);

  // --- Export Helper ---
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.map(c => {
        const str = String(c ?? '').replace(/"/g, '""');
        return `"${str}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Specific Export Handlers (Unchanged logic, just using state) ---
  const handleExportProducts = () => {
    const headers = ['類別ID', '類別名稱', '商品ID', '商品名稱', '日幣價格', '境內運', '手續費', '國際運', '售價匯率', '成本匯率', '輸入價格'];
    const rows = productItems.map(item => {
        const groupName = productGroups.find(g => g.id === item.groupId)?.name || '';
        return [
            item.groupId, groupName, item.id, item.name, 
            item.jpyPrice, item.domesticShip, item.handlingFee, item.intlShip,
            item.rateSale, item.rateCost, item.inputPrice
        ];
    });
    downloadCSV(`產品資料_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handleExportOrders = () => {
    if (!selectedOrderGroup) return;
    const headers = ['訂單批次', '商品類別', '商品ID', '商品名稱', '描述', '買家', '數量', '備註', '說明', '日期'];
    const rows = activeOrderItems.map(item => {
        const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
        return [
            item.orderGroupId, item.productGroupId, item.productItemId, product?.name || '',
            item.description, item.buyer, item.quantity, item.remarks, item.note, item.date
        ];
    });
    downloadCSV(`訂單_${selectedOrderGroup}`, headers, rows);
  };

  const handleExportDetails = () => {
    if (!selectedOrderGroup) return;
    const map = new Map<string, { key: string, label: string, totalQty: number, totalPrice: number, items: any[] }>();
    activeOrderItems.forEach(item => {
          const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
          const total = (product?.inputPrice || 0) * item.quantity;
          let key, label;
          if (detailSortMode === 'buyer') {
              key = item.buyer;
              label = item.buyer;
          } else {
              key = `${item.productGroupId}-${item.productItemId}`;
              label = `${product?.name || '未知商品'} (${key})`;
          }
          if (!map.has(key)) map.set(key, { key, label, totalQty: 0, totalPrice: 0, items: [] });
          const group = map.get(key)!;
          group.totalQty += item.quantity;
          group.totalPrice += total;
          group.items.push({ ...item, product, total });
    });
    
    const groupedData = Array.from(map.values());
    if (detailSortMode === 'buyer') {
        groupedData.sort((a, b) => a.label.localeCompare(b.label, 'zh-TW'));
        groupedData.forEach(g => {
            g.items.sort((a: any, b: any) => {
                const idA = `${a.productGroupId}-${a.productItemId}`;
                const idB = `${b.productGroupId}-${b.productItemId}`;
                return idA.localeCompare(idB);
            });
        });
    } else {
        groupedData.sort((a, b) => a.key.localeCompare(b.key));
        groupedData.forEach(g => {
            g.items.sort((a: any, b: any) => a.buyer.localeCompare(b.buyer, 'zh-TW'));
        });
    }

    const headers = detailSortMode === 'buyer' 
        ? ['買家', '商品描述', '商品原名', '數量', '單項總價', '買家總計']
        : ['商品', '買家', '描述', '數量', '單項總價', '商品總計'];

    const rows: (string | number)[][] = [];
    groupedData.forEach(group => {
        group.items.forEach(item => {
            if (detailSortMode === 'buyer') {
                rows.push([group.label, item.description, item.product?.name || '', item.quantity, item.total, group.totalPrice]);
            } else {
                rows.push([group.label, item.buyer, item.description, item.quantity, item.total, group.totalPrice]);
            }
        });
    });
    downloadCSV(`購買明細_${detailSortMode}_${selectedOrderGroup}`, headers, rows);
  };

  const handleExportAnalysis = () => {
    if (!selectedOrderGroup) return;
    type Stats = { qty: number; jpy: number; dom: number; hand: number; twd: number };
    const createStats = (): Stats => ({ qty: 0, jpy: 0, dom: 0, hand: 0, twd: 0 });
    const groupMap = new Map<string, { id: string; name: string; stats: Stats; items: Map<string, { id: string; name: string; stats: Stats }> }>();

    activeOrderItems.forEach(order => {
        const product = productItems.find(p => p.groupId === order.productGroupId && p.id === order.productItemId);
        const group = productGroups.find(g => g.id === order.productGroupId);
        if (product && group) {
            if (!groupMap.has(group.id)) groupMap.set(group.id, { id: group.id, name: group.name, stats: createStats(), items: new Map() });
            const groupNode = groupMap.get(group.id)!;
            if (!groupNode.items.has(product.id)) groupNode.items.set(product.id, { id: product.id, name: product.name, stats: createStats() });
            const itemNode = groupNode.items.get(product.id)!;
            const vQty = order.quantity;
            const vJpy = product.jpyPrice * vQty;
            const vDom = product.domesticShip * vQty;
            const vHand = product.handlingFee * vQty;
            const vTwd = product.inputPrice * vQty;
            itemNode.stats.qty += vQty; itemNode.stats.jpy += vJpy; itemNode.stats.dom += vDom; itemNode.stats.hand += vHand; itemNode.stats.twd += vTwd;
            groupNode.stats.qty += vQty; groupNode.stats.jpy += vJpy; groupNode.stats.dom += vDom; groupNode.stats.hand += vHand; groupNode.stats.twd += vTwd;
        }
    });

    const sortedGroups = Array.from(groupMap.values()).sort((a, b) => a.id.localeCompare(b.id));
    const headers = ['商品項目/名稱', '數量', '日幣總價', '境內運總價', '台幣總價'];
    const rows: (string | number)[][] = [];
    let grandTotal = createStats();

    sortedGroups.forEach(g => {
        rows.push([`[${g.id} ${g.name}] 總計`, g.stats.qty, g.stats.jpy, g.stats.dom, g.stats.twd]);
        grandTotal.qty += g.stats.qty; grandTotal.jpy += g.stats.jpy; grandTotal.dom += g.stats.dom; grandTotal.hand += g.stats.hand; grandTotal.twd += g.stats.twd;
        const sortedItems = Array.from(g.items.values()).sort((a, b) => a.id.localeCompare(b.id));
        sortedItems.forEach(i => rows.push([`  ${i.name}`, i.stats.qty, i.stats.jpy, i.stats.dom, i.stats.twd]));
    });
    rows.push(['=== 合計 ===', grandTotal.qty, grandTotal.jpy, grandTotal.dom, grandTotal.twd]);
    downloadCSV(`分析資料_${selectedOrderGroup}`, headers, rows);
  };

  const handleExportAllOrders = () => {
      const headers = ['訂單批次', '商品類別', '商品ID', '商品名稱', '描述', '買家', '數量', '備註', '說明', '日期'];
      const rows = orderItems.map(item => {
          const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
          return [
              item.orderGroupId, item.productGroupId, item.productItemId, product?.name || '',
              item.description, item.buyer, item.quantity, item.remarks, item.note, item.date
          ];
      });
      downloadCSV(`所有訂單備份_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };
  
  // --- Firebase Actions ---

  const handleManualSaveIncome = async () => {
      try {
        await setDoc(doc(db, 'settings', 'income'), incomeData);
        alert("儲存成功！");
      } catch (e) {
        console.error(e);
        alert("儲存失敗，請檢查網路");
      }
  };

  const handleAddGroup = async () => {
    if (!newGroupInput.trim()) return;
    const nextId = getNextGroupId(productGroups.map(p => p.id));
    try {
        await addDoc(collection(db, 'productGroups'), { id: nextId, name: newGroupInput });
        setNewGroupInput('');
        setShowNewGroupInput(false);
    } catch (e) {
        alert("新增失敗");
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    
    // Find documents to delete
    // Note: We need the Firestore Document ID, not the 'id' field
    const hasItems = productItems.some(i => i.groupId === groupId);
    
    if (hasItems) {
      if (!window.confirm(`警告：此類別內尚有 ${productItems.filter(i => i.groupId === groupId).length} 個商品。\n\n確定要刪除此類別嗎？這將會連同刪除所有該類別下的商品！`)) {
        return;
      }
    } else {
      if (!window.confirm("確定刪除此商品類別？")) return;
    }

    try {
        // 1. Delete Group
        const groupQuery = query(collection(db, 'productGroups'), where('id', '==', groupId));
        const groupSnap = await getDocs(groupQuery);
        const batch = writeBatch(db);
        
        groupSnap.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // 2. Delete Items
        const itemsQuery = query(collection(db, 'productItems'), where('groupId', '==', groupId));
        const itemsSnap = await getDocs(itemsQuery);
        itemsSnap.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

    } catch(e) {
        console.error(e);
        alert("刪除失敗");
    }
  };

  const handleStartRename = (type: 'group' | 'item', groupId: string, itemId: string | undefined, currentName: string) => {
    setRenamingId({ type, groupId, itemId });
    setTempName(currentName);
  };

  const handleSaveRename = async () => {
    if (!renamingId) return;
    const nameToSave = tempName.trim();
    if (!nameToSave) { handleCancelRename(); return; }

    try {
        if (renamingId.type === 'group') {
             const q = query(collection(db, 'productGroups'), where('id', '==', renamingId.groupId));
             const snaps = await getDocs(q);
             if (!snaps.empty) {
                 await updateDoc(snaps.docs[0].ref, { name: nameToSave });
             }
        } else {
             const q = query(collection(db, 'productItems'), where('groupId', '==', renamingId.groupId), where('id', '==', renamingId.itemId));
             const snaps = await getDocs(q);
             if (!snaps.empty) {
                 await updateDoc(snaps.docs[0].ref, { name: nameToSave });
             }
        }
    } catch(e) {
        console.error(e);
    }

    setRenamingId(null);
    setTempName('');
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setTempName('');
  };

  const handleSaveProduct = async (item: ProductItem) => {
    try {
        // Check if exists
        const q = query(collection(db, 'productItems'), where('groupId', '==', item.groupId), where('id', '==', item.id));
        const snaps = await getDocs(q);
        
        if (!snaps.empty) {
            // Update
            await updateDoc(snaps.docs[0].ref, { ...item });
        } else {
            // Create
            await addDoc(collection(db, 'productItems'), item);
        }
        setEditingProduct(null);
    } catch (e) {
        alert("儲存商品失敗");
    }
  };

  const handleDeleteProduct = async (e: React.MouseEvent, groupId: string, itemId: string) => {
    e.stopPropagation();
    if (window.confirm("確定刪除此商品？")) {
        const q = query(collection(db, 'productItems'), where('groupId', '==', groupId), where('id', '==', itemId));
        const snaps = await getDocs(q);
        const batch = writeBatch(db);
        snaps.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
  };

  const handleCreateOrderGroup = async () => {
    const existingInMonth = orderGroups
      .filter(g => g.year === newOrderDate.year && g.month === newOrderDate.month)
      .map(g => g.id);
    const newId = getNextOrderGroupId(newOrderDate.year, newOrderDate.month, existingInMonth);
    
    try {
        await addDoc(collection(db, 'orderGroups'), { 
            id: newId, 
            year: newOrderDate.year, 
            month: newOrderDate.month, 
            suffix: newId.slice(-1) 
        });
        setShowNewOrderModal(false);
        setSelectedOrderGroup(newId);
    } catch (e) {
        alert("建立失敗");
    }
  };

  const handleSaveOrderItem = async (item: OrderItem) => {
    try {
        // We use UUID in the item.id field. We can query by that.
        // If editingOrderItem is set, we are updating.
        if (editingOrderItem) {
             const q = query(collection(db, 'orderItems'), where('id', '==', item.id));
             const snaps = await getDocs(q);
             if (!snaps.empty) {
                 await updateDoc(snaps.docs[0].ref, { ...item });
             }
        } else {
            // New item
            const newItem = { ...item, id: generateUUID() };
            await addDoc(collection(db, 'orderItems'), newItem);
        }
        setIsOrderEntryOpen(false);
        setEditingOrderItem(null);
    } catch (e) {
        console.error(e);
        alert("儲存訂單項目失敗");
    }
  };
  
  const handleDeleteOrderItem = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm("確定刪除此訂單項目？")) {
          const q = query(collection(db, 'orderItems'), where('id', '==', id));
          const snaps = await getDocs(q);
          const batch = writeBatch(db);
          snaps.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
      }
  }

  // --- UI Components ---
  const inputClass = "w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm text-base";
  
  const OrderEntryModal = () => {
    const [localItem, setLocalItem] = useState<Partial<OrderItem>>(editingOrderItem || {
        quantity: 1,
        date: new Date().toISOString().split('T')[0],
        description: '',
        buyer: '',
        remarks: '',
        note: '',
        productGroupId: '',
        productItemId: ''
    });

    const currentGroupItems = productItems.filter(i => i.groupId === localItem.productGroupId);

    useEffect(() => {
        if (localItem.productGroupId && localItem.productItemId) {
            const p = productItems.find(i => i.groupId === localItem.productGroupId && i.id === localItem.productItemId);
            if (p && !editingOrderItem) { 
                setLocalItem(prev => ({ ...prev, description: p.name }));
            }
        }
    }, [localItem.productGroupId, localItem.productItemId, editingOrderItem]);

    const balancedInputClass = "w-full border border-slate-300 bg-white text-slate-900 py-2.5 px-3 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm text-base font-medium";
    const balancedLabelClass = "block text-xs font-bold text-slate-500 mb-1";

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-200">
            <div className="w-full max-w-lg mx-auto flex flex-col h-full bg-white shadow-2xl">
                <div className="px-4 py-3 border-b border-blue-900 bg-blue-950 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-cyan-400 text-lg">訂單項目</h3>
                    <button onClick={() => setIsOrderEntryOpen(false)} className="text-blue-200 hover:text-white p-2 rounded-full hover:bg-blue-900/50">
                        <X size={24} /> 
                    </button>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-4">
                    
                    {/* 1. Product Group */}
                    <div>
                        <label className={balancedLabelClass}>商品類別</label>
                        <select 
                            className={balancedInputClass}
                            value={localItem.productGroupId || ''}
                            onChange={e => setLocalItem({...localItem, productGroupId: e.target.value, productItemId: ''})}
                        >
                            <option value="">請選擇類別</option>
                            {productGroups.map(g => <option key={g.id} value={g.id}>{g.id} {g.name}</option>)}
                        </select>
                    </div>

                    {/* 2. Product Item */}
                    <div>
                        <label className={balancedLabelClass}>商品名稱</label>
                        <select 
                            className={balancedInputClass}
                            value={localItem.productItemId || ''}
                            onChange={e => setLocalItem({...localItem, productItemId: e.target.value})}
                            disabled={!localItem.productGroupId}
                        >
                            <option value="">請選擇商品</option>
                            {currentGroupItems.map(i => <option key={i.id} value={i.id}>{i.id} {i.name}</option>)}
                        </select>
                    </div>

                    {/* 3. Description */}
                    <div>
                        <label className={balancedLabelClass}>商品描述</label>
                        <input type="text" className={balancedInputClass} value={localItem.description} onChange={e => setLocalItem({...localItem, description: e.target.value})} placeholder="自動帶入 / 可修改" />
                    </div>
                    
                    {/* 4. Buyer */}
                    <div>
                        <label className={balancedLabelClass}>訂購者</label>
                        <input type="text" className={balancedInputClass} value={localItem.buyer} onChange={e => setLocalItem({...localItem, buyer: e.target.value})} placeholder="輸入姓名" />
                    </div>

                    {/* 5. Quantity & Date (Side by Side) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={balancedLabelClass}>數量</label>
                            <input type="number" className={balancedInputClass} value={localItem.quantity} onChange={e => setLocalItem({...localItem, quantity: parseInt(e.target.value) || 0})} />
                        </div>
                        <div>
                            <label className={balancedLabelClass}>日期</label>
                            <input type="date" className={balancedInputClass} value={localItem.date} onChange={e => setLocalItem({...localItem, date: e.target.value})} />
                        </div>
                    </div>
                    
                    {/* 6. Remarks */}
                    <div>
                        <label className={balancedLabelClass}>備註欄</label>
                        <input type="text" className={balancedInputClass} value={localItem.remarks} onChange={e => setLocalItem({...localItem, remarks: e.target.value})} placeholder="選填" />
                    </div>

                    {/* 7. Note */}
                    <div>
                        <label className={balancedLabelClass}>說明</label>
                        <input type="text" className={balancedInputClass} value={localItem.note} onChange={e => setLocalItem({...localItem, note: e.target.value})} placeholder="其他說明 (選填)" />
                    </div>

                </div>

                <div className="p-4 border-t border-slate-200 flex gap-4 bg-white shrink-0 pb-6">
                     <button onClick={() => setIsOrderEntryOpen(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold text-lg">取消</button>
                    <button 
                        disabled={!localItem.productItemId || !localItem.buyer}
                        onClick={() => handleSaveOrderItem({
                            ...localItem, 
                            orderGroupId: selectedOrderGroup!
                        } as OrderItem)}
                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-200 text-lg"
                    >
                        儲存
                    </button>
                </div>
            </div>
        </div>
    )
  }

  // --- Views ---

  const renderProductsView = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Area */}
      <div className="p-3 bg-blue-950 shadow-lg sticky top-0 z-30 border-b border-blue-900 shrink-0">
        <div className="flex justify-between items-center mb-2">
          {/* Renamed to 產品管理 */}
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-cyan-400 tracking-wide">產品管理</h2>
            <div className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[10px] text-emerald-400 font-bold">雲端連線中</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => setShowNewGroupInput(!showNewGroupInput)}
                className="flex items-center text-xs font-bold bg-blue-800 hover:bg-blue-700 text-blue-100 px-3 py-1.5 rounded-full transition-colors border border-blue-700 shadow"
            >
                <Plus size={16} className="mr-1" /> 新增類別
            </button>
            <button 
                onClick={handleExportProducts}
                className="flex items-center text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-emerald-100 px-3 py-1.5 rounded-full transition-colors border border-emerald-600 shadow"
                title="匯出所有產品"
            >
                <Download size={16} />
            </button>
          </div>
        </div>
        {showNewGroupInput && (
          <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
            <input 
              autoFocus
              type="text" 
              placeholder="輸入商品類別名稱" 
              className="border border-blue-800 bg-slate-900 text-white p-2 text-sm rounded-md flex-1 focus:ring-2 focus:ring-cyan-500 outline-none"
              value={newGroupInput}
              onChange={(e) => setNewGroupInput(e.target.value)}
            />
            <button onClick={handleAddGroup} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 text-sm font-bold rounded-md transition-colors shadow">確定</button>
          </div>
        )}
      </div>

      {/* Display Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 pb-24">
        {filteredProducts.map(({ group, items }) => (
          <div key={group.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div 
              className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded text-sm border border-blue-100">{group.id}</span>
                
                {/* Inline Editing for Group Name */}
                {renamingId?.type === 'group' && renamingId.groupId === group.id ? (
                    <input 
                        autoFocus
                        type="text"
                        className="font-bold text-slate-800 text-lg border-b-2 border-blue-500 outline-none bg-white/50 w-full max-w-[200px] rounded px-1"
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        onBlur={handleSaveRename}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveRename();
                            if (e.key === 'Escape') handleCancelRename();
                        }}
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    <span 
                        className="font-bold text-slate-800 text-lg hover:text-blue-600 hover:underline decoration-dashed underline-offset-4 decoration-2"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename('group', group.id, undefined, group.name);
                        }}
                        title="點擊修改類別名稱"
                    >
                        {group.name}
                    </span>
                )}

                <span className="text-sm font-medium text-slate-500">({items.length})</span>
              </div>
              <div className="flex items-center gap-3 relative z-10">
                {expandedGroup === group.id ? <ChevronDown size={24} className="text-blue-500 pointer-events-none"/> : <ChevronRight size={24} className="text-slate-400 pointer-events-none"/>}
              </div>
            </div>

            {expandedGroup === group.id && (
              <div className="p-2 border-t border-slate-100 bg-slate-50">
                {/* NEW LOCATION: Delete Group Button next to Add Product */}
                <div className="flex justify-between items-center mb-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
                   <button 
                        onClick={(e) => handleDeleteGroup(e, group.id)}
                        className="flex items-center text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 px-3 py-2 rounded-md shadow-sm text-sm font-bold transition-colors"
                    >
                        <Trash2 size={16} className="mr-1.5" /> 刪除類別
                    </button>

                   <button 
                    onClick={() => setEditingProduct({ group, nextId: getNextItemId(items.map(i => i.id)) })}
                    className="text-white bg-emerald-600 hover:bg-emerald-700 text-sm font-bold flex items-center px-4 py-2 rounded shadow-sm shadow-emerald-100 transition-colors"
                   >
                     <Plus size={18} className="mr-1"/> 新增商品
                   </button>
                </div>
                
                {items.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-base">無商品資料</div>
                ) : (
                    <div className="space-y-2">
                        {items.map(item => {
                            const stats = calculateProductStats(item);
                            return (
                                <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-2 text-base relative hover:border-blue-300 transition-colors shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center flex-1 mr-2">
                                            <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs font-bold mr-2 shrink-0">{item.id}</span>
                                            
                                            {/* Inline Editing for Product Item Name */}
                                            {renamingId?.type === 'item' && renamingId.groupId === group.id && renamingId.itemId === item.id ? (
                                                <input 
                                                    autoFocus
                                                    type="text"
                                                    className="font-bold text-slate-800 text-lg border-b-2 border-blue-500 outline-none bg-white w-full rounded px-1 min-w-0"
                                                    value={tempName}
                                                    onChange={e => setTempName(e.target.value)}
                                                    onBlur={handleSaveRename}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveRename();
                                                        if (e.key === 'Escape') handleCancelRename();
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span 
                                                    className="font-bold text-slate-800 text-lg cursor-text hover:text-blue-600 hover:underline decoration-dashed underline-offset-4 decoration-2 break-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartRename('item', group.id, item.id, item.name);
                                                    }}
                                                    title="點擊修改商品名稱"
                                                >
                                                    {item.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex space-x-3 relative z-10 shrink-0">
                                            <button 
                                                onClick={() => setEditingProduct({ group, item, nextId: item.id })} 
                                                className="text-blue-500 hover:text-blue-700 p-2 rounded-lg bg-blue-50 border border-blue-100 relative z-20"
                                            >
                                                <Edit size={20} className="pointer-events-none" />
                                            </button>
                                            <button 
                                              onClick={(e) => handleDeleteProduct(e, group.id, item.id)} 
                                              className="text-rose-500 hover:text-rose-700 p-2 rounded-lg bg-white border border-rose-200 shadow-sm hover:bg-rose-50 relative z-20"
                                            >
                                                <Trash2 size={20} className="pointer-events-none" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                        <div className="flex justify-between"><span>日幣:</span> <span className="text-slate-800 font-bold">¥{item.jpyPrice}</span></div>
                                        <div className="flex justify-between font-bold text-emerald-600"><span>利潤:</span> <span>{formatCurrency(stats.profit)}</span></div>
                                        <div className="flex justify-between"><span>成本+運:</span> <span>{formatCurrency(stats.costPlusShip)}</span></div>
                                        <div className="flex justify-between font-bold text-rose-500"><span>售價+運:</span> <span>{formatCurrency(stats.pricePlusShip)}</span></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {editingProduct && (
        <ProductForm 
          group={editingProduct.group}
          existingItems={productItems.filter(i => i.groupId === editingProduct.group.id)}
          initialData={editingProduct.item}
          nextId={editingProduct.nextId}
          onSave={handleSaveProduct}
          onCancel={() => setEditingProduct(null)}
        />
      )}
    </div>
  );

  const renderOrdersView = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Area */}
      <div className="p-3 bg-blue-950 shadow-lg z-10 border-b border-blue-900 shrink-0">
         <div className="flex justify-between items-center mb-2">
             <div className="flex items-center gap-2">
                 <h2 className="text-xl font-bold text-cyan-400 tracking-wide">訂單管理</h2>
                 <div className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                     <span className="text-[10px] text-emerald-400 font-bold">雲端連線中</span>
                </div>
             </div>
             <div className="flex gap-2">
                <button onClick={() => setShowNewOrderModal(true)} className="flex items-center text-xs font-bold bg-blue-800 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full transition-colors border border-blue-700 shadow">
                    <Plus size={16} className="mr-1"/> 建立訂單
                </button>
                <button 
                    onClick={handleExportOrders}
                    className="flex items-center text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-emerald-100 px-3 py-1.5 rounded-full transition-colors border border-emerald-600 shadow"
                    title="匯出本批次訂單"
                >
                    <Download size={16} />
                </button>
             </div>
         </div>
         {/* Order Group Selector */}
         <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
             {orderGroups.slice().reverse().map(group => (
                 <button
                    key={group.id}
                    onClick={() => setSelectedOrderGroup(group.id)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-lg font-mono text-sm font-bold border transition-all ${selectedOrderGroup === group.id ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-900/50' : 'bg-blue-900/50 text-blue-200 border-blue-800 hover:bg-blue-800'}`}
                 >
                     {group.id}
                 </button>
             ))}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 pb-20">
          {activeOrderGroup ? (
              <>
                  <div className="bg-white rounded-xl shadow-md mb-3 p-3 border-l-4 border-blue-600 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">當前訂單批次</div>
                        <div className="text-3xl font-bold font-mono text-slate-800 tracking-tight">{activeOrderGroup.id}</div>
                      </div>
                      <button 
                        onClick={() => { setIsOrderEntryOpen(true); setEditingOrderItem(null); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md shadow shadow-emerald-100 flex items-center text-base font-bold transition-colors"
                      >
                          <Plus size={20} className="mr-1"/> 新增項目
                      </button>
                  </div>

                  {/* Extra Compact Spacing for Order Items */}
                  <div className="space-y-2">
                      {activeOrderItems.length === 0 ? (
                           <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <ShoppingCart size={64} className="mb-4 opacity-30"/>
                                <p className="text-lg">尚無訂單資料</p>
                           </div>
                      ) : (
                          activeOrderItems.map(item => {
                              const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
                              const total = (product?.inputPrice || 0) * item.quantity;
                              return (
                                  <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-base hover:border-blue-300 transition-colors relative">
                                      
                                      {/* Row 1: ID & Date */}
                                      <div className="flex justify-between items-center text-sm text-slate-500 font-mono border-b border-slate-100 pb-1 mb-2">
                                          <span className="bg-slate-100 px-1.5 rounded">{item.productGroupId}-{item.productItemId}</span>
                                          <span>{item.date}</span>
                                      </div>

                                      {/* Row 2: Product Name : Description */}
                                      <div className="mb-3 pr-20">
                                           <div className="text-lg leading-tight">
                                               <span className="font-bold text-slate-800">{product?.name}</span>
                                               <span className="mx-1 text-slate-400 font-bold">:</span>
                                               <span className="text-slate-600 font-medium">{item.description}</span>
                                           </div>
                                      </div>

                                      {/* Row 3: Buyer | Qty | Price */}
                                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                          <div className="font-bold text-blue-700 flex items-center gap-1">
                                             <User size={16} /> {item.buyer}
                                          </div>
                                          <div className="flex items-center gap-4">
                                             <div className="font-bold text-slate-600 text-sm">x<span className="text-lg ml-0.5">{item.quantity}</span></div>
                                             <div className="font-mono font-bold text-emerald-600 text-xl">{formatCurrency(total)}</div>
                                          </div>
                                      </div>
                                      
                                      {/* Actions Positioned Absolute Top-Right */}
                                      <div className="absolute top-3 right-3 flex gap-2">
                                          <button 
                                            onClick={() => { setEditingOrderItem(item); setIsOrderEntryOpen(true); }} 
                                            className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg bg-blue-50 border border-blue-100"
                                          >
                                            <Edit size={18} />
                                          </button>
                                          <button 
                                            onClick={(e) => handleDeleteOrderItem(e, item.id)} 
                                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg bg-white border border-rose-200 shadow-sm hover:bg-rose-50"
                                          >
                                            <Trash2 size={18} />
                                          </button>
                                      </div>

                                      {item.remarks && <div className="mt-2 text-amber-600 text-sm border-t border-slate-100 pt-1"><span className="text-slate-400 font-bold mr-1">備註:</span> {item.remarks}</div>}
                                  </div>
                              )
                          })
                      )}
                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                  <Package size={80} className="mb-6 text-slate-300"/>
                  <p className="text-xl font-medium">請選擇上方訂單批次或建立新訂單</p>
              </div>
          )}
      </div>

      {/* New Order Group Modal */}
      {showNewOrderModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 p-8 rounded-xl w-full max-w-sm shadow-2xl">
                  <h3 className="text-xl font-bold mb-6 text-slate-800">建立新訂單批次</h3>
                  <div className="flex gap-4 mb-8">
                      <select 
                        className={inputClass}
                        value={newOrderDate.year}
                        onChange={e => setNewOrderDate({...newOrderDate, year: parseInt(e.target.value)})}
                      >
                          <option value="2024">2024</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                      </select>
                      <select 
                        className={inputClass}
                        value={newOrderDate.month}
                        onChange={e => setNewOrderDate({...newOrderDate, month: parseInt(e.target.value)})}
                      >
                          {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                              <option key={m} value={m}>{m}月</option>
                          ))}
                      </select>
                  </div>
                  <div className="flex justify-end gap-4">
                      <button onClick={() => setShowNewOrderModal(false)} className="px-6 py-2 text-slate-500 hover:text-slate-800 transition-colors text-lg">取消</button>
                      <button onClick={handleCreateOrderGroup} className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-lg shadow-blue-200 transition-colors text-lg font-bold">建立</button>
                  </div>
              </div>
          </div>
      )}
      
      {isOrderEntryOpen && <OrderEntryModal />}
    </div>
  );

  const renderIncomeView = () => {
    // 1. Filter Order Items based on selectedOrderGroup (Single select to match Order Management)
    const relevantOrderItems = selectedOrderGroup 
        ? orderItems.filter(item => item.orderGroupId === selectedOrderGroup)
        : [];

    // 2. Base Calculation Loop
    let totalJpy = 0;
    let totalDomesticShip = 0;
    let totalHandling = 0;
    let totalRevenue = 0;

    relevantOrderItems.forEach(item => {
        const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
        if (product) {
            const qty = item.quantity;
            totalJpy += product.jpyPrice * qty;
            totalDomesticShip += product.domesticShip * qty;
            totalHandling += product.handlingFee * qty;
            totalRevenue += product.inputPrice * qty;
        }
    });

    // 3. Derived Calculations
    const costBase = totalJpy + totalDomesticShip + totalHandling;
    const cardCostTotal = incomeData.cardCharge + incomeData.cardFee;
    
    // Row 4 Formulas
    // Ex Rate = (Card Charge + Card Fee) / (Total JPY + Total Dom Ship + Total Handling)
    const cardExchangeRate = costBase > 0 ? (cardCostTotal / costBase) : 0;
    
    // Fee % = (Card Fee / Card Charge) * 100 
    const feePercent = incomeData.cardCharge > 0 ? (incomeData.cardFee / incomeData.cardCharge) * 100 : 0;

    // Row 5 Formulas
    // Profit = (Revenue + Packaging) - (Card Charge + Card Fee + Intl Ship)
    const totalOutflow = cardCostTotal + incomeData.intlShipping;
    const totalInflow = totalRevenue + incomeData.packagingRevenue;
    const profit = totalInflow - totalOutflow;

    // Profit Margin = Profit / (Card Charge + Card Fee + Intl Ship)
    const profitMargin = totalOutflow > 0 ? (profit / totalOutflow) * 100 : 0;

    // Row 6 Split
    const profitDad = profit * 0.2;
    const profitSis = profit * 0.8;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50">
             {/* Header */}
             <div className="bg-blue-950 p-3 shadow-lg border-b border-blue-900 shrink-0">
                 <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-2">
                         <h2 className="text-xl font-bold text-cyan-400 tracking-wide">收支計算</h2>
                         <div className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                             <span className="text-[10px] text-emerald-400 font-bold">雲端連線中</span>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <button 
                            onClick={handleManualSaveIncome}
                            className="flex items-center text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full transition-colors border border-blue-500 shadow"
                            title="儲存設定"
                        >
                            <Save size={16} className="mr-1"/> 儲存
                        </button>
                        <button 
                            onClick={handleExportAllOrders}
                            className="flex items-center text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-emerald-100 px-3 py-1.5 rounded-full transition-colors border border-emerald-600 shadow"
                            title="匯出所有歷史訂單"
                        >
                            <Download size={16} />
                        </button>
                     </div>
                 </div>
                 {/* Selector - Copied from Order Management */}
                 <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                     {orderGroups.slice().reverse().map(group => (
                         <button
                            key={group.id}
                            onClick={() => setSelectedOrderGroup(group.id)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-lg font-mono text-sm font-bold border transition-all ${selectedOrderGroup === group.id ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-900/50' : 'bg-blue-900/50 text-blue-200 border-blue-800 hover:bg-blue-800'}`}
                         >
                             {group.id}
                         </button>
                     ))}
                 </div>
             </div>

             {/* Content - Single Page Layout */}
             <div className="flex-1 flex flex-col p-3 gap-2 overflow-hidden">
                
                {/* Row 1: Costs (Calculated) - Flex grow to fill space evenly */}
                <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
                    <IncomeStatBox label="日幣總計" value={totalJpy} />
                    <IncomeStatBox label="境內運總計" value={totalDomesticShip} />
                    <IncomeStatBox label="手續費總計" value={totalHandling} />
                </div>

                {/* Row 2: Revenue (Mixed) */}
                <div className="grid grid-cols-2 gap-3 items-center bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex-1 min-h-0">
                    <IncomeStatBox label="收入金額 (商品)" value={totalRevenue} subColor="text-blue-600"/>
                    <IncomeInputBox 
                        label="包材收入 (輸入)" 
                        value={incomeData.packagingRevenue}
                        onChange={(val: number) => setIncomeData({...incomeData, packagingRevenue: val})}
                    />
                </div>

                {/* Row 3: Expenses (Input) */}
                <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex-1 min-h-0">
                    <IncomeInputBox label="刷卡費" value={incomeData.cardCharge} onChange={(val: number) => setIncomeData({...incomeData, cardCharge: val})} />
                    <IncomeInputBox label="刷卡手續費" value={incomeData.cardFee} onChange={(val: number) => setIncomeData({...incomeData, cardFee: val})} />
                    <IncomeInputBox label="國際運費" value={incomeData.intlShipping} onChange={(val: number) => setIncomeData({...incomeData, intlShipping: val})} />
                </div>

                {/* Row 4: Rates (Calculated) */}
                <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                    <IncomeStatBox label="刷卡匯率" value={cardExchangeRate} type="rate" subColor="text-purple-600"/>
                    <IncomeStatBox label="手續費 %" value={feePercent} type="percent" subColor="text-purple-600"/>
                </div>

                {/* Row 5: Profit (Calculated) */}
                <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                    <IncomeStatBox label="總利潤" value={profit} subColor={profit >= 0 ? "text-emerald-600" : "text-rose-600"}/>
                    <IncomeStatBox label="利潤率 (ROI)" value={profitMargin} type="percent" subColor={profitMargin >= 0 ? "text-emerald-600" : "text-rose-600"}/>
                </div>

                {/* Row 6: Split (Calculated) */}
                <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                    <IncomeStatBox label="利潤 (爸 20%)" value={profitDad} subColor="text-indigo-600"/>
                    <IncomeStatBox label="利潤 (妹 80%)" value={profitSis} subColor="text-pink-600"/>
                </div>

                {/* Row 7: Final (Input) */}
                <div className="grid grid-cols-2 gap-3 bg-white p-2 rounded-2xl shadow-lg border-2 border-blue-100 flex-1 min-h-0">
                    <IncomeInputBox label="爸爸應收" value={incomeData.dadReceivable} onChange={(val: number) => setIncomeData({...incomeData, dadReceivable: val})} />
                    <IncomeInputBox label="收款說明" type="text" value={incomeData.paymentNote} onChange={(val: string) => setIncomeData({...incomeData, paymentNote: val})} />
                </div>

             </div>
        </div>
    );
  };

  const renderAnalysisView = () => {
      // Filter items based on selection
      const targetItems = selectedOrderGroup 
        ? orderItems.filter(i => i.orderGroupId === selectedOrderGroup) 
        : [];

      // Logic: Aggregate by Group first, then by Item
      type Stats = {
          qty: number;
          jpy: number;
          dom: number;
          hand: number;
          twd: number;
      };
      
      const createStats = (): Stats => ({ qty: 0, jpy: 0, dom: 0, hand: 0, twd: 0 });

      // Structure: GroupId -> { info, stats, items: ItemId -> { info, stats } }
      const groupMap = new Map<string, { 
          id: string; 
          name: string; 
          stats: Stats; 
          items: Map<string, { id: string; name: string; stats: Stats }> 
      }>();

      targetItems.forEach(order => {
          const product = productItems.find(p => p.groupId === order.productGroupId && p.id === order.productItemId);
          const group = productGroups.find(g => g.id === order.productGroupId);
          
          if (product && group) {
             if (!groupMap.has(group.id)) {
                 groupMap.set(group.id, {
                     id: group.id,
                     name: group.name,
                     stats: createStats(),
                     items: new Map()
                 });
             }
             const groupNode = groupMap.get(group.id)!;

             if (!groupNode.items.has(product.id)) {
                 groupNode.items.set(product.id, {
                     id: product.id,
                     name: product.name,
                     stats: createStats()
                 });
             }
             const itemNode = groupNode.items.get(product.id)!;

             // Calculate values for this order item
             const vQty = order.quantity;
             const vJpy = product.jpyPrice * vQty;
             const vDom = product.domesticShip * vQty;
             const vHand = product.handlingFee * vQty;
             const vTwd = product.inputPrice * vQty;

             // Add to Item Stats
             itemNode.stats.qty += vQty;
             itemNode.stats.jpy += vJpy;
             itemNode.stats.dom += vDom;
             itemNode.stats.hand += vHand;
             itemNode.stats.twd += vTwd;

             // Add to Group Stats
             groupNode.stats.qty += vQty;
             groupNode.stats.jpy += vJpy;
             groupNode.stats.dom += vDom;
             groupNode.stats.hand += vHand;
             groupNode.stats.twd += vTwd;
          }
      });

      // Sort Groups by ID
      const sortedGroups = Array.from(groupMap.values()).sort((a, b) => a.id.localeCompare(b.id));
      
      // Calculate Grand Totals
      const grandTotal = createStats();
      sortedGroups.forEach(g => {
          grandTotal.qty += g.stats.qty;
          grandTotal.jpy += g.stats.jpy;
          grandTotal.dom += g.stats.dom;
          grandTotal.hand += g.stats.hand;
          grandTotal.twd += g.stats.twd;
      });

      const fmtInt = (n: number) => Math.round(n).toLocaleString('zh-TW');

      return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50">
            <div className="bg-blue-950 p-3 shadow-lg border-b border-blue-900 shrink-0">
                 <div className="flex justify-between items-center mb-2">
                     <h2 className="text-xl font-bold text-cyan-400 tracking-wide">分析資料</h2>
                     <button 
                        onClick={handleExportAnalysis}
                        className="flex items-center text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-emerald-100 px-3 py-1.5 rounded-full transition-colors border border-emerald-600 shadow"
                        title="匯出分析表"
                    >
                        <Download size={16} />
                    </button>
                 </div>
                 <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                     {orderGroups.slice().reverse().map(group => (
                         <button
                            key={group.id}
                            onClick={() => setSelectedOrderGroup(group.id)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-lg font-mono text-sm font-bold border transition-all ${selectedOrderGroup === group.id ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-900/50' : 'bg-blue-900/50 text-blue-200 border-blue-800 hover:bg-blue-800'}`}
                         >
                             {group.id}
                         </button>
                     ))}
                 </div>
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-1 px-2 py-2 bg-blue-100 border-b border-blue-200 text-sm font-bold text-blue-800 shrink-0 text-center tracking-tighter">
                <div className="col-span-6 text-left pl-1">商品項目/名稱</div>
                <div className="col-span-1">數量</div>
                <div className="col-span-2">日幣總</div>
                <div className="col-span-1">境運</div>
                <div className="col-span-2 text-right pr-1">台幣總</div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 pb-24 space-y-2">
                {sortedGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <BarChart2 size={48} className="mb-2 opacity-30"/>
                        <p>無資料</p>
                    </div>
                ) : (
                    sortedGroups.map(group => (
                        <div key={group.id} className="border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                            {/* Group Header (Main Form) */}
                            <div className="grid grid-cols-12 gap-1 px-2 py-2 bg-blue-50 border-b border-slate-200 items-center text-sm font-bold text-slate-800">
                                <div className="col-span-6 text-left truncate text-blue-800">{group.id} {group.name}</div>
                                <div className="col-span-1 text-center font-mono">{group.stats.qty}</div>
                                <div className="col-span-2 text-center font-mono">{fmtInt(group.stats.jpy)}</div>
                                <div className="col-span-1 text-center font-mono">{fmtInt(group.stats.dom)}</div>
                                <div className="col-span-2 text-right font-mono text-blue-700">{fmtInt(group.stats.twd)}</div>
                            </div>
                            
                            {/* Items List (Sub Form) */}
                            <div className="bg-white divide-y divide-slate-100">
                                {Array.from(group.items.values())
                                    .sort((a, b) => a.id.localeCompare(b.id))
                                    .map(item => (
                                    <div key={item.id} className="grid grid-cols-12 gap-1 px-2 py-2 items-center text-sm font-bold text-slate-700 hover:bg-slate-50">
                                        <div className="col-span-6 text-left pl-3 truncate border-l-2 border-slate-200 ml-1">{item.name}</div>
                                        <div className="col-span-1 text-center font-mono text-slate-400">{item.stats.qty}</div>
                                        <div className="col-span-2 text-center font-mono text-slate-400">{fmtInt(item.stats.jpy)}</div>
                                        <div className="col-span-1 text-center font-mono text-slate-400">{fmtInt(item.stats.dom)}</div>
                                        <div className="col-span-2 text-right font-mono font-medium text-slate-600">{fmtInt(item.stats.twd)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Summary */}
             <div className="bg-slate-800 border-t border-slate-700 p-3 shrink-0 grid grid-cols-12 gap-1 text-sm font-bold text-white items-center pb-safe shadow-inner">
                 <div className="col-span-6 text-center text-yellow-400">總計</div>
                 <div className="col-span-1 text-center font-mono">{grandTotal.qty}</div>
                 <div className="col-span-2 text-center font-mono text-slate-300">{fmtInt(grandTotal.jpy)}</div>
                 <div className="col-span-1 text-center font-mono text-slate-300">{fmtInt(grandTotal.dom)}</div>
                 <div className="col-span-2 text-right font-mono text-emerald-400">{fmtInt(grandTotal.twd)}</div>
            </div>
        </div>
      );
  };

  const renderDetailsView = () => {
      const targetItems = selectedOrderGroup 
        ? orderItems.filter(i => i.orderGroupId === selectedOrderGroup) 
        : orderItems;

      const map = new Map<string, { key: string, label: string, totalQty: number, totalPrice: number, items: any[] }>();
      
      targetItems.forEach(item => {
          const product = productItems.find(p => p.groupId === item.productGroupId && p.id === item.productItemId);
          const total = (product?.inputPrice || 0) * item.quantity;
          
          let key, label;
          if (detailSortMode === 'buyer') {
              key = item.buyer;
              label = item.buyer;
          } else {
              key = `${item.productGroupId}-${item.productItemId}`;
              label = `${product?.name || '未知商品'} (${key})`;
          }

          if (!map.has(key)) {
              map.set(key, { key, label, totalQty: 0, totalPrice: 0, items: [] });
          }
          const group = map.get(key)!;
          group.totalQty += item.quantity;
          group.totalPrice += total;
          group.items.push({ ...item, product, total });
      });

      const groupedData = Array.from(map.values());

      // --- Sorting Logic ---
      if (detailSortMode === 'buyer') {
          // 1. Sort Buyers Alphabetically (Highest Category)
          groupedData.sort((a, b) => a.label.localeCompare(b.label, 'zh-TW'));
          
          // 2. Sort Items by Product ID (Sub-category)
          groupedData.forEach(g => {
              g.items.sort((a: any, b: any) => {
                  const idA = `${a.productGroupId}-${a.productItemId}`;
                  const idB = `${b.productGroupId}-${b.productItemId}`;
                  return idA.localeCompare(idB);
              });
          });
      } else {
          // 1. Sort Products by ID (Highest Category)
          groupedData.sort((a, b) => a.key.localeCompare(b.key));
          
          // 2. Sort Items by Buyer Name (Sub-category)
          groupedData.forEach(g => {
              g.items.sort((a: any, b: any) => a.buyer.localeCompare(b.buyer, 'zh-TW'));
          });
      }

      return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header Area */}
            <div className="bg-blue-950 p-3 shadow-lg border-b border-blue-900 shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-cyan-400 tracking-wide">購買明細</h2>
                    <div className="flex gap-2">
                        {/* View Switcher */}
                        <div className="bg-blue-900/50 p-1 rounded-lg flex border border-blue-800">
                            <button 
                                onClick={() => setDetailSortMode('buyer')}
                                className={`px-2 py-1 rounded-md text-xs font-bold flex items-center transition-all ${detailSortMode === 'buyer' ? 'bg-cyan-600 text-white shadow' : 'text-blue-300 hover:text-white'}`}
                            >
                                <User size={14} className="mr-1"/> 依買家
                            </button>
                            <button 
                                onClick={() => setDetailSortMode('product')}
                                className={`px-2 py-1 rounded-md text-xs font-bold flex items-center transition-all ${detailSortMode === 'product' ? 'bg-cyan-600 text-white shadow' : 'text-blue-300 hover:text-white'}`}
                            >
                                <Box size={14} className="mr-1"/> 依商品
                            </button>
                        </div>
                        <button 
                            onClick={handleExportDetails}
                            className="flex items-center text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-emerald-100 px-3 py-1.5 rounded-full transition-colors border border-emerald-600 shadow"
                            title="匯出明細"
                        >
                            <Download size={16} />
                        </button>
                    </div>
                </div>
                 
                 {/* Selector for Details - No "All" Button */}
                 <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                     {orderGroups.slice().reverse().map(group => (
                         <button
                            key={group.id}
                            onClick={() => setSelectedOrderGroup(group.id)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-lg font-mono text-sm font-bold border transition-all ${selectedOrderGroup === group.id ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-900/50' : 'bg-blue-900/50 text-blue-200 border-blue-800 hover:bg-blue-800'}`}
                         >
                             {group.id}
                         </button>
                     ))}
                 </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-24">
                {groupedData.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                         <List size={64} className="mb-4 opacity-30"/>
                         <p className="text-lg">尚無明細資料</p>
                     </div>
                ) : (
                    groupedData.map(group => (
                        <div key={group.key} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-100">
                                <div className="font-bold text-slate-800 text-xl flex items-center">
                                    {detailSortMode === 'buyer' ? <User size={24} className="text-blue-500 mr-2"/> : <Box size={24} className="text-emerald-500 mr-2"/>}
                                    {group.label}
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-400 font-bold uppercase">Total</div>
                                    <div className="font-mono text-emerald-600 font-bold text-lg">{formatCurrency(group.totalPrice)}</div>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {group.items.map((item: any) => (
                                    <div key={item.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                                        <div className="flex-1 pr-2">
                                            {detailSortMode === 'buyer' ? (
                                                <div className="flex flex-col">
                                                    <div className="font-bold text-slate-800 text-lg">
                                                       {item.product?.name} <span className="text-slate-400 mx-1">:</span> <span className="text-slate-600">{item.description}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <div className="font-bold text-slate-800 text-lg">
                                                       {item.buyer} <span className="text-slate-400 mx-1">:</span> <span className="text-slate-600">{item.description || '-'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-0.5 min-w-[80px]">
                                            <div className="text-lg">
                                                <span className="text-slate-400 text-sm mr-1">x</span>
                                                <span className="font-bold text-slate-800">{item.quantity}</span>
                                            </div>
                                            <div className="font-mono text-slate-600 font-medium text-lg">{formatCurrency(item.total)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      );
  };

  return (
    <div className="h-[100dvh] font-sans max-w-lg mx-auto bg-slate-50 shadow-2xl relative border-x border-slate-200 overflow-hidden flex flex-col">
      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {view === 'products' && renderProductsView()}
        {view === 'orders' && renderOrdersView()}
        {view === 'details' && renderDetailsView()}
        {view === 'analysis' && renderAnalysisView()}
        {view === 'income' && renderIncomeView()}
      </main>

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-blue-950/95 backdrop-blur-md border-t border-blue-900 flex justify-around items-center h-16 z-40 pb-safe">
        <button 
          onClick={() => setView('products')}
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${view === 'products' ? 'text-cyan-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Package size={24} strokeWidth={view === 'products' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">產品管理</span>
        </button>
        <button 
          onClick={() => setView('orders')}
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${view === 'orders' ? 'text-cyan-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <ShoppingCart size={24} strokeWidth={view === 'orders' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">訂單管理</span>
        </button>
        <button 
          onClick={() => setView('details')}
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${view === 'details' ? 'text-cyan-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <List size={24} strokeWidth={view === 'details' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">購買明細</span>
        </button>
        <button 
          onClick={() => setView('analysis')}
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${view === 'analysis' ? 'text-cyan-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <BarChart2 size={24} strokeWidth={view === 'analysis' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">分析資料</span>
        </button>
        <button 
          onClick={() => setView('income')}
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${view === 'income' ? 'text-cyan-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Calculator size={24} strokeWidth={view === 'income' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">收支計算</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
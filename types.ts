export interface ProductGroup {
  id: string; // e.g., "A01"
  name: string; // e.g., "排球少年"
}

export interface ProductItem {
  groupId: string;
  id: string; // e.g., "01"
  name: string; // e.g., "骨牌"
  jpyPrice: number;
  domesticShip: number; // 境內運費
  handlingFee: number; // 手續費
  intlShip: number; // 國際運費
  rateSale: number; // 售價匯率
  rateCost: number; // 成本匯率
  inputPrice: number; // 輸入價格
}

export interface OrderGroup {
  id: string; // e.g., "202511A"
  year: number;
  month: number;
  suffix: string; // 'A' - 'Z'
}

export interface OrderItem {
  id: string; // UUID
  orderGroupId: string;
  productGroupId: string;
  productItemId: string;
  quantity: number;
  description: string; // 商品描述 (Auto-filled but editable)
  buyer: string; // 訂購者
  remarks: string; // 備註欄
  note: string; // 說明
  date: string; // 訂單日期
  isSelfAbsorbed?: boolean; // For "自己吸收" logic if needed, inferred from buyer name in OCR
}

export type ViewState = 'products' | 'orders' | 'details' | 'analysis' | 'income';
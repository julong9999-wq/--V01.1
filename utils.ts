import { ProductItem } from "./types";

// Safe UUID generator that works in browsers and Node.js environments
export const generateUUID = (): string => {
  // Check if crypto is available (Browser or recent Node.js)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments where crypto is not available globally
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const formatCurrency = (value: number) => {
  return value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper for rounding to 2 decimal places to ensure precision
const roundTwoDecimals = (num: number) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Calculation Logic
export const calculateProductStats = (item: ProductItem) => {
  // Base Sum = 日幣單價 + 境內運費 + 手續費
  const baseSum = item.jpyPrice + item.domesticShip + item.handlingFee;
  
  // "台幣售價"= ( "日幣單價" + "境內運費" + "手續費" ) * "售價匯率"
  const twdPrice = roundTwoDecimals(baseSum * item.rateSale);
  
  // "台幣成本"= ( "日幣單價" + "境內運費" + "手續費" ) * "成本匯率"
  const twdCost = roundTwoDecimals(baseSum * item.rateCost);
  
  // "成本+運費" = "台幣成本" + "國際運費"
  const costPlusShip = roundTwoDecimals(twdCost + item.intlShip);
  
  // "售價+運費" = "台幣售價" + "國際運費"
  const pricePlusShip = roundTwoDecimals(twdPrice + item.intlShip);
  
  // "單件利潤" = "台幣售價" - "成本+運費"
  const profit = roundTwoDecimals(twdPrice - costPlusShip);

  return {
    twdPrice,      // 台幣售價
    twdCost,       // 台幣成本
    costPlusShip,  // 成本+運費
    pricePlusShip, // 售價+運費
    profit         // 單件利潤
  };
};

// ID Generation Logic for Product Groups (A00 - Z99)
export const getNextGroupId = (currentIds: string[]): string => {
  if (currentIds.length === 0) return 'A00';

  const lastId = currentIds.sort().pop()!;
  const letter = lastId.charAt(0);
  const num = parseInt(lastId.substring(1), 10);

  if (num < 99) {
    return `${letter}${String(num + 1).padStart(2, '0')}`;
  } else {
    const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
    return `${nextLetter}00`;
  }
};

// ID Generation for Product Items (00-99)
export const getNextItemId = (currentIds: string[]): string => {
  if (currentIds.length === 0) return '01';
  const maxId = Math.max(...currentIds.map(id => parseInt(id, 10)));
  return String(maxId + 1).padStart(2, '0');
};

// ID Generation for Order Groups (YYYYMM + A-Z)
export const getNextOrderGroupId = (year: number, month: number, existingIdsInMonth: string[]): string => {
  const suffixes = existingIdsInMonth.map(id => id.slice(-1)).sort();
  let nextSuffix = 'A';
  if (suffixes.length > 0) {
    const lastSuffix = suffixes[suffixes.length - 1];
    nextSuffix = String.fromCharCode(lastSuffix.charCodeAt(0) + 1);
  }
  return `${year}${String(month).padStart(2, '0')}${nextSuffix}`;
};
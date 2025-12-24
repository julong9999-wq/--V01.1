import { ProductGroup, ProductItem, OrderGroup, OrderItem } from './types';
import { generateUUID } from './utils';

// --- Product Data ---

export const INITIAL_PRODUCT_GROUPS: ProductGroup[] = [
  { id: 'A00', name: '境內運費' },
  { id: 'A01', name: '排球少年' },
  { id: 'A02', name: '怪獸八號' },
  { id: 'A03', name: '銀魂' },
  { id: 'A04', name: '坂本' },
  { id: 'A05', name: '極樂街' },
  { id: 'A06', name: '進擊的巨人' },
  { id: 'A07', name: '火影' },
  { id: 'A08', name: '我推' },
  { id: 'A09', name: '鬼滅' },
  { id: 'A10', name: '進擊的巨人' },
  { id: 'A11', name: '我心危' },
  { id: 'A12', name: '怪獸八號' },
  { id: 'A13', name: 'Given' },
  { id: 'A14', name: '徹夜之歌' },
  { id: 'A15', name: '我心危' },
  { id: 'A16', name: '怪獸八號' },
  { id: 'A17', name: '怪獸八號' },
  { id: 'A18', name: '銀魂' },
  { id: 'A19', name: '坂本' },
  { id: 'A20', name: '排球少年' },
  { id: 'A21', name: '徹夜之歌' },
];

export const INITIAL_PRODUCT_ITEMS: ProductItem[] = [
  // A00 境內運費
  { groupId: 'A00', id: '01', name: '1.境內運費 10', jpyPrice: 0, domesticShip: 10, handlingFee: 0, intlShip: 0, rateSale: 0.250, rateCost: 0.250, inputPrice: 0 },
  { groupId: 'A00', id: '02', name: '1.境內運費 100', jpyPrice: 0, domesticShip: 100, handlingFee: 0, intlShip: 0, rateSale: 0.250, rateCost: 0.250, inputPrice: 0 },

  // A01 排球少年
  { groupId: 'A01', id: '01', name: '1.骨牌', jpyPrice: 880, domesticShip: 0, handlingFee: 0, intlShip: 30, rateSale: 0.250, rateCost: 0.205, inputPrice: 250 },
  { groupId: 'A01', id: '02', name: '2.幼年小立牌', jpyPrice: 440, domesticShip: 0, handlingFee: 0, intlShip: 10, rateSale: 0.250, rateCost: 0.205, inputPrice: 120 },
  { groupId: 'A01', id: '03', name: '3.生日徽章', jpyPrice: 550, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 150 },
  { groupId: 'A01', id: '04', name: '4.生日立牌', jpyPrice: 1980, domesticShip: 0, handlingFee: 0, intlShip: 10, rateSale: 0.250, rateCost: 0.205, inputPrice: 505 },
  { groupId: 'A01', id: '05', name: '5.影山日向sv聯賽 32mm徽章', jpyPrice: 990, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 260 },
  { groupId: 'A01', id: '06', name: '6.影山/日向sv聯賽立牌', jpyPrice: 1650, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 425 },
  { groupId: 'A01', id: '07', name: '7.原畫X立牌第一彈', jpyPrice: 935, domesticShip: 0, handlingFee: 0, intlShip: 11, rateSale: 0.250, rateCost: 0.205, inputPrice: 245 },
  { groupId: 'A01', id: '08', name: '8.原畫X立牌第二彈', jpyPrice: 935, domesticShip: 0, handlingFee: 0, intlShip: 11, rateSale: 0.250, rateCost: 0.205, inputPrice: 245 },
  { groupId: 'A01', id: '09', name: '9.浮雕三彈', jpyPrice: 715, domesticShip: 0, handlingFee: 0, intlShip: 11, rateSale: 0.250, rateCost: 0.205, inputPrice: 190 },
  { groupId: 'A01', id: '10', name: '10.烏野高校vs音駒高校 第三彈徽章', jpyPrice: 440, domesticShip: 0, handlingFee: 0, intlShip: 10, rateSale: 0.250, rateCost: 0.205, inputPrice: 120 },
  { groupId: 'A01', id: '11', name: '11.名片卡第一彈 一包三張', jpyPrice: 440, domesticShip: 0, handlingFee: 0, intlShip: 10, rateSale: 0.250, rateCost: 0.205, inputPrice: 120 },

  // A02 怪獸八號
  { groupId: 'A02', id: '01', name: '1.原畫盲抽', jpyPrice: 440, domesticShip: 0, handlingFee: 0, intlShip: 10, rateSale: 0.250, rateCost: 0.205, inputPrice: 120 },

  // A03 銀魂
  { groupId: 'A03', id: '01', name: '1.生日徽章', jpyPrice: 550, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 150 },
  { groupId: 'A03', id: '02', name: '2.生日立牌', jpyPrice: 1650, domesticShip: 0, handlingFee: 0, intlShip: 27, rateSale: 0.250, rateCost: 0.205, inputPrice: 440 },
  { groupId: 'A03', id: '03', name: '3.伊莉莎白吊飾盲抽', jpyPrice: 770, domesticShip: 0, handlingFee: 0, intlShip: 7, rateSale: 0.250, rateCost: 0.205, inputPrice: 200 },

  // A04 坂本
  { groupId: 'A04', id: '01', name: '1.雕金徽章', jpyPrice: 990, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.240, rateCost: 0.205, inputPrice: 250 },
  { groupId: 'A04', id: '02', name: '2.4人徽章', jpyPrice: 1760, domesticShip: 0, handlingFee: 0, intlShip: 9, rateSale: 0.245, rateCost: 0.205, inputPrice: 440 },
  { groupId: 'A04', id: '03', name: '3.24年生日徽章', jpyPrice: 495, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 150 },
  { groupId: 'A04', id: '04', name: '4.25年生日徽章', jpyPrice: 550, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 150 },
  { groupId: 'A04', id: '05', name: '5.生日立牌', jpyPrice: 1650, domesticShip: 0, handlingFee: 0, intlShip: 27, rateSale: 0.250, rateCost: 0.205, inputPrice: 440 },
  { groupId: 'A04', id: '06', name: '6.原話徽章第一彈', jpyPrice: 440, domesticShip: 0, handlingFee: 0, intlShip: 10, rateSale: 0.250, rateCost: 0.205, inputPrice: 120 },
  { groupId: 'A04', id: '07', name: '7.原畫徽章第二彈', jpyPrice: 440, domesticShip: 0, handlingFee: 0, intlShip: 10, rateSale: 0.250, rateCost: 0.205, inputPrice: 120 },
  { groupId: 'A04', id: '08', name: '8.生日收藏卡', jpyPrice: 1760, domesticShip: 0, handlingFee: 0, intlShip: 9, rateSale: 0.245, rateCost: 0.205, inputPrice: 440 },
  { groupId: 'A04', id: '09', name: '9.生日卡套', jpyPrice: 1540, domesticShip: 0, handlingFee: 0, intlShip: 8, rateSale: 0.245, rateCost: 0.205, inputPrice: 385 },
  { groupId: 'A04', id: '10', name: '10.浮雕第一彈', jpyPrice: 715, domesticShip: 0, handlingFee: 0, intlShip: 8, rateSale: 0.240, rateCost: 0.205, inputPrice: 180 },

  // A05 極樂街
  { groupId: 'A05', id: '01', name: '1.鑰匙圈盲抽', jpyPrice: 440, domesticShip: 0, handlingFee: 0, intlShip: 20, rateSale: 0.250, rateCost: 0.205, inputPrice: 130 },
  { groupId: 'A05', id: '02', name: '2.迷你小立牌盲抽', jpyPrice: 440, domesticShip: 0, handlingFee: 0, intlShip: 20, rateSale: 0.250, rateCost: 0.205, inputPrice: 130 },
  { groupId: 'A05', id: '03', name: '3.立牌', jpyPrice: 2200, domesticShip: 0, handlingFee: 0, intlShip: 11, rateSale: 0.245, rateCost: 0.205, inputPrice: 550 },

  // A06 進擊的巨人
  { groupId: 'A06', id: '01', name: '1.里維生日徽章套組', jpyPrice: 1540, domesticShip: 0, handlingFee: 0, intlShip: 20, rateSale: 0.263, rateCost: 0.205, inputPrice: 425 },

  // A07 火影
  { groupId: 'A07', id: '01', name: '1.生日徽章', jpyPrice: 550, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 150 },
  { groupId: 'A07', id: '02', name: '2.生日立牌', jpyPrice: 1650, domesticShip: 0, handlingFee: 0, intlShip: 16, rateSale: 0.290, rateCost: 0.205, inputPrice: 495 },
  { groupId: 'A07', id: '03', name: '3.鳴人生日立牌', jpyPrice: 1980, domesticShip: 0, handlingFee: 0, intlShip: 20, rateSale: 0.240, rateCost: 0.205, inputPrice: 495 },
  { groupId: 'A07', id: '04', name: '4.個人池徽章', jpyPrice: 2640, domesticShip: 0, handlingFee: 0, intlShip: 13, rateSale: 0.245, rateCost: 0.205, inputPrice: 660 },

  // A08 我推
  { groupId: 'A08', id: '01', name: '1.原畫雙人立牌', jpyPrice: 1980, domesticShip: 0, handlingFee: 0, intlShip: 5, rateSale: 0.250, rateCost: 0.205, inputPrice: 500 },
  { groupId: 'A08', id: '02', name: '2.37mmm徽章', jpyPrice: 330, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 95 },
  { groupId: 'A08', id: '03', name: '3.角色卡盲抽（一包三張）', jpyPrice: 660, domesticShip: 0, handlingFee: 0, intlShip: 3, rateSale: 0.245, rateCost: 0.205, inputPrice: 165 },
  { groupId: 'A08', id: '04', name: '4.單人立牌', jpyPrice: 1650, domesticShip: 0, handlingFee: 0, intlShip: 11, rateSale: 0.260, rateCost: 0.205, inputPrice: 440 },
  { groupId: 'A08', id: '05', name: '5.加奈卡套+卡片', jpyPrice: 1320, domesticShip: 0, handlingFee: 0, intlShip: 7, rateSale: 0.245, rateCost: 0.205, inputPrice: 330 },

  // A09 鬼滅
  { groupId: 'A09', id: '01', name: '1.無限城娃娃抱盒A', jpyPrice: 6930, domesticShip: 0, handlingFee: 0, intlShip: 127, rateSale: 0.250, rateCost: 0.205, inputPrice: 1860 },
  { groupId: 'A09', id: '02', name: '2.無限城娃娃抱盒B', jpyPrice: 6930, domesticShip: 0, handlingFee: 0, intlShip: 127, rateSale: 0.250, rateCost: 0.205, inputPrice: 1860 },

  // A10 進擊的巨人 (Duplicates allowed, distinct ID)
  { groupId: 'A10', id: '01', name: '1.艾連娃娃', jpyPrice: 1980, domesticShip: 0, handlingFee: 0, intlShip: 70, rateSale: 0.240, rateCost: 0.205, inputPrice: 530 },
  { groupId: 'A10', id: '02', name: '2.里維娃娃', jpyPrice: 1980, domesticShip: 0, handlingFee: 0, intlShip: 70, rateSale: 0.240, rateCost: 0.205, inputPrice: 530 },

  // A11 我心危
  { groupId: 'A11', id: '01', name: '1.立牌A', jpyPrice: 1436, domesticShip: 0, handlingFee: 0, intlShip: 31, rateSale: 0.250, rateCost: 0.205, inputPrice: 390 },
  { groupId: 'A11', id: '02', name: '2.立牌B', jpyPrice: 1436, domesticShip: 0, handlingFee: 0, intlShip: 31, rateSale: 0.250, rateCost: 0.205, inputPrice: 390 },
  { groupId: 'A11', id: '03', name: '3.山田娃娃', jpyPrice: 1148, domesticShip: 0, handlingFee: 0, intlShip: 13, rateSale: 0.250, rateCost: 0.205, inputPrice: 300 },
  { groupId: 'A11', id: '04', name: '4.市川娃娃', jpyPrice: 1148, domesticShip: 0, handlingFee: 0, intlShip: 13, rateSale: 0.250, rateCost: 0.205, inputPrice: 300 },

  // A12 怪獸八號
  { groupId: 'A12', id: '01', name: '1.浴衣徽章抱盒', jpyPrice: 990, domesticShip: 490, handlingFee: 0, intlShip: 58, rateSale: 0.265, rateCost: 0.205, inputPrice: 450 },
  { groupId: 'A12', id: '02', name: '2.水槍徽章抱盒', jpyPrice: 1375, domesticShip: 0, handlingFee: 0, intlShip: 56, rateSale: 0.265, rateCost: 0.205, inputPrice: 420 },
  { groupId: 'A12', id: '03', name: '3.Ani-Art徽章抱盒', jpyPrice: 2455, domesticShip: 0, handlingFee: 0, intlShip: 49, rateSale: 0.265, rateCost: 0.205, inputPrice: 700 },

  // A13 Given
  { groupId: 'A13', id: '01', name: '1.克羅塔盲抽A', jpyPrice: 900, domesticShip: 0, handlingFee: 0, intlShip: 15, rateSale: 0.250, rateCost: 0.205, inputPrice: 1860 }, // Note: inputPrice seems high in OCR, kept as is
  { groupId: 'A13', id: '02', name: '2.克羅塔盲抽B', jpyPrice: 900, domesticShip: 0, handlingFee: 0, intlShip: 15, rateSale: 0.250, rateCost: 0.205, inputPrice: 1860 },
  { groupId: 'A13', id: '03', name: '3.克羅塔盲抽C', jpyPrice: 900, domesticShip: 0, handlingFee: 0, intlShip: 15, rateSale: 0.250, rateCost: 0.205, inputPrice: 1860 },
  { groupId: 'A13', id: '04', name: '4.pick盲抽', jpyPrice: 600, domesticShip: 0, handlingFee: 0, intlShip: 15, rateSale: 0.250, rateCost: 0.205, inputPrice: 1860 },
  // Duplicates in A13 numbering from OCR, handling by appending text or unique ID if possible, but distinct IDs required. 
  // OCR has: 01, 02, 03, 04, then 02 again, 03 again, 04 again?
  // Re-checking OCR: 
  // A13 01 Given 1.克羅塔盲抽A
  // A13 02 Given 2.克羅塔盲抽B
  // A13 03 Given 3.克羅塔盲抽C
  // A13 04 Given 4.pick盲抽
  // A13 02 Given 2.小卡盲抽
  // A13 03 Given 1.束口袋+隨機小卡
  // A13 04 Given 2.貼紙盲抽
  // I will correct IDs to be unique for A13: 05, 06, 07
  { groupId: 'A13', id: '05', name: '2.小卡盲抽', jpyPrice: 450, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 1860 },
  { groupId: 'A13', id: '06', name: '1.束口袋+隨機小卡', jpyPrice: 1500, domesticShip: 0, handlingFee: 0, intlShip: 15, rateSale: 0.250, rateCost: 0.205, inputPrice: 1860 },
  { groupId: 'A13', id: '07', name: '2.貼紙盲抽', jpyPrice: 750, domesticShip: 0, handlingFee: 0, intlShip: 7, rateSale: 0.250, rateCost: 0.205, inputPrice: 1860 },

  // A14 徹夜之歌
  { groupId: 'A14', id: '01', name: '1.七草徽章', jpyPrice: 748, domesticShip: 0, handlingFee: 75, intlShip: 19, rateSale: 0.220, rateCost: 0.205, inputPrice: 200 },
  { groupId: 'A14', id: '02', name: '2.七草立牌', jpyPrice: 1980, domesticShip: 0, handlingFee: 198, intlShip: 40, rateSale: 0.225, rateCost: 0.205, inputPrice: 530 },

  // A15 我心危 (Items same as A11?)
  { groupId: 'A15', id: '01', name: '1.立牌A', jpyPrice: 1436, domesticShip: 0, handlingFee: 0, intlShip: 31, rateSale: 0.250, rateCost: 0.205, inputPrice: 390 },
  { groupId: 'A15', id: '02', name: '2.立牌B', jpyPrice: 1436, domesticShip: 0, handlingFee: 0, intlShip: 31, rateSale: 0.250, rateCost: 0.205, inputPrice: 390 },
  { groupId: 'A15', id: '03', name: '3.山田娃娃', jpyPrice: 1148, domesticShip: 0, handlingFee: 0, intlShip: 13, rateSale: 0.250, rateCost: 0.205, inputPrice: 300 },
  { groupId: 'A15', id: '04', name: '4.市川娃娃', jpyPrice: 1148, domesticShip: 0, handlingFee: 0, intlShip: 13, rateSale: 0.250, rateCost: 0.205, inputPrice: 300 },

  // A16 怪獸八號
  { groupId: 'A16', id: '01', name: '1.銅閃徽章抱盒', jpyPrice: 3300, domesticShip: 490, handlingFee: 0, intlShip: 31, rateSale: 0.245, rateCost: 0.205, inputPrice: 960 },

  // A17 怪獸八號
  { groupId: 'A17', id: '01', name: '1.鳴海生日徽章', jpyPrice: 550, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.260, rateCost: 0.205, inputPrice: 155 },
  { groupId: 'A17', id: '02', name: '2.鳴海生日立牌', jpyPrice: 1650, domesticShip: 0, handlingFee: 0, intlShip: 31, rateSale: 0.260, rateCost: 0.205, inputPrice: 460 },
  { groupId: 'A17', id: '03', name: '3.徽章盲抽', jpyPrice: 440, domesticShip: 0, handlingFee: 0, intlShip: 6, rateSale: 0.260, rateCost: 0.205, inputPrice: 120 },
  { groupId: 'A17', id: '04', name: '4.名刺卡盲抽', jpyPrice: 440, domesticShip: 0, handlingFee: 0, intlShip: 6, rateSale: 0.260, rateCost: 0.205, inputPrice: 120 },
  { groupId: 'A17', id: '05', name: '5.杯墊盲抽', jpyPrice: 660, domesticShip: 0, handlingFee: 0, intlShip: 8, rateSale: 0.260, rateCost: 0.205, inputPrice: 180 },

  // A18 銀魂
  { groupId: 'A18', id: '01', name: '1.生日徽章', jpyPrice: 550, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 150 },
  { groupId: 'A18', id: '02', name: '2.生日立牌', jpyPrice: 1650, domesticShip: 0, handlingFee: 0, intlShip: 32, rateSale: 0.250, rateCost: 0.205, inputPrice: 445 },
  { groupId: 'A18', id: '03', name: '3.伊莉莎白吊飾盲抽', jpyPrice: 770, domesticShip: 0, handlingFee: 0, intlShip: 7, rateSale: 0.250, rateCost: 0.205, inputPrice: 200 },
  { groupId: 'A18', id: '04', name: '4.JAS盲抽', jpyPrice: 1320, domesticShip: 0, handlingFee: 0, intlShip: 30, rateSale: 0.250, rateCost: 0.205, inputPrice: 360 },
  { groupId: 'A18', id: '05', name: '5.大川徽章盲抽', jpyPrice: 500, domesticShip: 0, handlingFee: 0, intlShip: 10, rateSale: 0.250, rateCost: 0.205, inputPrice: 135 },
  { groupId: 'A18', id: '06', name: '6.大川立牌盲抽', jpyPrice: 770, domesticShip: 0, handlingFee: 0, intlShip: 17, rateSale: 0.250, rateCost: 0.205, inputPrice: 210 },
  { groupId: 'A18', id: '07', name: '7.總悟眼罩', jpyPrice: 943, domesticShip: 0, handlingFee: 0, intlShip: 19, rateSale: 0.250, rateCost: 0.205, inputPrice: 255 },
  { groupId: 'A18', id: '08', name: '8.全息卡盲抽', jpyPrice: 550, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 150 },

  // A19 坂本
  { groupId: 'A19', id: '01', name: '1.24年生日徽章', jpyPrice: 495, domesticShip: 0, handlingFee: 0, intlShip: 26, rateSale: 0.250, rateCost: 0.205, inputPrice: 150 },
  { groupId: 'A19', id: '02', name: '2.25年生日徽章', jpyPrice: 550, domesticShip: 0, handlingFee: 0, intlShip: 12, rateSale: 0.250, rateCost: 0.205, inputPrice: 150 },
  { groupId: 'A19', id: '03', name: '3.生日立牌', jpyPrice: 1650, domesticShip: 0, handlingFee: 0, intlShip: 37, rateSale: 0.250, rateCost: 0.205, inputPrice: 450 },
  { groupId: 'A19', id: '04', name: '4.生日收藏卡', jpyPrice: 1760, domesticShip: 0, handlingFee: 0, intlShip: 9, rateSale: 0.245, rateCost: 0.205, inputPrice: 440 },
  { groupId: 'A19', id: '05', name: '5.大佛生日卡套', jpyPrice: 1540, domesticShip: 0, handlingFee: 0, intlShip: 18, rateSale: 0.245, rateCost: 0.205, inputPrice: 395 },
  { groupId: 'A19', id: '06', name: '6.燙金明信片盲抽', jpyPrice: 440, domesticShip: 0, handlingFee: 0, intlShip: 10, rateSale: 0.250, rateCost: 0.205, inputPrice: 120 },

  // A20 排球少年
  { groupId: 'A20', id: '01', name: '1.生日徽章', jpyPrice: 550, domesticShip: 0, handlingFee: 0, intlShip: 15, rateSale: 0.245, rateCost: 0.205, inputPrice: 150 },
  { groupId: 'A20', id: '02', name: '2.生日立牌', jpyPrice: 1980, domesticShip: 0, handlingFee: 0, intlShip: 15, rateSale: 0.245, rateCost: 0.205, inputPrice: 500 },
  { groupId: 'A20', id: '03', name: '3.骨牌盲抽', jpyPrice: 880, domesticShip: 0, handlingFee: 0, intlShip: 20, rateSale: 0.250, rateCost: 0.205, inputPrice: 240 },

  // A21 徹夜之歌
  { groupId: 'A21', id: '01', name: '1.動漫場景壓克力', jpyPrice: 330, domesticShip: 0, handlingFee: 0, intlShip: 9, rateSale: 0.260, rateCost: 0.205, inputPrice: 95 },
  { groupId: 'A21', id: '02', name: '2.壓克力牌', jpyPrice: 1760, domesticShip: 0, handlingFee: 0, intlShip: 17, rateSale: 0.260, rateCost: 0.205, inputPrice: 475 },
  { groupId: 'A21', id: '03', name: '3.可遙小壓克力牌', jpyPrice: 880, domesticShip: 0, handlingFee: 0, intlShip: 15, rateSale: 0.250, rateCost: 0.205, inputPrice: 235 },
  { groupId: 'A21', id: '04', name: '4.吊飾', jpyPrice: 770, domesticShip: 0, handlingFee: 0, intlShip: 11, rateSale: 0.245, rateCost: 0.205, inputPrice: 200 },
  { groupId: 'A21', id: '05', name: '5.徽章盲抽', jpyPrice: 660, domesticShip: 0, handlingFee: 0, intlShip: 5, rateSale: 0.250, rateCost: 0.205, inputPrice: 170 },
  { groupId: 'A21', id: '06', name: '6.閃光鑰使圈盲抽', jpyPrice: 1320, domesticShip: 0, handlingFee: 0, intlShip: 20, rateSale: 0.250, rateCost: 0.205, inputPrice: 350 },
  { groupId: 'A21', id: '07', name: '7.杯墊', jpyPrice: 1760, domesticShip: 0, handlingFee: 0, intlShip: 30, rateSale: 0.250, rateCost: 0.205, inputPrice: 470 },
];

// --- Order Data ---

export const INITIAL_ORDER_GROUPS: OrderGroup[] = [
  { id: '202511A', year: 2025, month: 11, suffix: 'A' },
  { id: '202511B', year: 2025, month: 11, suffix: 'B' },
  { id: '202511C', year: 2025, month: 11, suffix: 'C' },
  { id: '202511D', year: 2025, month: 11, suffix: 'D' },
  { id: '202512E', year: 2025, month: 12, suffix: 'E' },
  { id: '202512F', year: 2025, month: 12, suffix: 'F' },
];

export const INITIAL_ORDER_ITEMS: OrderItem[] = [
  // 202511A
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A01', productItemId: '03', quantity: 1, description: '及川', buyer: '黃怡瑄', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A01', productItemId: '03', quantity: 1, description: '木兔', buyer: '黃怡瑄', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A01', productItemId: '03', quantity: 1, description: '研磨', buyer: '黃怡瑄', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A01', productItemId: '01', quantity: 1, description: '不想吹頭髮', buyer: '.', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A02', productItemId: '01', quantity: 4, description: 'Skypefb Lee', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A02', productItemId: '01', quantity: 6, description: '水賴(無卡)', buyer: '已匯款 300 元', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A04', productItemId: '04', quantity: 1, description: '夏生', buyer: '蘇蘇', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A04', productItemId: '04', quantity: 1, description: '赤尾利音', buyer: '白洛辰', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A04', productItemId: '04', quantity: 1, description: '大佛', buyer: 'Lyen Yong', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A04', productItemId: '09', quantity: 1, description: '大佛', buyer: 'Yilu Lin', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A04', productItemId: '04', quantity: 1, description: '南雲', buyer: '王郁萍', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A04', productItemId: '08', quantity: 1, description: '', buyer: '李莉娜', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A04', productItemId: '09', quantity: 1, description: '大佛', buyer: '陽喆安', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A03', productItemId: '01', quantity: 1, description: '桂', buyer: '陳雨星', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A03', productItemId: '02', quantity: 1, description: '總悟', buyer: 'Yan Liu', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A03', productItemId: '03', quantity: 1, description: '', buyer: '噓肌肉', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A04', productItemId: '04', quantity: 1, description: '夏生', buyer: 'Yu Rou', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A04', productItemId: '04', quantity: 1, description: '南雲', buyer: 'Yu Rou', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A04', productItemId: '03', quantity: 1, description: '樂', buyer: 'Yu Rou', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A02', productItemId: '01', quantity: 4, description: '今天好冷', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A02', productItemId: '01', quantity: 4, description: '王禹臻', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A02', productItemId: '01', quantity: 4, description: '許願', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A02', productItemId: '01', quantity: 4, description: '白穩', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A02', productItemId: '01', quantity: 4, description: '桓我扣扣', buyer: '', remarks: '', note: '' },
  
  // 202511B
  { id: generateUUID(), orderGroupId: '202511B', date: '2025-10-24', productGroupId: 'A06', productItemId: '01', quantity: 1, description: '里維小嬌妻', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511B', date: '2025-10-24', productGroupId: 'A06', productItemId: '01', quantity: 1, description: 'Eileen Lin', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511B', date: '2025-10-24', productGroupId: 'A06', productItemId: '01', quantity: 4, description: '0.自己庫存', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-05', productGroupId: 'A03', productItemId: '01', quantity: 1, description: '總悟', buyer: 'Uni Duck', remarks: '', note: '' },
  
  // Back to 202511A items with different dates
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-06', productGroupId: 'A00', productItemId: '01', quantity: 88, description: '自已吸收', buyer: '陳禹辰', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-06', productGroupId: 'A00', productItemId: '01', quantity: 88, description: '自已吸收', buyer: '陳禹辰', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-06', productGroupId: 'A00', productItemId: '01', quantity: 88, description: '自已吸收', buyer: '陳禹辰', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-06', productGroupId: 'A04', productItemId: '04', quantity: 2, description: '大佛', buyer: '廖翊如', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-07', productGroupId: 'A03', productItemId: '01', quantity: 1, description: '總悟', buyer: '葉家妤', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-07', productGroupId: 'A03', productItemId: '01', quantity: 1, description: '桂', buyer: '葉家妤', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-08', productGroupId: 'A04', productItemId: '03', quantity: 1, description: '樂', buyer: 'Dylan Wang', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-08', productGroupId: 'A04', productItemId: '04', quantity: 1, description: '南雲', buyer: 'Dylan Wang', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511A', date: '2025-11-08', productGroupId: 'A04', productItemId: '04', quantity: 1, description: '大佛', buyer: 'Dylan Wang', remarks: '', note: '' },
  
  // 202511B Items
  { id: generateUUID(), orderGroupId: '202511B', date: '2025-11-10', productGroupId: 'A06', productItemId: '01', quantity: 1, description: '凌波維步', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511B', date: '2025-11-10', productGroupId: 'A06', productItemId: '01', quantity: 1, description: 'Anber Cheng', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511B', date: '2025-11-10', productGroupId: 'A06', productItemId: '01', quantity: 1, description: 'Bolva Wu', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511B', date: '2025-12-08', productGroupId: 'A06', productItemId: '01', quantity: 1, description: '謝宇涵', buyer: '', remarks: '', note: '' },

  // 202511C Items
  { id: generateUUID(), orderGroupId: '202511C', date: '2025-11-15', productGroupId: 'A11', productItemId: '01', quantity: 1, description: '蔡孟儒', buyer: '已匯300', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511C', date: '2025-11-15', productGroupId: 'A11', productItemId: '02', quantity: 1, description: '蔡孟儒', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511C', date: '2025-11-15', productGroupId: 'A11', productItemId: '03', quantity: 1, description: 'Xin Jue Lee', buyer: '已匯300', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511C', date: '2025-11-15', productGroupId: 'A11', productItemId: '04', quantity: 1, description: 'Xin Jue Lee', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511C', date: '2025-11-15', productGroupId: 'A11', productItemId: '04', quantity: 1, description: '王沛潔', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511C', date: '2025-11-15', productGroupId: 'A11', productItemId: '03', quantity: 1, description: 'WF QP', buyer: '已匯300', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511C', date: '2025-11-15', productGroupId: 'A11', productItemId: '04', quantity: 1, description: 'WF QP', buyer: '', remarks: '', note: '' },

  // 202511D Items
  { id: generateUUID(), orderGroupId: '202511D', date: '2025-11-25', productGroupId: 'A14', productItemId: '01', quantity: 1, description: '孫偉竣', buyer: '已匯300', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511D', date: '2025-11-25', productGroupId: 'A14', productItemId: '02', quantity: 1, description: '孫偉竣', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511D', date: '2025-11-25', productGroupId: 'A14', productItemId: '01', quantity: 1, description: 'Satoru Pome', buyer: '已匯300', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511D', date: '2025-11-25', productGroupId: 'A14', productItemId: '02', quantity: 1, description: 'Satoru Pome', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511D', date: '2025-11-25', productGroupId: 'A14', productItemId: '02', quantity: 1, description: 'Yu Xin', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511D', date: '2025-11-25', productGroupId: 'A14', productItemId: '01', quantity: 1, description: '洪定磊', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511D', date: '2025-11-25', productGroupId: 'A14', productItemId: '02', quantity: 1, description: '魏翔如', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511D', date: '2025-11-25', productGroupId: 'A14', productItemId: '01', quantity: 1, description: '吳銘式', buyer: '已匯300', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511D', date: '2025-11-25', productGroupId: 'A14', productItemId: '02', quantity: 1, description: '吳銘式', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202511D', date: '2025-11-25', productGroupId: 'A14', productItemId: '02', quantity: 1, description: '柯孟愷', buyer: '', remarks: '', note: '' },

  // 202512E Items
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A00', productItemId: '01', quantity: 88, description: '自已吸收', buyer: '陳禹辰', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A00', productItemId: '01', quantity: 88, description: '自已吸收', buyer: '陳禹辰', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '01', quantity: 1, description: '陳禹辰', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '01', quantity: 2, description: '曲一', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '01', quantity: 1, description: '紀思妤', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '02', quantity: 1, description: '紀思妤', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '01', quantity: 1, description: '李姿葶', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '01', quantity: 2, description: 'Yuqing Zeng', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '01', quantity: 2, description: 'Egg Liao', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '01', quantity: 2, description: '桓我扣扣', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '01', quantity: 1, description: '蕭小夜', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '02', quantity: 1, description: '蕭小夜', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '01', quantity: 1, description: '江依倢', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '02', quantity: 1, description: '江依倢', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '01', quantity: 7, description: 'Yurean Lin', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '02', quantity: 1, description: 'Yurean Lin', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '02', quantity: 1, description: '蔡沂潔', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A19', productItemId: '06', quantity: 4, description: '邱菀茹', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A18', productItemId: '07', quantity: 1, description: 'Yu Yu', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '02', quantity: 1, description: 'Ruey Yun Lu', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '05', quantity: 2, description: '林淑媛', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '03', quantity: 2, description: '陳孁', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A17', productItemId: '04', quantity: 1, description: '陳孁', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A19', productItemId: '06', quantity: 4, description: '韓允沫', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A19', productItemId: '06', quantity: 4, description: 'Ari Huang', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A19', productItemId: '02', quantity: 1, description: '夏生', buyer: '小櫻', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A19', productItemId: '06', quantity: 4, description: '蘇岑', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A19', productItemId: '05', quantity: 1, description: 'Amber Cheng', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A18', productItemId: '02', quantity: 1, description: '高杉', buyer: '伊沁', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A18', productItemId: '01', quantity: 1, description: '桂', buyer: '陳嘎嘎', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A18', productItemId: '01', quantity: 1, description: '神威', buyer: '吳佳芳', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A18', productItemId: '08', quantity: 2, description: '', buyer: '吳佳芳', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A18', productItemId: '02', quantity: 1, description: '總悟', buyer: '黃先到', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A18', productItemId: '02', quantity: 1, description: '新八', buyer: '黃先到', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A18', productItemId: '07', quantity: 1, description: '', buyer: '黃先到', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A18', productItemId: '02', quantity: 1, description: '高杉', buyer: 'Betty Lin', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A18', productItemId: '08', quantity: 6, description: 'Ari Huang', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A19', productItemId: '06', quantity: 4, description: 'Yu Han', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512E', date: '2025-12-28', productGroupId: 'A18', productItemId: '01', quantity: 1, description: '桂', buyer: 'しろ', remarks: '', note: '' },

  // 202512F Items
  { id: generateUUID(), orderGroupId: '202512F', date: '2025-12-28', productGroupId: 'A21', productItemId: '06', quantity: 2, description: '孫偉竣', buyer: '', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512F', date: '2025-12-28', productGroupId: 'A21', productItemId: '03', quantity: 1, description: '七草夜守款', buyer: '戴雅軒', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512F', date: '2025-12-28', productGroupId: 'A21', productItemId: '04', quantity: 1, description: '七草款', buyer: '戴雅軒', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512F', date: '2025-12-28', productGroupId: 'A21', productItemId: '01', quantity: 2, description: '10.13號', buyer: 'XuanYu Chen', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512F', date: '2025-12-28', productGroupId: 'A21', productItemId: '02', quantity: 1, description: '七草款', buyer: 'XuanYu Chen', remarks: '', note: '' },
  { id: generateUUID(), orderGroupId: '202512F', date: '2025-12-28', productGroupId: 'A21', productItemId: '03', quantity: 1, description: '七草夜守款', buyer: 'XuanYu Chen', remarks: '', note: '' },
];
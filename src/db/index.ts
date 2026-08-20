// netProfit = totalRevenue - totalCOGS - totalWasteCost
// Decision: wasteCost is included as real operational expense
// Last updated: 2026-08-14
import Dexie, { type Table } from 'dexie';
import type { Ingredient, MenuItem, DailySalesRecord, WasteLog, AppSettings, PurchaseLog } from '../types';
import { formatJalali, normalizeDateStr } from '../lib/jalali';
import { roundCurrency } from '../lib/utils';
import { calculateMenuItemPricing } from '../lib/financial';

export class RestaurantDatabase extends Dexie {
  ingredients!: Table<Ingredient, number>;
  menuItems!: Table<MenuItem, number>;
  dailySales!: Table<DailySalesRecord, number>;
  wasteLogs!: Table<WasteLog, number>;
  settings!: Table<AppSettings, string>;
  purchaseLogs!: Table<PurchaseLog, number>;

  constructor() {
    super('RestaurantFinancialDB');
    this.version(1).stores({
      ingredients: '++id, name, category, unit, currentStock',
      menuItems: '++id, name, category, sellingPrice, portionCost, primeCost',
      dailySales: '++id, date, totalRevenue, createdAt',
      wasteLogs: '++id, date, itemName, createdAt',
      settings: 'id',
    });

    this.version(2).stores({
      ingredients: '++id, name, category, unit, currentStock',
      menuItems: '++id, name, category, sellingPrice, portionCost, primeCost',
      dailySales: '++id, date, totalRevenue, createdAt',
      wasteLogs: '++id, date, itemName, createdAt',
      settings: 'id',
      purchaseLogs: '++id, ingredientId, date',
    }).upgrade(async (tx) => {
      const ingredients = await tx.table('ingredients').toArray();
      const todayIso = formatJalali(new Date(), 'iso');
      const logs = ingredients.map((ing: any) => {
        const qty = ing.totalQuantity && ing.totalQuantity > 0 ? ing.totalQuantity : (ing.currentStock || 1);
        const totalPrice = ing.totalPrice && ing.totalPrice > 0 ? ing.totalPrice : (ing.unitCost || 0) * qty;
        const uCost = ing.unitCost || (qty > 0 ? Math.round(totalPrice / qty) : 0);
        return {
          ingredientId: ing.id,
          date: ing.updatedAt ? ing.updatedAt.slice(0, 10) : todayIso,
          quantity: qty,
          totalPrice: totalPrice,
          unitCost: uCost,
          reason: 'purchase' as const,
          note: 'سابقه اولیه خریدهای سیستم',
          createdAt: ing.updatedAt || new Date().toISOString(),
        };
      });
      if (logs.length > 0) {
        await tx.table('purchaseLogs').bulkAdd(logs);
      }
    });
  }
}

export const db = new RestaurantDatabase();

// Central Recalculation Engine: Syncs all menu items & daily sales when ingredients change
export async function syncAndRecalculateAllData(): Promise<void> {
  const ingredients = await db.ingredients.toArray();
  const menuItems = await db.menuItems.toArray();
  const settingsList = await db.settings.toArray();
  const settings = settingsList[0] || DEFAULT_SETTINGS;
  const targetFoodCostPercent = settings.targetFoodCostPercent || 35;

  const ingredientMap = new Map<number, Ingredient>();
  ingredients.forEach((ing) => {
    if (ing.id !== undefined) ingredientMap.set(Number(ing.id), ing);
  });

  const updatedMenuItems: MenuItem[] = [];

  for (const item of menuItems) {
    let materialCost = 0;
    const updatedIngredients = (item.ingredients || []).map((ri) => {
      const ingId = Number(ri.ingredientId);
      let ing = ingredientMap.get(ingId);
      if (!ing && ri.ingredientName) {
        ing = ingredients.find((i) => i.name.trim().toLowerCase() === ri.ingredientName.trim().toLowerCase());
      }

      if (ing) {
        const cost = roundCurrency(ri.quantity * ing.unitCost);
        materialCost += cost;
        return {
          ...ri,
          ingredientId: ing.id || ingId,
          ingredientName: ing.name,
          unit: ing.unit,
          unitCost: ing.unitCost,
          cost,
        };
      } else {
        materialCost += ri.cost || 0;
        return ri;
      }
    });

    const pricing = calculateMenuItemPricing({
      materialCost,
      wastePercent: item.wastePercent,
      laborCost: item.laborCost,
      packagingCost: item.packagingCost,
      sellingPrice: item.sellingPrice,
      targetFoodCostPercent,
    });

    updatedMenuItems.push({
      ...item,
      ingredients: updatedIngredients,
      totalMaterialCost: pricing.totalMaterialCost,
      foodCost: pricing.foodCost,
      portionCost: pricing.portionCost,
      primeCost: pricing.primeCost,
      targetPrice: pricing.targetPrice,
      grossProfit: pricing.grossProfit,
      marginPercent: pricing.marginPercent,
      updatedAt: new Date().toISOString(),
    });
  }

  if (updatedMenuItems.length > 0) {
    await db.menuItems.bulkPut(updatedMenuItems);
  }

  // Recalculate Daily Sales records with updated COGS (pure food cost) and direct labor tracking
  const menuItemMap = new Map<number, MenuItem>();
  updatedMenuItems.forEach((mi) => {
    if (mi.id !== undefined) menuItemMap.set(Number(mi.id), mi);
  });

  const wasteLogs = await db.wasteLogs.toArray();
  const wasteMap = new Map<string, number>();
  wasteLogs.forEach((w) => {
    const cleanD = normalizeDateStr(w.date || '');
    wasteMap.set(cleanD, (wasteMap.get(cleanD) || 0) + (w.cost || 0));
  });

  const dailySales = await db.dailySales.toArray();
  const updatedSalesRecords: DailySalesRecord[] = [];

  for (const sale of dailySales) {
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalLaborCost = 0;
    const updatedItems = (sale.items || []).map((sItem) => {
      const miId = Number(sItem.menuItemId);
      let mi = menuItemMap.get(miId);
      if (!mi && sItem.menuItemName) {
        mi = updatedMenuItems.find((m) => m.name.trim().toLowerCase() === sItem.menuItemName.trim().toLowerCase());
      }

      // COGS is pure Food Cost (materials + recipe waste)
      const unitCost = mi ? (mi.foodCost ?? mi.totalMaterialCost ?? sItem.unitCost) : sItem.unitCost;
      const unitLaborCost = mi ? (mi.laborCost || 0) : (sItem.unitLaborCost || 0);
      const totalRev = roundCurrency(sItem.quantity * sItem.unitSellingPrice);
      const totalCost = roundCurrency(sItem.quantity * unitCost);
      const totalLabor = roundCurrency(sItem.quantity * unitLaborCost);

      totalRevenue += totalRev;
      totalCOGS += totalCost;
      totalLaborCost += totalLabor;

      const ingredientsSnapshot = sItem.ingredientsSnapshot && sItem.ingredientsSnapshot.length > 0
        ? sItem.ingredientsSnapshot
        : (mi?.ingredients || []).map((ri) => ({
            ingredientId: Number(ri.ingredientId),
            ingredientName: ri.ingredientName,
            unit: ri.unit,
            quantityPerPortion: ri.quantity || 0,
            totalQuantity: (ri.quantity || 0) * Number(sItem.quantity),
            unitCost: ri.unitCost || 0,
          }));

      return {
        ...sItem,
        menuItemId: mi?.id || miId,
        unitCost,
        unitLaborCost,
        totalRevenue: totalRev,
        totalCost,
        totalLaborCost: totalLabor,
        ingredientsSnapshot,
      };
    });

    const cleanSaleDate = normalizeDateStr(sale.date || '');
    const totalWasteCost = wasteMap.get(cleanSaleDate) || 0;
    const netProfit = roundCurrency(totalRevenue - totalCOGS - totalWasteCost);

    updatedSalesRecords.push({
      ...sale,
      items: updatedItems,
      totalRevenue,
      totalCOGS,
      totalLaborCost,
      totalWasteCost,
      netProfit,
    });
  }

  if (updatedSalesRecords.length > 0) {
    await db.dailySales.bulkPut(updatedSalesRecords);
  }
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  id: 'config',
  restaurantName: 'مجموعه من',
  businessType: 'کافه رستوران',
  contactPhone: '',
  address: '',
  workingDaysPerMonth: 26,
  dailyWorkHours: 8,
  holidaysCount: 4,
  monthlyFixedCosts: {
    rent: 0,
    utilities: 0,
    salaries: 0,
    marketing: 0,
    insurance: 0,
    general: 0,
    maintenance: 0,
    delivery: 0,
  },
  targetFoodCostPercent: 35, // 35%
  taxPercent: 9,
  currencyUnit: 'toman',
  defaultLowStockThreshold: 5,
  defaultRecipeWastePercent: 3,
  highFoodCostThreshold: 40,
  isSetupCompleted: false,
};

// Database Export to JSON Blob
export async function exportDatabaseJSON(): Promise<Blob> {
  const ingredients = await db.ingredients.toArray();
  const menuItems = await db.menuItems.toArray();
  const dailySales = await db.dailySales.toArray();
  const wasteLogs = await db.wasteLogs.toArray();
  const settings = await db.settings.toArray();
  const purchaseLogs = await db.purchaseLogs.toArray();

  const exportData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      ingredients,
      menuItems,
      dailySales,
      wasteLogs,
      settings,
      purchaseLogs,
    },
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  return new Blob([jsonString], { type: 'application/json' });
}

function isValidNumber(val: any): boolean {
  return typeof val === 'number' && Number.isFinite(val);
}

function isNonEmptyString(val: any): boolean {
  return typeof val === 'string' && val.trim().length > 0;
}

function validateIngredientRecord(item: any, index: number): void {
  if (!item || typeof item !== 'object') {
    throw new Error(`رکورد ماده اولیه شماره ${index + 1} نامعتبر است.`);
  }
  if (!isNonEmptyString(item.name)) {
    throw new Error(`نام ماده اولیه در رکورد شماره ${index + 1} خالی یا نامعتبر است.`);
  }
  const numFields = ['totalPrice', 'totalQuantity', 'unitCost', 'minimumStock', 'currentStock'];
  for (const field of numFields) {
    if (item[field] !== undefined && !isValidNumber(item[field])) {
      throw new Error(`فیلد عددی ${field} در ماده اولیه "${item.name}" نامعتبر است.`);
    }
  }
}

function validateMenuItemRecord(item: any, index: number): void {
  if (!item || typeof item !== 'object') {
    throw new Error(`رکورد آیتم منو شماره ${index + 1} نامعتبر است.`);
  }
  if (!isNonEmptyString(item.name)) {
    throw new Error(`نام آیتم منو در رکورد شماره ${index + 1} خالی یا نامعتبر است.`);
  }
  const numFields = ['sellingPrice', 'wastePercent', 'laborCost', 'packagingCost', 'totalMaterialCost', 'foodCost', 'portionCost', 'primeCost', 'targetPrice', 'marginPercent', 'grossProfit'];
  for (const field of numFields) {
    if (item[field] !== undefined && !isValidNumber(item[field])) {
      throw new Error(`فیلد عددی ${field} در آیتم منو "${item.name}" نامعتبر است.`);
    }
  }
  if (item.ingredients !== undefined && !Array.isArray(item.ingredients)) {
    throw new Error(`لیست ترکیبات آیتم منو "${item.name}" ساختار نامعتبر دارد.`);
  }
  if (Array.isArray(item.ingredients)) {
    item.ingredients.forEach((ing: any, ingIdx: number) => {
      if (!ing || typeof ing !== 'object') {
        throw new Error(`ترکیب شماره ${ingIdx + 1} در آیتم منو "${item.name}" نامعتبر است.`);
      }
      if (ing.ingredientId !== undefined && !isValidNumber(ing.ingredientId)) {
        throw new Error(`شناسه ماده اولیه در ترکیب شماره ${ingIdx + 1} آیتم منو "${item.name}" نامعتبر است.`);
      }
      const ingNumFields = ['quantity', 'unitCost', 'cost'];
      for (const field of ingNumFields) {
        if (ing[field] !== undefined && !isValidNumber(ing[field])) {
          throw new Error(`فیلد عددی ${field} در ترکیب شماره ${ingIdx + 1} آیتم منو "${item.name}" نامعتبر است.`);
        }
      }
    });
  }
}

function validateDailySaleRecord(item: any, index: number): void {
  if (!item || typeof item !== 'object') {
    throw new Error(`رکورد گزارش فروش شماره ${index + 1} نامعتبر است.`);
  }
  if (!isNonEmptyString(item.date)) {
    throw new Error(`تاریخ در گزارش فروش شماره ${index + 1} خالی یا نامعتبر است.`);
  }
  const numFields = ['totalRevenue', 'totalCOGS', 'totalWasteCost', 'netProfit'];
  for (const field of numFields) {
    if (item[field] !== undefined && !isValidNumber(item[field])) {
      throw new Error(`فیلد عددی ${field} در گزارش فروش تاریخ ${item.date} نامعتبر است.`);
    }
  }
}

function validateWasteLogRecord(item: any, index: number): void {
  if (!item || typeof item !== 'object') {
    throw new Error(`رکورد گزارش ضایعات شماره ${index + 1} نامعتبر است.`);
  }
  if (!isNonEmptyString(item.itemName)) {
    throw new Error(`نام آیتم ضایعات در رکورد شماره ${index + 1} خالی یا نامعتبر است.`);
  }
  const numFields = ['quantity', 'cost'];
  for (const field of numFields) {
    if (item[field] !== undefined && !isValidNumber(item[field])) {
      throw new Error(`فیلد عددی ${field} در ضایعات "${item.itemName}" نامعتبر است.`);
    }
  }
}

function validatePurchaseLogRecord(item: any, index: number): void {
  if (!item || typeof item !== 'object') {
    throw new Error(`رکورد خرید شماره ${index + 1} نامعتبر است.`);
  }
  if (item.ingredientId === undefined || !isValidNumber(item.ingredientId)) {
    throw new Error(`شناسه ماده اولیه در خرید شماره ${index + 1} نامعتبر است.`);
  }
  const numFields = ['quantity', 'totalPrice', 'unitCost'];
  for (const field of numFields) {
    if (item[field] === undefined || !isValidNumber(item[field])) {
      throw new Error(`فیلد عددی ${field} در خرید شماره ${index + 1} نامعتبر یا خالی است.`);
    }
  }
  if (!isNonEmptyString(item.date)) {
    throw new Error(`تاریخ در خرید شماره ${index + 1} خالی یا نامعتبر است.`);
  }
}

function validateSettingsRecord(item: any, index: number): void {
  if (!item || typeof item !== 'object') {
    throw new Error(`تنظیمات نامعتبر است.`);
  }
  const numFields = ['workingDaysPerMonth', 'dailyWorkHours', 'holidaysCount', 'targetFoodCostPercent', 'taxPercent', 'defaultLowStockThreshold', 'defaultRecipeWastePercent', 'highFoodCostThreshold'];
  for (const field of numFields) {
    if (item[field] !== undefined && !isValidNumber(item[field])) {
      throw new Error(`فیلد عددی ${field} در تنظیمات نامعتبر است.`);
    }
  }
  if (item.monthlyFixedCosts !== undefined) {
    if (typeof item.monthlyFixedCosts !== 'object') {
      throw new Error(`هزینه‌های ثابت ماهانه در تنظیمات نامعتبر است.`);
    }
    const costFields = ['rent', 'utilities', 'salaries', 'marketing', 'insurance', 'general', 'maintenance', 'delivery'];
    for (const cField of costFields) {
      if (item.monthlyFixedCosts[cField] !== undefined && !isValidNumber(item.monthlyFixedCosts[cField])) {
        throw new Error(`هزینه ثابت ${cField} در تنظیمات نامعتبر است.`);
      }
    }
  }
}

function truncateStringFields<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== 'object') return record;
  const copy: Record<string, any> = { ...record };
  const targetFields = ['name', 'notes', 'reason', 'itemName', 'category'];
  for (const field of targetFields) {
    if (typeof copy[field] === 'string' && copy[field].length > 500) {
      copy[field] = copy[field].slice(0, 500);
    }
  }
  if (Array.isArray(copy.items)) {
    copy.items = copy.items.map((item: any) => truncateStringFields(item));
  }
  if (Array.isArray(copy.ingredients)) {
    copy.ingredients = copy.ingredients.map((ing: any) => truncateStringFields(ing));
  }
  return copy as T;
}

// Database Import from JSON Blob
export async function importDatabaseJSON(blob: Blob): Promise<void> {
  const text = await blob.text();
  const parsed = JSON.parse(text);

  let ingredientsToImport: any[] = [];
  let menuItemsToImport: any[] = [];
  let dailySalesToImport: any[] = [];
  let wasteLogsToImport: any[] = [];
  let settingsToImport: any[] = [];
  let purchaseLogsToImport: any[] = [];

  if (parsed.data) {
    if (Array.isArray(parsed.data.ingredients)) ingredientsToImport = parsed.data.ingredients;
    if (Array.isArray(parsed.data.menuItems)) menuItemsToImport = parsed.data.menuItems;
    if (Array.isArray(parsed.data.dailySales)) dailySalesToImport = parsed.data.dailySales;
    if (Array.isArray(parsed.data.wasteLogs)) wasteLogsToImport = parsed.data.wasteLogs;
    if (Array.isArray(parsed.data.settings)) settingsToImport = parsed.data.settings;
    if (Array.isArray(parsed.data.purchaseLogs)) purchaseLogsToImport = parsed.data.purchaseLogs;
  } else if (parsed.tables && Array.isArray(parsed.tables)) {
    for (const table of parsed.tables) {
      if (table.name === 'ingredients' && Array.isArray(table.rows)) ingredientsToImport = table.rows;
      else if (table.name === 'menuItems' && Array.isArray(table.rows)) menuItemsToImport = table.rows;
      else if (table.name === 'dailySales' && Array.isArray(table.rows)) dailySalesToImport = table.rows;
      else if (table.name === 'wasteLogs' && Array.isArray(table.rows)) wasteLogsToImport = table.rows;
      else if (table.name === 'settings' && Array.isArray(table.rows)) settingsToImport = table.rows;
      else if (table.name === 'purchaseLogs' && Array.isArray(table.rows)) purchaseLogsToImport = table.rows;
    }
  }

  // Validate all records before clearing or writing to DB
  ingredientsToImport.forEach(validateIngredientRecord);
  menuItemsToImport.forEach(validateMenuItemRecord);
  dailySalesToImport.forEach(validateDailySaleRecord);
  wasteLogsToImport.forEach(validateWasteLogRecord);
  purchaseLogsToImport.forEach(validatePurchaseLogRecord);
  settingsToImport.forEach(validateSettingsRecord);

  // Truncate key string fields to prevent excessively long strings from polluting database
  const sanitizedIngredients = ingredientsToImport.map(truncateStringFields);
  const sanitizedMenuItems = menuItemsToImport.map(truncateStringFields);
  const sanitizedDailySales = dailySalesToImport.map(truncateStringFields);
  const sanitizedWasteLogs = wasteLogsToImport.map(truncateStringFields);
  const sanitizedSettings = settingsToImport.map(truncateStringFields);
  const sanitizedPurchaseLogs = purchaseLogsToImport.map(truncateStringFields);

  await db.transaction('rw', [db.ingredients, db.menuItems, db.dailySales, db.wasteLogs, db.settings, db.purchaseLogs], async () => {
    await db.ingredients.clear();
    await db.menuItems.clear();
    await db.dailySales.clear();
    await db.wasteLogs.clear();
    await db.settings.clear();
    await db.purchaseLogs.clear();

    if (sanitizedIngredients.length > 0) {
      await db.ingredients.bulkAdd(sanitizedIngredients);
    }
    if (sanitizedMenuItems.length > 0) {
      await db.menuItems.bulkAdd(sanitizedMenuItems);
    }
    if (sanitizedDailySales.length > 0) {
      await db.dailySales.bulkAdd(sanitizedDailySales);
    }
    if (sanitizedWasteLogs.length > 0) {
      await db.wasteLogs.bulkAdd(sanitizedWasteLogs);
    }
    if (sanitizedPurchaseLogs.length > 0) {
      await db.purchaseLogs.bulkAdd(sanitizedPurchaseLogs);
    }
    if (sanitizedSettings.length > 0) {
      await db.settings.bulkPut(sanitizedSettings);
    } else {
      await db.settings.put(DEFAULT_SETTINGS);
    }
  });

  await syncAndRecalculateAllData();
}

// Seed Demo Data for Restaurant & Cafe
export async function seedDemoData(): Promise<void> {
  await db.transaction('rw', [db.ingredients, db.menuItems, db.dailySales, db.wasteLogs, db.settings, db.purchaseLogs], async () => {
    // Clear existing
    await db.ingredients.clear();
    await db.menuItems.clear();
    await db.dailySales.clear();
    await db.wasteLogs.clear();
    await db.settings.clear();
    await db.purchaseLogs.clear();

    const todayIso = formatJalali(new Date(), 'iso');

    // 1. Demo Settings (isSetupCompleted: true is required so onboarding wizard is not triggered)
    const demoSettings: AppSettings = {
      id: 'config',
      restaurantName: 'کافه رستوران نمونه شمرون',
      businessType: 'کافه رستوران',
      contactPhone: '02122001122',
      address: 'تهران، خیابان فرشته، پلاک ۴۴',
      workingDaysPerMonth: 26,
      dailyWorkHours: 10,
      holidaysCount: 4,
      monthlyFixedCosts: {
        rent: 35000000,
        salaries: 48000000,
        utilities: 8500000,
        marketing: 6000000,
        insurance: 5500000,
        general: 4000000,
        maintenance: 3500000,
        delivery: 4500000,
      },
      targetFoodCostPercent: 32,
      taxPercent: 9,
      currencyUnit: 'toman',
      defaultLowStockThreshold: 5,
      defaultRecipeWastePercent: 3,
      highFoodCostThreshold: 38,
      isSetupCompleted: true,
    };

    await db.settings.put(demoSettings);

    // 2. Ingredients (مواد اولیه)
    const ing1 = await db.ingredients.add({
      name: 'گوشت راسته گوسفندی',
      category: 'پروتئین',
      unit: 'kg',
      totalPrice: 6500000, // 6.5M Toman for 10kg => 650,000 / kg
      totalQuantity: 10,
      unitCost: 650000,
      minimumStock: 5,
      currentStock: 18,
      updatedAt: new Date().toISOString(),
    });

    const ing2 = await db.ingredients.add({
      name: 'برنج ایرانی طارم',
      category: 'غلات',
      unit: 'kg',
      totalPrice: 1400000, // 1.4M for 10kg => 140,000 / kg
      totalQuantity: 10,
      unitCost: 140000,
      minimumStock: 25,
      currentStock: 60,
      updatedAt: new Date().toISOString(),
    });

    const ing3 = await db.ingredients.add({
      name: 'روغن حیوانی / کره',
      category: 'لبنیات و روغن',
      unit: 'kg',
      totalPrice: 380000,
      totalQuantity: 1,
      unitCost: 380000,
      minimumStock: 2,
      currentStock: 5,
      updatedAt: new Date().toISOString(),
    });

    const ing4 = await db.ingredients.add({
      name: 'پیاز سفید',
      category: 'صیفی‌جات',
      unit: 'kg',
      totalPrice: 250000,
      totalQuantity: 10,
      unitCost: 25000,
      minimumStock: 10,
      currentStock: 35,
      updatedAt: new Date().toISOString(),
    });

    const ing5 = await db.ingredients.add({
      name: 'دان قهوه 100% عربیکا',
      category: 'نوشیدنی و قهوه',
      unit: 'kg',
      totalPrice: 1200000,
      totalQuantity: 1,
      unitCost: 1200000,
      minimumStock: 3,
      currentStock: 8,
      updatedAt: new Date().toISOString(),
    });

    const ing6 = await db.ingredients.add({
      name: 'شیر تازه کم‌چرب',
      category: 'لبنیات و روغن',
      unit: 'liter',
      totalPrice: 350000,
      totalQuantity: 10,
      unitCost: 35000,
      minimumStock: 10,
      currentStock: 25,
      updatedAt: new Date().toISOString(),
    });

    const ing7 = await db.ingredients.add({
      name: 'پنیر موزارلا رنده شده',
      category: 'لبنیات و روغن',
      unit: 'kg',
      totalPrice: 2800000,
      totalQuantity: 10,
      unitCost: 280000,
      minimumStock: 4,
      currentStock: 12,
      updatedAt: new Date().toISOString(),
    });

    const ing8 = await db.ingredients.add({
      name: 'فیله مرغ تازه',
      category: 'پروتئین',
      unit: 'kg',
      totalPrice: 2200000,
      totalQuantity: 10,
      unitCost: 220000,
      minimumStock: 8,
      currentStock: 20,
      updatedAt: new Date().toISOString(),
    });

    // Seed initial purchase logs for demo ingredients
    const initialLogs = [
      { ingredientId: ing1, date: todayIso, quantity: 10, totalPrice: 6500000, unitCost: 650000, reason: 'purchase' as const, note: 'خرید اولیه گوشت راسته', createdAt: new Date().toISOString() },
      { ingredientId: ing2, date: todayIso, quantity: 10, totalPrice: 1400000, unitCost: 140000, reason: 'purchase' as const, note: 'خرید اولیه برنج طارم', createdAt: new Date().toISOString() },
      { ingredientId: ing3, date: todayIso, quantity: 1, totalPrice: 380000, unitCost: 380000, reason: 'purchase' as const, note: 'خرید اولیه روغن حیوانی', createdAt: new Date().toISOString() },
      { ingredientId: ing4, date: todayIso, quantity: 10, totalPrice: 250000, unitCost: 25000, reason: 'purchase' as const, note: 'خرید اولیه پیاز سفید', createdAt: new Date().toISOString() },
      { ingredientId: ing5, date: todayIso, quantity: 1, totalPrice: 1200000, unitCost: 1200000, reason: 'purchase' as const, note: 'خرید اولیه دان قهوه عربیکا', createdAt: new Date().toISOString() },
      { ingredientId: ing6, date: todayIso, quantity: 10, totalPrice: 350000, unitCost: 35000, reason: 'purchase' as const, note: 'خرید اولیه شیر تازه', createdAt: new Date().toISOString() },
      { ingredientId: ing7, date: todayIso, quantity: 10, totalPrice: 2800000, unitCost: 280000, reason: 'purchase' as const, note: 'خرید اولیه پنیر موزارلا', createdAt: new Date().toISOString() },
      { ingredientId: ing8, date: todayIso, quantity: 10, totalPrice: 2200000, unitCost: 220000, reason: 'purchase' as const, note: 'خرید اولیه فیله مرغ', createdAt: new Date().toISOString() },
    ];
    await db.purchaseLogs.bulkAdd(initialLogs);

    // 3. Menu Items (آیتم‌های منو و فرمول ساخت)
    // Item 1: چلو کباب کوبیده مخصوص
    // Recipe: 0.25kg گوشت (162,500), 0.25kg برنج (35,000), 0.05kg پیاز (1,250), 0.02kg کره (7,600) = 206,350 Toman material
    const item1MatCost = 0.25 * 650000 + 0.25 * 140000 + 0.05 * 25000 + 0.02 * 380000; // 206,350
    const item1FoodCost = item1MatCost + item1MatCost * 0.05; // 216,668 Toman pure food cost
    const item1PortionCost = item1FoodCost + 15000 + 10000; // + labor 15k + pack 10k = 241,667 Toman
    const item1Price = 380000; // Selling price: 380,000 Toman

    await db.menuItems.add({
      name: 'چلو کباب کوبیده مخصوص',
      category: 'غذای اصلی',
      sellingPrice: item1Price,
      wastePercent: 5,
      ingredients: [
        { ingredientId: ing1, ingredientName: 'گوشت راسته گوسفندی', quantity: 0.25, unitCost: 650000, cost: 162500 },
        { ingredientId: ing2, ingredientName: 'برنج ایرانی طارم', quantity: 0.25, unitCost: 140000, cost: 35000 },
        { ingredientId: ing4, ingredientName: 'پیاز سفید', quantity: 0.05, unitCost: 25000, cost: 1250 },
        { ingredientId: ing3, ingredientName: 'روغن حیوانی / کره', quantity: 0.02, unitCost: 380000, cost: 7600 },
      ],
      laborCost: 15000,
      packagingCost: 10000,
      totalMaterialCost: Math.round(item1MatCost),
      foodCost: Math.round(item1FoodCost),
      portionCost: Math.round(item1PortionCost),
      primeCost: Math.round(item1PortionCost),
      targetPrice: Math.round(item1FoodCost / 0.35),
      grossProfit: Math.round(item1Price - item1PortionCost),
      marginPercent: Math.round(((item1Price - item1PortionCost) / item1Price) * 100),
      popularityScore: 85,
      salesVolume30Days: 420,
      matrixCategory: 'star',
      updatedAt: new Date().toISOString(),
    });

    // Item 2: پاستا آلفردو با مرغ
    const item2MatCost = 0.15 * 220000 + 0.1 * 280000 + 0.05 * 35000; // 33000 + 28000 + 1750 = 62,750 Toman
    const item2FoodCost = item2MatCost + item2MatCost * 0.03; // 64,632 Toman pure food cost
    const item2PortionCost = item2FoodCost + 12000 + 8000; // = 84,632 Toman
    const item2Price = 240000; // 240,000 Toman

    await db.menuItems.add({
      name: 'پاستا آلفردو مرغ',
      category: 'غذای اصلی',
      sellingPrice: item2Price,
      wastePercent: 3,
      ingredients: [
        { ingredientId: ing8, ingredientName: 'فیله مرغ تازه', quantity: 0.15, unitCost: 220000, cost: 33000 },
        { ingredientId: ing7, ingredientName: 'پنیر موزارلا رنده شده', quantity: 0.1, unitCost: 280000, cost: 28000 },
        { ingredientId: ing6, ingredientName: 'شیر تازه کم‌چرب', quantity: 0.05, unitCost: 35000, cost: 1750 },
      ],
      laborCost: 12000,
      packagingCost: 8000,
      totalMaterialCost: Math.round(item2MatCost),
      foodCost: Math.round(item2FoodCost),
      portionCost: Math.round(item2PortionCost),
      primeCost: Math.round(item2PortionCost),
      targetPrice: Math.round(item2FoodCost / 0.35),
      grossProfit: Math.round(item2Price - item2PortionCost),
      marginPercent: Math.round(((item2Price - item2PortionCost) / item2Price) * 100),
      popularityScore: 78,
      salesVolume30Days: 310,
      matrixCategory: 'star',
      updatedAt: new Date().toISOString(),
    });

    // Item 3: کاپوچینو دوبل
    const item3MatCost = 0.02 * 1200000 + 0.15 * 35000; // 24000 + 5250 = 29,250 Toman
    const item3FoodCost = item3MatCost;
    const item3PortionCost = item3FoodCost + 5000 + 3000; // = 37,250 Toman
    const item3Price = 85000; // 85,000 Toman

    await db.menuItems.add({
      name: 'کاپوچینو دوبل اسپشالیتی',
      category: 'کافه و گرم',
      sellingPrice: item3Price,
      wastePercent: 2,
      ingredients: [
        { ingredientId: ing5, ingredientName: 'دان قهوه 100% عربیکا', quantity: 0.02, unitCost: 1200000, cost: 24000 },
        { ingredientId: ing6, ingredientName: 'شیر تازه کم‌چرب', quantity: 0.15, unitCost: 35000, cost: 5250 },
      ],
      laborCost: 5000,
      packagingCost: 3000,
      totalMaterialCost: Math.round(item3MatCost),
      foodCost: Math.round(item3FoodCost),
      portionCost: Math.round(item3PortionCost),
      primeCost: Math.round(item3PortionCost),
      targetPrice: Math.round(item3FoodCost / 0.35),
      grossProfit: Math.round(item3Price - item3PortionCost),
      marginPercent: Math.round(((item3Price - item3PortionCost) / item3Price) * 100),
      popularityScore: 92,
      salesVolume30Days: 650,
      matrixCategory: 'workhorse',
      updatedAt: new Date().toISOString(),
    });

    // Item 4: اسپرسو سینگل
    const item4MatCost = 0.01 * 1200000; // 12,000 Toman
    const item4FoodCost = item4MatCost;
    const item4PortionCost = item4FoodCost + 3000 + 1500; // 16,500 Toman
    const item4Price = 55000;

    await db.menuItems.add({
      name: 'اسپرسو سینگل سینگل اورجین',
      category: 'کافه و گرم',
      sellingPrice: item4Price,
      wastePercent: 1,
      ingredients: [
        { ingredientId: ing5, ingredientName: 'دان قهوه 100% عربیکا', quantity: 0.01, unitCost: 1200000, cost: 12000 },
      ],
      laborCost: 3000,
      packagingCost: 1500,
      totalMaterialCost: Math.round(item4MatCost),
      foodCost: Math.round(item4FoodCost),
      portionCost: Math.round(item4PortionCost),
      primeCost: Math.round(item4PortionCost),
      targetPrice: Math.round(item4FoodCost / 0.35),
      grossProfit: Math.round(item4Price - item4PortionCost),
      marginPercent: Math.round(((item4Price - item4PortionCost) / item4Price) * 100),
      popularityScore: 60,
      salesVolume30Days: 190,
      matrixCategory: 'puzzle',
      updatedAt: new Date().toISOString(),
    });

    // 4. Sample Daily Sales for the past few days
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const formattedDate = formatJalali(d, 'iso');

      const q1 = Math.floor(15 + Math.random() * 20);
      const q2 = Math.floor(10 + Math.random() * 15);
      const q3 = Math.floor(25 + Math.random() * 30);
      const q4 = Math.floor(12 + Math.random() * 18);

      const rev1 = q1 * item1Price;
      const cogs1 = q1 * Math.round(item1FoodCost);
      const labor1 = q1 * 15000;
      const rev2 = q2 * item2Price;
      const cogs2 = q2 * Math.round(item2FoodCost);
      const labor2 = q2 * 12000;
      const rev3 = q3 * item3Price;
      const cogs3 = q3 * Math.round(item3FoodCost);
      const labor3 = q3 * 5000;
      const rev4 = q4 * item4Price;
      const cogs4 = q4 * Math.round(item4FoodCost);
      const labor4 = q4 * 3000;

      const totalRevenue = rev1 + rev2 + rev3 + rev4;
      const totalCOGS = cogs1 + cogs2 + cogs3 + cogs4;
      const totalLaborCost = labor1 + labor2 + labor3 + labor4;
      const totalWasteCost = Math.round(totalRevenue * 0.02);
      const netProfit = totalRevenue - totalCOGS - totalWasteCost - 4500000; // daily overhead ~4.5M

      await db.dailySales.add({
        date: formattedDate,
        items: [
          { menuItemId: 1, menuItemName: 'چلو کباب کوبیده مخصوص', quantity: q1, unitSellingPrice: item1Price, unitCost: Math.round(item1FoodCost), unitLaborCost: 15000, totalRevenue: rev1, totalCost: cogs1, totalLaborCost: labor1 },
          { menuItemId: 2, menuItemName: 'پاستا آلفردو مرغ', quantity: q2, unitSellingPrice: item2Price, unitCost: Math.round(item2FoodCost), unitLaborCost: 12000, totalRevenue: rev2, totalCost: cogs2, totalLaborCost: labor2 },
          { menuItemId: 3, menuItemName: 'کاپوچینو دوبل اسپشالیتی', quantity: q3, unitSellingPrice: item3Price, unitCost: Math.round(item3FoodCost), unitLaborCost: 5000, totalRevenue: rev3, totalCost: cogs3, totalLaborCost: labor3 },
          { menuItemId: 4, menuItemName: 'اسپرسو سینگل سینگل اورجین', quantity: q4, unitSellingPrice: item4Price, unitCost: Math.round(item4FoodCost), unitLaborCost: 3000, totalRevenue: rev4, totalCost: cogs4, totalLaborCost: labor4 },
        ],
        totalRevenue,
        totalCOGS,
        totalLaborCost,
        totalWasteCost,
        netProfit,
        notes: `فروش ثبت شده روزانه - ${formattedDate}`,
        createdAt: d.toISOString(),
      });
    }

    // 5. Sample Waste log
    await db.wasteLogs.add({
      date: formatJalali(today, 'iso'),
      itemName: 'برنج طارم',
      quantity: 1.5,
      unit: 'کیلوگرم',
      cost: 210000,
      reason: 'سوختگی در پخت اولیه ته دیگ',
      createdAt: new Date().toISOString(),
    });
  });

  await syncAndRecalculateAllData();
}

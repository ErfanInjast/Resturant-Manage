import { db, syncAndRecalculateAllData } from '../db';
import type { PurchaseLog, DailySalesRecord, MenuItem, WasteLog } from '../types';
import { normalizeDateStr, parseJalaliStringToGregorianStrict } from './jalali';

export type TimelineEventType = 'purchase' | 'adjustment' | 'sale_consumption' | 'waste_consumption';

const TYPE_PRIORITY: Record<TimelineEventType, number> = {
  purchase: 1,
  adjustment: 2,
  waste_consumption: 3,
  sale_consumption: 4,
};

/**
 * Accurately calculates a comparable Gregorian epoch millisecond timestamp for any timeline event.
 * Handles Jalali dates, Gregorian dates, and ISO createdAt timestamps.
 * 
 * Default time-of-day:
 * - 'purchase': 08:00:00 (inventory received at start of day)
 * - 'adjustment': 08:30:00 (stock count audit)
 * - 'waste_consumption': 23:59:50 (kitchen waste recorded)
 * - 'sale_consumption': 23:59:59 (daily sales tally consumed at end of day)
 */
export function getTimelineEventTimestamp(
  dateStr?: string | null,
  createdAt?: string | null,
  eventType: TimelineEventType = 'purchase'
): number {
  // 1. Check if createdAt is a full, valid Gregorian ISO timestamp (e.g. "2026-08-19T14:23:11.123Z")
  if (createdAt && typeof createdAt === 'string') {
    const cleanCreatedAt = createdAt.trim();
    // Only trust ISO string if it does NOT start with a Jalali year (1300-1500)
    const jalaliPrefixMatch = cleanCreatedAt.match(/^(1[34]\d{2})/);
    if (!jalaliPrefixMatch) {
      const parsedMs = Date.parse(cleanCreatedAt);
      if (!isNaN(parsedMs)) {
        const year = new Date(parsedMs).getFullYear();
        if (year >= 1900 && year <= 2200) {
          return parsedMs;
        }
      }
    }
  }

  // 2. Parse dateStr into Gregorian Date
  let baseDate: Date | null = null;
  if (dateStr) {
    baseDate = parseJalaliStringToGregorianStrict(dateStr);
    if (!baseDate) {
      const clean = normalizeDateStr(dateStr);
      const match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const d = parseInt(match[3], 10);
        if (y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          baseDate = new Date(y, m - 1, d);
        }
      }
    }
  }

  if (!baseDate || isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  // Determine hours, minutes, seconds based on event type
  let hours = 8;
  let minutes = 0;
  let seconds = 0;
  let milliseconds = 0;

  if (eventType === 'sale_consumption') {
    hours = 23;
    minutes = 59;
    seconds = 59;
  } else if (eventType === 'waste_consumption') {
    hours = 23;
    minutes = 59;
    seconds = 50;
  } else if (eventType === 'adjustment') {
    hours = 8;
    minutes = 30;
    seconds = 0;
  } else {
    // purchase
    hours = 8;
    minutes = 0;
    seconds = 0;
  }

  // If createdAt contains explicit time (e.g. "T14:23:11" or "14:23:11"), extract it
  if (createdAt && typeof createdAt === 'string') {
    const timeMatch = createdAt.match(/[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      milliseconds = timeMatch[4] ? parseInt(timeMatch[4].slice(0, 3), 10) : 0;
    }
  }

  const d = new Date(baseDate);
  d.setHours(hours, minutes, seconds, milliseconds);
  return d.getTime();
}

/**
 * Perpetual / Moving Weighted Average Cost (WAC) calculator from Purchase Logs.
 * Respects stock movements and re-averages cost based on stock on hand at the time of each purchase.
 */
export function calculateWACFromLogs(logs: PurchaseLog[]): {
  unitCost: number;
  totalPurchasedQuantity: number;
  totalPurchasedPrice: number;
} {
  if (!logs || logs.length === 0) {
    return { unitCost: 0, totalPurchasedQuantity: 0, totalPurchasedPrice: 0 };
  }

  // Sort chronologically using real epoch timestamps
  const sorted = [...logs].sort((a, b) => {
    const tsA = getTimelineEventTimestamp(a.date, a.createdAt, a.reason === 'purchase' ? 'purchase' : 'adjustment');
    const tsB = getTimelineEventTimestamp(b.date, b.createdAt, b.reason === 'purchase' ? 'purchase' : 'adjustment');
    if (tsA !== tsB) return tsA - tsB;
    return (a.id || 0) - (b.id || 0);
  });

  let runningStock = 0;
  let runningUnitCost = 0;
  let totalPurchasedQuantity = 0;
  let totalPurchasedPrice = 0;

  for (const log of sorted) {
    const qty = log.quantity || 0;
    if (qty === 0) continue;

    if (log.reason === 'purchase') {
      const itemTotalPrice = log.totalPrice || 0;
      const itemUnitCost = log.unitCost || (qty > 0 ? itemTotalPrice / qty : 0);

      totalPurchasedQuantity += qty;
      totalPurchasedPrice += itemTotalPrice;

      // Perpetual moving average: if stock is 0 or negative, new cost replaces current cost
      if (runningStock <= 0) {
        runningUnitCost = itemUnitCost;
        runningStock = qty;
      } else {
        const newUnitCost = (runningStock * runningUnitCost + qty * itemUnitCost) / (runningStock + qty);
        runningStock += qty;
        runningUnitCost = newUnitCost;
      }
    } else if (log.reason === 'adjustment') {
      // Stock count adjustments modify quantity on hand without affecting unit cost
      runningStock = Math.max(0, runningStock + qty);
    }
  }

  return {
    unitCost: Math.round(runningUnitCost),
    totalPurchasedQuantity,
    totalPurchasedPrice,
  };
}

/**
 * Perpetual Moving Weighted Average Cost with sales consumption and waste depletion.
 */
export function calculatePerpetualWAC({
  logs,
  salesRecords = [],
  menuItems = [],
  wasteLogs = [],
  ingredientId,
  initialUnitCost = 0,
}: {
  logs: PurchaseLog[];
  salesRecords?: DailySalesRecord[];
  menuItems?: MenuItem[];
  wasteLogs?: WasteLog[];
  ingredientId: number;
  initialUnitCost?: number;
}): {
  unitCost: number;
  currentStock: number;
  totalPurchasedQuantity: number;
  totalPurchasedPrice: number;
} {
  type TimelineEvent = {
    date: string;
    createdAt: string;
    type: TimelineEventType;
    timestamp: number;
    qty: number;
    unitPrice?: number;
    totalPrice?: number;
  };

  const events: TimelineEvent[] = [];

  // 1. Purchase and adjustment events
  logs
    .filter((l) => l.ingredientId === ingredientId)
    .forEach((log) => {
      const eventType: TimelineEventType = log.reason === 'purchase' ? 'purchase' : 'adjustment';
      const cleanDate = normalizeDateStr(log.date);
      events.push({
        date: cleanDate,
        createdAt: log.createdAt || '',
        type: eventType,
        timestamp: getTimelineEventTimestamp(cleanDate, log.createdAt, eventType),
        qty: log.quantity || 0,
        unitPrice: log.unitCost || (log.quantity > 0 ? (log.totalPrice || 0) / log.quantity : 0),
        totalPrice: log.totalPrice || 0,
      });
    });

  // Map menu item ingredient usage per portion
  const menuItemUsageMap = new Map<number, number>();
  menuItems.forEach((mi) => {
    if (mi.id && mi.ingredients) {
      const ingEntry = mi.ingredients.find((i) => i.ingredientId === ingredientId);
      if (ingEntry && ingEntry.quantity > 0) {
        menuItemUsageMap.set(mi.id, ingEntry.quantity);
      }
    }
  });

  // 2. Daily sales consumption events
  salesRecords.forEach((sale) => {
    let consumedQty = 0;
    (sale.items || []).forEach((item) => {
      if (item.ingredientsSnapshot && item.ingredientsSnapshot.length > 0) {
        const snap = item.ingredientsSnapshot.find((s) => Number(s.ingredientId) === ingredientId);
        if (snap) {
          const qty = snap.totalQuantity !== undefined
            ? snap.totalQuantity
            : (snap.quantityPerPortion || 0) * (item.quantity || 0);
          consumedQty += qty;
        }
      } else {
        const usagePerPortion = menuItemUsageMap.get(item.menuItemId) || 0;
        if (usagePerPortion > 0) {
          consumedQty += usagePerPortion * (item.quantity || 0);
        }
      }
    });

    if (consumedQty > 0) {
      const cleanDate = normalizeDateStr(sale.date);
      const eventType: TimelineEventType = 'sale_consumption';
      events.push({
        date: cleanDate,
        createdAt: sale.createdAt || '',
        type: eventType,
        timestamp: getTimelineEventTimestamp(cleanDate, sale.createdAt, eventType),
        qty: consumedQty,
      });
    }
  });

  // 3. Waste consumption events
  wasteLogs.forEach((waste) => {
    if (waste.ingredientId === ingredientId) {
      const cleanDate = normalizeDateStr(waste.date);
      const eventType: TimelineEventType = 'waste_consumption';
      events.push({
        date: cleanDate,
        createdAt: waste.createdAt || '',
        type: eventType,
        timestamp: getTimelineEventTimestamp(cleanDate, waste.createdAt, eventType),
        qty: waste.quantity || 0,
      });
    }
  });

  // Sort chronologically by exact timestamp, breaking ties using event priority
  events.sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    const prioA = TYPE_PRIORITY[a.type] || 99;
    const prioB = TYPE_PRIORITY[b.type] || 99;
    if (prioA !== prioB) {
      return prioA - prioB;
    }
    return 0;
  });

  let runningStock = 0;
  let runningUnitCost = initialUnitCost;
  let totalPurchasedQuantity = 0;
  let totalPurchasedPrice = 0;

  for (const event of events) {
    if (event.type === 'purchase') {
      const pQty = event.qty;
      const pCost = event.unitPrice || 0;
      const pTotal = event.totalPrice || pQty * pCost;

      totalPurchasedQuantity += pQty;
      totalPurchasedPrice += pTotal;

      if (runningStock <= 0) {
        runningUnitCost = pCost;
        runningStock = pQty;
      } else {
        const newCost = (runningStock * runningUnitCost + pQty * pCost) / (runningStock + pQty);
        runningStock += pQty;
        runningUnitCost = newCost;
      }
    } else if (event.type === 'adjustment') {
      runningStock = Math.max(0, runningStock + event.qty);
    } else if (event.type === 'sale_consumption' || event.type === 'waste_consumption') {
      runningStock = Math.max(0, runningStock - event.qty);
    }
  }

  return {
    unitCost: Math.round(runningUnitCost),
    currentStock: Math.round(runningStock * 100) / 100,
    totalPurchasedQuantity,
    totalPurchasedPrice,
  };
}

/**
 * Recalculates Weighted Average Unit Cost (WAC) for an ingredient
 * and updates ingredient record in db + triggers syncAndRecalculateAllData.
 */
export async function recalculateIngredientCost(ingredientId: number): Promise<void> {
  await db.transaction(
    'rw',
    [db.purchaseLogs, db.ingredients, db.menuItems, db.dailySales, db.wasteLogs, db.settings],
    async () => {
      const logs = await db.purchaseLogs.where('ingredientId').equals(ingredientId).toArray();
      const ingredient = await db.ingredients.get(ingredientId);
      const salesRecords = await db.dailySales.toArray();
      const menuItems = await db.menuItems.toArray();
      const wasteLogs = await db.wasteLogs.toArray();

      if (!ingredient) return;

      const hasPurchases = logs.some((l) => l.reason === 'purchase');
      const { unitCost, totalPurchasedQuantity, totalPurchasedPrice } = calculatePerpetualWAC({
        logs,
        salesRecords,
        menuItems,
        wasteLogs,
        ingredientId,
        initialUnitCost: ingredient.unitCost,
      });

      const finalUnitCost = hasPurchases ? unitCost : ingredient.unitCost;
      const finalTotalQty = hasPurchases ? totalPurchasedQuantity : (ingredient.totalQuantity || 0);
      const finalTotalPrice = hasPurchases ? totalPurchasedPrice : (ingredient.totalPrice || 0);

      await db.ingredients.update(ingredientId, {
        unitCost: finalUnitCost,
        totalQuantity: finalTotalQty,
        totalPrice: finalTotalPrice,
        updatedAt: new Date().toISOString(),
      });
    }
  );

  // Sync menu items & recipe costs across app
  await syncAndRecalculateAllData();
}

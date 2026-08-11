import { db, syncAndRecalculateAllData } from '../db';
import type { PurchaseLog } from '../types';
import { normalizeDateStr } from './jalali';

/**
 * Calculates Weighted Average Cost (WAC) from a list of purchase logs.
 * Replays purchase records chronologically.
 */
export function calculateWACFromLogs(logs: PurchaseLog[]): {
  unitCost: number;
  totalPurchasedQuantity: number;
  totalPurchasedPrice: number;
} {
  const purchaseLogs = logs.filter((log) => log.reason === 'purchase');

  if (purchaseLogs.length === 0) {
    return { unitCost: 0, totalPurchasedQuantity: 0, totalPurchasedPrice: 0 };
  }

  // Sort chronologically by date, then createdAt, then id
  const sorted = [...purchaseLogs].sort((a, b) => {
    const dateA = normalizeDateStr(a.date);
    const dateB = normalizeDateStr(b.date);
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const timeA = a.createdAt || '';
    const timeB = b.createdAt || '';
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return (a.id || 0) - (b.id || 0);
  });

  let runningQuantity = 0;
  let runningUnitCost = 0;
  let runningTotalPrice = 0;

  for (const log of sorted) {
    const qty = log.quantity || 0;
    const itemTotalPrice = log.totalPrice || 0;
    const itemUnitCost = log.unitCost || (qty > 0 ? itemTotalPrice / qty : 0);

    if (qty <= 0) continue;

    if (runningQuantity === 0) {
      runningUnitCost = itemUnitCost;
      runningQuantity = qty;
    } else {
      const newUnitCost =
        (runningQuantity * runningUnitCost + qty * itemUnitCost) / (runningQuantity + qty);
      runningQuantity += qty;
      runningUnitCost = newUnitCost;
    }
    runningTotalPrice += itemTotalPrice;
  }

  return {
    unitCost: Math.round(runningUnitCost),
    totalPurchasedQuantity: runningQuantity,
    totalPurchasedPrice: runningTotalPrice,
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

      if (!ingredient) return;

      const { unitCost, totalPurchasedQuantity, totalPurchasedPrice } = calculateWACFromLogs(logs);

      // If no purchase logs left, preserve unitCost if non-zero, or set 0
      const hasPurchases = logs.some((l) => l.reason === 'purchase');
      const finalUnitCost = hasPurchases ? unitCost : ingredient.unitCost;

      await db.ingredients.update(ingredientId, {
        unitCost: finalUnitCost,
        totalQuantity: totalPurchasedQuantity || ingredient.totalQuantity,
        totalPrice: totalPurchasedPrice || ingredient.totalPrice,
        updatedAt: new Date().toISOString(),
      });
    }
  );

  // Sync menu items & recipe costs across app
  await syncAndRecalculateAllData();
}

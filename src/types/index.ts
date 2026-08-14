export type UnitType = 'kg' | 'g' | 'liter' | 'ml' | 'piece' | 'pack';

export type StockMovementReason = 'purchase' | 'adjustment';

export interface PurchaseLog {
  id?: number;
  ingredientId: number;
  date: string; // Jalali ISO, e.g. 1405-05-19
  quantity: number;
  totalPrice: number;
  unitCost: number; // computed: totalPrice / quantity
  reason: StockMovementReason;
  note?: string;
  createdAt: string;
}

export interface Ingredient {
  id?: number;
  name: string;
  category: string;
  unit: UnitType;
  totalPrice: number;       // Cumulative purchase price (Calculated via WAC logic, not directly edited)
  totalQuantity: number;    // Cumulative purchased quantity (Calculated via WAC logic, not directly edited)
  unitCost: number;         // Weighted Average Cost (WAC per unit)
  minimumStock: number;     // Low stock threshold
  currentStock: number;     // Available quantity in inventory
  updatedAt: string;        // ISO timestamp or Jalali formatted
}

export interface RecipeIngredient {
  ingredientId: number;
  ingredientName?: string;
  quantity: number;         // Quantity in ingredient's base unit (e.g. 0.25 kg or 250 g)
  unit?: UnitType;
  unitCost?: number;
  cost: number;             // Calculated cost for this recipe item
}

export type MenuCategory = 
  | 'غذای اصلی'
  | 'پیش غذا'
  | 'نوشیدنی'
  | 'دسر و شیرینی'
  | 'کافه و گرم'
  | 'مخلفات'
  | 'سایر';

export type MatrixCategory = 'star' | 'workhorse' | 'puzzle' | 'underperformer';

export interface MenuItem {
  id?: number;
  name: string;
  category: MenuCategory;
  sellingPrice: number;     // Current selling price (Toman)
  wastePercent: number;     // Estimated waste % (e.g., 5%)
  ingredients: RecipeIngredient[];
  laborCost: number;        // Direct labor cost per portion (تولید/آماده‌سازی هر پرس)
  packagingCost: number;    // Packaging cost per portion (هزینه بسته‌بندی)
  totalMaterialCost: number; // Raw materials cost sum (هزینه خام مواد)
  foodCost: number;         // Pure Food Cost = Material Cost + Waste (ماده اولیه + ضایعات)
  portionCost: number;      // Total Portion Cost = Food Cost + Direct Labor + Packaging (بهای تمام‌شده هر پرس)
  primeCost?: number;       // Backward compatibility alias for portionCost
  targetPrice: number;      // Calculated target price based on pure Food Cost (Food Cost / targetFoodCostRatio)
  marginPercent: number;    // ((Selling Price - Portion Cost) / Selling Price) * 100
  grossProfit: number;      // Selling Price - Portion Cost
  popularityScore?: number; // Calculated matrix popularity (Sales volume)
  salesVolume30Days?: number;
  matrixCategory?: 'star' | 'workhorse' | 'puzzle' | 'underperformer';
  updatedAt: string;
}

export interface DailySalesItem {
  menuItemId: number;
  menuItemName: string;
  quantity: number;
  unitSellingPrice: number;
  unitCost: number;         // Unit Food Cost (مواد اولیه)
  unitLaborCost?: number;   // Unit Direct Labor Cost (دستمزد مستقیم هر پرس)
  totalRevenue: number;
  totalCost: number;        // Total Food Cost (COGS)
  totalLaborCost?: number;  // Total Direct Labor Cost
}

export interface DailySalesRecord {
  id?: number;
  date: string;             // Jalali ISO or formatted YYYY-MM-DD
  items: DailySalesItem[];
  totalRevenue: number;
  totalCOGS: number;        // Pure Food Cost from sold items
  totalLaborCost?: number;  // Direct labor sum from sold items
  totalWasteCost: number;
  netProfit: number;
  notes?: string;
  createdAt: string;
}

export interface WasteLog {
  id?: number;
  date: string;
  ingredientId?: number;
  menuItemId?: number;
  itemName: string;
  quantity: number;
  unit: string;
  cost: number;
  reason: string;
  createdAt: string;
}

export interface FixedCosts {
  rent: number;
  utilities: number;
  salaries: number;
  marketing: number;
  insurance: number;
  general: number;
  maintenance?: number;
  delivery?: number;
}

export interface AppSettings {
  id?: string;
  workingDaysPerMonth: number;
  dailyWorkHours: number;
  holidaysCount: number;
  monthlyFixedCosts: FixedCosts;
  targetFoodCostPercent: number; // e.g., 35%
  taxPercent: number;            // e.g., 0% or 10%
  currencyUnit: 'toman' | 'rial';
  restaurantName: string;
  businessType?: string;
  contactPhone?: string;
  address?: string;
  defaultLowStockThreshold?: number;
  defaultRecipeWastePercent?: number;
  highFoodCostThreshold?: number;
  isSetupCompleted?: boolean;
}

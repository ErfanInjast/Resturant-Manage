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
  laborCost: number;        // Additional labor cost per portion
  packagingCost: number;    // Packaging cost per portion
  totalMaterialCost: number; // Raw materials cost sum
  primeCost: number;        // COGS = Material Cost + Waste + Labor + Packaging
  targetPrice: number;      // Calculated target price at desired Food Cost % (e.g. Total Material / 0.35)
  marginPercent: number;    // ((Selling Price - Prime Cost) / Selling Price) * 100
  grossProfit: number;      // Selling Price - Prime Cost
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
  unitCost: number;
  totalRevenue: number;
  totalCost: number;
}

export interface DailySalesRecord {
  id?: number;
  date: string;             // Jalali ISO or formatted YYYY-MM-DD
  items: DailySalesItem[];
  totalRevenue: number;
  totalCOGS: number;
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

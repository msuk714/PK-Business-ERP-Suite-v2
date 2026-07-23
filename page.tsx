"use client";

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type Role = "admin" | "staff";
type PaymentType = "cash" | "credit" | "temporary";
type BusinessKey = "feed" | "chakki" | "petrol" | "store" | "gas" | "common";
type TabKey = "overview" | "feed" | "chakki" | "petrol" | "store" | "gas" | "cashbook" | "staff" | "reports" | "settings";
type FuelType = "petrol" | "diesel";
type CashEntryType = "opening" | "received" | "paid" | "expense";

type UserSession = { name: string; email: string; role: Role };
type BaseRecord = { id: string; date: string };
type Partner = { id: string; name: string; phone: string; sharePercent: number; status: "active" | "inactive" };
type Investment = BaseRecord & { partnerId: string; type: "investment" | "withdrawal"; amount: number; notes: string };
type Supplier = { id: string; business: BusinessKey; name: string; phone: string; address: string; openingBalance: number };
type Customer = { id: string; business: BusinessKey; name: string; phone: string; address: string; creditLimit: number; openingBalance: number };
type RawMaterial = { id: string; name: string; unit: string; stock: number; reorderLevel: number; averageRate: number };
type RawMaterialPurchase = BaseRecord & { supplierId: string; materialId: string; quantity: number; rate: number; paymentType: "cash" | "credit"; paidAmount: number; invoiceNo: string };
type FormulaIngredient = { materialId: string; quantity: number };
type FeedFormula = { id: string; name: string; outputKg: number; ingredients: FormulaIngredient[]; notes: string };
type ProductionBatch = BaseRecord & { batchNo: string; formulaId: string; outputKg: number; bagSize: number; bagsProduced: number; productionCost: number; notes: string };
type FinishedGood = { id: string; name: string; stockKg: number; averageCost: number };
type BagInventory = { id: string; productName: string; bagSize: number; quantity: number; reorderLevel: number; saleRate: number; costRate: number };
type Sale = BaseRecord & { business: BusinessKey; invoiceNo: string; customerId: string; customerName: string; productId: string; productName: string; quantity: number; unit: string; rate: number; total: number; paidAmount: number; paymentType: PaymentType; dueDate: string; remarks: string };
type Expense = BaseRecord & { business: BusinessKey; title: string; category: string; amount: number; paymentType: "cash" | "credit"; notes: string };
type StaffMember = { id: string; business: BusinessKey; name: string; roleTitle: string; phone: string; monthlySalary: number; joiningDate: string; status: "active" | "inactive" };
type SalaryPayment = BaseRecord & { staffId: string; month: string; amount: number; status: "paid" | "pending"; notes: string };
type GrindingJob = BaseRecord & { receiptNo: string; customerName: string; phone: string; weightKg: number; grindingRate: number; charges: number; paymentType: "cash" | "credit"; paidAmount: number; remarks: string };
type FlourProduct = { id: string; name: string; bagSize: number; stock: number; reorderLevel: number; costRate: number; saleRate: number };
type FlourProduction = BaseRecord & { batchNo: string; productId: string; bagsProduced: number; totalCost: number; notes: string };
type FuelPurchase = BaseRecord & { invoiceNo: string; fuelType: FuelType; liters: number; rate: number; supplierId: string; paymentType: "cash" | "credit"; paidAmount: number };
type MachineReading = BaseRecord & { machine: "Machine 1" | "Machine 2"; fuelType: FuelType; openingReading: number; closingReading: number; saleRate: number; paymentType: PaymentType; customerId: string; customerName: string; paidAmount: number; dueDate: string; remarks: string };
type StoreProduct = { id: string; name: string; sku: string; category: string; stock: number; reorderLevel: number; costRate: number; saleRate: number };
type StorePurchase = BaseRecord & { invoiceNo: string; supplierId: string; productId: string; quantity: number; rate: number; paymentType: "cash" | "credit"; paidAmount: number };
type PurchaseReturn = BaseRecord & { returnNo: string; supplierId: string; productId: string; quantity: number; rate: number; reason: string };
type GasProduct = { id: string; name: string; unit: string; stock: number; reorderLevel: number; costRate: number; saleRate: number };
type GasPurchase = BaseRecord & { invoiceNo: string; supplierId: string; productId: string; quantity: number; rate: number; paymentType: "cash" | "credit"; paidAmount: number };
type CashEntry = BaseRecord & { type: CashEntryType; business: BusinessKey; category: string; reference: string; description: string; amount: number };
type ClosingRecord = BaseRecord & { period: "daily" | "monthly"; business: BusinessKey | "all"; openingBalance: number; received: number; paid: number; closingBalance: number; notes: string };
type AuditLog = { id: string; dateTime: string; user: string; area: string; action: string; detail: string };
type UserAccount = { id: string; name: string; email: string; password: string; role: Role; status: "active" | "inactive" };
type RoleDefinition = { id: string; name: string; permissions: string[] };
type SystemSettings = {
  businessName: string;
  version: string;
  openingCashBalance: number;
  openingPetrolLiters: number;
  openingDieselLiters: number;
  petrolReorderLevel: number;
  dieselReorderLevel: number;
  lastBackupAt: string;
};

type ERPData = {
  partners: Partner[];
  investments: Investment[];
  suppliers: Supplier[];
  customers: Customer[];
  rawMaterials: RawMaterial[];
  rawMaterialPurchases: RawMaterialPurchase[];
  feedFormulas: FeedFormula[];
  productionBatches: ProductionBatch[];
  finishedGoods: FinishedGood[];
  bagInventory: BagInventory[];
  sales: Sale[];
  expenses: Expense[];
  staff: StaffMember[];
  salaryPayments: SalaryPayment[];
  grindingJobs: GrindingJob[];
  flourProducts: FlourProduct[];
  flourProduction: FlourProduction[];
  fuelPurchases: FuelPurchase[];
  machineReadings: MachineReading[];
  storeProducts: StoreProduct[];
  storePurchases: StorePurchase[];
  purchaseReturns: PurchaseReturn[];
  gasProducts: GasProduct[];
  gasPurchases: GasPurchase[];
  cashEntries: CashEntry[];
  closings: ClosingRecord[];
  auditLogs: AuditLog[];
  users: UserAccount[];
  roles: RoleDefinition[];
  settings: SystemSettings;
};

type PrintDocument = {
  title: string;
  subtitle: string;
  fields?: Array<[string, string]>;
  columns?: string[];
  rows?: string[][];
  footer?: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const dateOffset = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const monthOffset = (months: number, day = 10) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  date.setDate(day);
  return date.toISOString().slice(0, 10);
};
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const toNum = (value: string | number) => Number(value) || 0;
const fmt = (value: number) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(value || 0);
const money = (value: number) => `Rs ${fmt(value)}`;
const titleCase = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ") : "—";
const soldLiters = (item: MachineReading) => Math.max(item.closingReading - item.openingReading, 0);
const readingAmount = (item: MachineReading) => soldLiters(item) * item.saleRate;
const monthKey = (date: string) => date.slice(0, 7);
const businessLabel = (value: BusinessKey | "all") => ({ feed: "Feed Unit", chakki: "Chakki", petrol: "Petrol Pump", store: "Super Store", gas: "Gas Management", common: "Common", all: "All Businesses" }[value]);

const seedData: ERPData = {
  partners: [
    { id: "partner-1", name: "Muhammad Usman", phone: "0300-1234567", sharePercent: 60, status: "active" },
    { id: "partner-2", name: "Ali Raza", phone: "0312-7654321", sharePercent: 40, status: "active" },
  ],
  investments: [
    { id: "inv-1", date: monthOffset(-2, 2), partnerId: "partner-1", type: "investment", amount: 900000, notes: "Initial capital" },
    { id: "inv-2", date: monthOffset(-2, 2), partnerId: "partner-2", type: "investment", amount: 600000, notes: "Initial capital" },
  ],
  suppliers: [
    { id: "sup-feed-1", business: "feed", name: "Punjab Grains Traders", phone: "0301-5551122", address: "Multan Road, Lahore", openingBalance: 45000 },
    { id: "sup-petrol-1", business: "petrol", name: "Pakistan Fuel Distributors", phone: "0302-4455667", address: "Rawalpindi", openingBalance: 0 },
    { id: "sup-store-1", business: "store", name: "Metro Wholesale Supply", phone: "0303-7788990", address: "Islamabad", openingBalance: 32000 },
    { id: "sup-gas-1", business: "gas", name: "Pak LPG Services", phone: "0304-1122334", address: "Taxila", openingBalance: 18000 },
  ],
  customers: [
    { id: "cust-feed-1", business: "feed", name: "Al Noor Dairy Farm", phone: "0305-7001001", address: "Chakwal", creditLimit: 250000, openingBalance: 35000 },
    { id: "cust-petrol-1", business: "petrol", name: "City Transport Services", phone: "0306-7001002", address: "Islamabad", creditLimit: 150000, openingBalance: 25000 },
    { id: "cust-store-1", business: "store", name: "Walk-in Customer", phone: "", address: "", creditLimit: 0, openingBalance: 0 },
    { id: "cust-gas-1", business: "gas", name: "Usman Hotel", phone: "0307-7001003", address: "Rawalpindi", creditLimit: 80000, openingBalance: 12000 },
  ],
  rawMaterials: [
    { id: "rm-1", name: "Maize", unit: "kg", stock: 5250, reorderLevel: 1000, averageRate: 82 },
    { id: "rm-2", name: "Wheat Bran", unit: "kg", stock: 3100, reorderLevel: 700, averageRate: 58 },
    { id: "rm-3", name: "Soybean Meal", unit: "kg", stock: 1800, reorderLevel: 500, averageRate: 145 },
    { id: "rm-4", name: "Mineral Mix", unit: "kg", stock: 420, reorderLevel: 150, averageRate: 260 },
  ],
  rawMaterialPurchases: [
    { id: "rmp-1", date: dateOffset(-4), supplierId: "sup-feed-1", materialId: "rm-1", quantity: 3000, rate: 82, paymentType: "credit", paidAmount: 100000, invoiceNo: "PUR-F-1001" },
    { id: "rmp-2", date: dateOffset(-3), supplierId: "sup-feed-1", materialId: "rm-2", quantity: 1500, rate: 58, paymentType: "cash", paidAmount: 87000, invoiceNo: "PUR-F-1002" },
  ],
  feedFormulas: [
    { id: "formula-1", name: "Dairy Gold 18%", outputKg: 1000, ingredients: [{ materialId: "rm-1", quantity: 520 }, { materialId: "rm-2", quantity: 260 }, { materialId: "rm-3", quantity: 190 }, { materialId: "rm-4", quantity: 30 }], notes: "Standard dairy feed formula" },
    { id: "formula-2", name: "Calf Starter", outputKg: 1000, ingredients: [{ materialId: "rm-1", quantity: 480 }, { materialId: "rm-2", quantity: 220 }, { materialId: "rm-3", quantity: 260 }, { materialId: "rm-4", quantity: 40 }], notes: "High-protein calf starter" },
  ],
  productionBatches: [
    { id: "batch-1", date: dateOffset(-2), batchNo: "BATCH-260721-01", formulaId: "formula-1", outputKg: 1000, bagSize: 40, bagsProduced: 25, productionCost: 96800, notes: "Completed successfully" },
  ],
  finishedGoods: [{ id: "fg-1", name: "Finished Feed", stockKg: 2320, averageCost: 96.8 }],
  bagInventory: [
    { id: "bag-1", productName: "Dairy Gold Feed", bagSize: 40, quantity: 48, reorderLevel: 15, saleRate: 5200, costRate: 3872 },
    { id: "bag-2", productName: "Calf Starter Feed", bagSize: 40, quantity: 10, reorderLevel: 12, saleRate: 5900, costRate: 4320 },
  ],
  sales: [
    { id: "sale-feed-1", date: today(), business: "feed", invoiceNo: "INV-F-1001", customerId: "cust-feed-1", customerName: "Al Noor Dairy Farm", productId: "bag-1", productName: "Dairy Gold Feed 40 KG", quantity: 8, unit: "bags", rate: 5200, total: 41600, paidAmount: 20000, paymentType: "credit", dueDate: dateOffset(10), remarks: "Regular customer" },
    { id: "sale-feed-2", date: monthOffset(-1, 14), business: "feed", invoiceNo: "INV-F-0951", customerId: "cust-feed-1", customerName: "Al Noor Dairy Farm", productId: "bag-1", productName: "Dairy Gold Feed 40 KG", quantity: 18, unit: "bags", rate: 5100, total: 91800, paidAmount: 91800, paymentType: "cash", dueDate: "", remarks: "" },
    { id: "sale-flour-1", date: today(), business: "chakki", invoiceNo: "INV-C-1001", customerId: "", customerName: "Walk-in Customer", productId: "flour-20", productName: "20 KG Flour Bag", quantity: 2, unit: "bags", rate: 3100, total: 6200, paidAmount: 6200, paymentType: "cash", dueDate: "", remarks: "" },
    { id: "sale-store-1", date: today(), business: "store", invoiceNo: "INV-S-1001", customerId: "cust-store-1", customerName: "Walk-in Customer", productId: "sp-1", productName: "Cooking Oil 5L", quantity: 3, unit: "pcs", rate: 2850, total: 8550, paidAmount: 8550, paymentType: "cash", dueDate: "", remarks: "POS sale" },
    { id: "sale-store-2", date: monthOffset(-2, 18), business: "store", invoiceNo: "INV-S-0902", customerId: "cust-store-1", customerName: "Walk-in Customer", productId: "sp-2", productName: "Sugar 1 KG", quantity: 120, unit: "pcs", rate: 185, total: 22200, paidAmount: 22200, paymentType: "cash", dueDate: "", remarks: "" },
    { id: "sale-gas-1", date: dateOffset(-1), business: "gas", invoiceNo: "INV-G-1001", customerId: "cust-gas-1", customerName: "Usman Hotel", productId: "gp-1", productName: "LPG Cylinder 11.8 KG", quantity: 4, unit: "cylinders", rate: 3650, total: 14600, paidAmount: 8000, paymentType: "credit", dueDate: dateOffset(7), remarks: "" },
  ],
  expenses: [
    { id: "exp-1", date: today(), business: "feed", title: "Generator diesel", category: "Utilities", amount: 6500, paymentType: "cash", notes: "Production shift" },
    { id: "exp-2", date: today(), business: "petrol", title: "Pump maintenance", category: "Maintenance", amount: 4200, paymentType: "cash", notes: "Nozzle repair" },
    { id: "exp-3", date: dateOffset(-1), business: "store", title: "Delivery charges", category: "Transport", amount: 1800, paymentType: "cash", notes: "Supplier pickup" },
  ],
  staff: [
    { id: "staff-1", business: "feed", name: "Bilal Ahmed", roleTitle: "Feed Unit Manager", phone: "0308-1112200", monthlySalary: 55000, joiningDate: monthOffset(-8, 1), status: "active" },
    { id: "staff-2", business: "petrol", name: "Saad Khan", roleTitle: "Pump Operator", phone: "0309-1112201", monthlySalary: 38000, joiningDate: monthOffset(-5, 5), status: "active" },
    { id: "staff-3", business: "store", name: "Hassan Ali", roleTitle: "Cashier", phone: "0310-1112202", monthlySalary: 35000, joiningDate: monthOffset(-3, 8), status: "active" },
  ],
  salaryPayments: [{ id: "salary-1", date: monthOffset(-1, 30), staffId: "staff-1", month: monthOffset(-1, 1).slice(0, 7), amount: 55000, status: "paid", notes: "Bank transfer" }],
  grindingJobs: [
    { id: "grind-1", date: today(), receiptNo: "GR-1001", customerName: "Naveed Akhtar", phone: "0311-4567890", weightKg: 85, grindingRate: 8, charges: 680, paymentType: "cash", paidAmount: 680, remarks: "Customer wheat only" },
    { id: "grind-2", date: dateOffset(-1), receiptNo: "GR-1000", customerName: "Shahid Mehmood", phone: "0312-5566778", weightKg: 120, grindingRate: 8, charges: 960, paymentType: "credit", paidAmount: 0, remarks: "Pay next visit" },
  ],
  flourProducts: [
    { id: "flour-10", name: "10 KG Flour Bag", bagSize: 10, stock: 42, reorderLevel: 12, costRate: 1280, saleRate: 1580 },
    { id: "flour-20", name: "20 KG Flour Bag", bagSize: 20, stock: 30, reorderLevel: 10, costRate: 2550, saleRate: 3100 },
    { id: "flour-40", name: "40 KG Flour Bag", bagSize: 40, stock: 18, reorderLevel: 8, costRate: 5100, saleRate: 6100 },
    { id: "flour-50", name: "50 KG Flour Bag", bagSize: 50, stock: 12, reorderLevel: 6, costRate: 6350, saleRate: 7550 },
  ],
  flourProduction: [{ id: "fp-1", date: dateOffset(-3), batchNo: "FLOUR-B-1001", productId: "flour-20", bagsProduced: 30, totalCost: 76500, notes: "Company wheat production" }],
  fuelPurchases: [
    { id: "fuel-p-1", date: dateOffset(-3), invoiceNo: "FP-1001", fuelType: "petrol", liters: 8000, rate: 271.5, supplierId: "sup-petrol-1", paymentType: "credit", paidAmount: 1500000 },
    { id: "fuel-p-2", date: dateOffset(-3), invoiceNo: "FP-1002", fuelType: "diesel", liters: 6000, rate: 279.2, supplierId: "sup-petrol-1", paymentType: "cash", paidAmount: 1675200 },
  ],
  machineReadings: [
    { id: "mr-1", date: today(), machine: "Machine 1", fuelType: "petrol", openingReading: 125400, closingReading: 125780, saleRate: 284.5, paymentType: "cash", customerId: "", customerName: "Walk-in Customers", paidAmount: 108110, dueDate: "", remarks: "Morning shift" },
    { id: "mr-2", date: today(), machine: "Machine 2", fuelType: "diesel", openingReading: 88200, closingReading: 88465, saleRate: 291.8, paymentType: "credit", customerId: "cust-petrol-1", customerName: "City Transport Services", paidAmount: 30000, dueDate: dateOffset(5), remarks: "Fleet fueling" },
    { id: "mr-3", date: monthOffset(-1, 13), machine: "Machine 1", fuelType: "petrol", openingReading: 118000, closingReading: 119250, saleRate: 281.5, paymentType: "cash", customerId: "", customerName: "Walk-in Customers", paidAmount: 351875, dueDate: "", remarks: "" },
  ],
  storeProducts: [
    { id: "sp-1", name: "Cooking Oil 5L", sku: "SS-CO-005", category: "Grocery", stock: 24, reorderLevel: 8, costRate: 2650, saleRate: 2850 },
    { id: "sp-2", name: "Sugar 1 KG", sku: "SS-SU-001", category: "Grocery", stock: 65, reorderLevel: 25, costRate: 168, saleRate: 185 },
    { id: "sp-3", name: "Laundry Detergent 1 KG", sku: "SS-LD-001", category: "Home Care", stock: 9, reorderLevel: 12, costRate: 610, saleRate: 690 },
  ],
  storePurchases: [{ id: "store-p-1", date: dateOffset(-5), invoiceNo: "SP-1001", supplierId: "sup-store-1", productId: "sp-1", quantity: 30, rate: 2650, paymentType: "credit", paidAmount: 40000 }],
  purchaseReturns: [],
  gasProducts: [
    { id: "gp-1", name: "LPG Cylinder 11.8 KG", unit: "cylinders", stock: 28, reorderLevel: 10, costRate: 3290, saleRate: 3650 },
    { id: "gp-2", name: "LPG Commercial 45 KG", unit: "cylinders", stock: 7, reorderLevel: 5, costRate: 12400, saleRate: 13750 },
  ],
  gasPurchases: [{ id: "gas-p-1", date: dateOffset(-4), invoiceNo: "GP-1001", supplierId: "sup-gas-1", productId: "gp-1", quantity: 40, rate: 3290, paymentType: "credit", paidAmount: 80000 }],
  cashEntries: [
    { id: "cash-1", date: today(), type: "received", business: "feed", category: "Sales", reference: "INV-F-1001", description: "Feed sale collection", amount: 20000 },
    { id: "cash-2", date: today(), type: "received", business: "chakki", category: "Grinding", reference: "GR-1001", description: "Grinding charges", amount: 680 },
    { id: "cash-3", date: today(), type: "received", business: "store", category: "Sales", reference: "INV-S-1001", description: "Super store cash sale", amount: 8550 },
    { id: "cash-4", date: today(), type: "paid", business: "feed", category: "Expense", reference: "exp-1", description: "Generator diesel", amount: 6500 },
    { id: "cash-5", date: today(), type: "paid", business: "petrol", category: "Expense", reference: "exp-2", description: "Pump maintenance", amount: 4200 },
  ],
  closings: [],
  auditLogs: [
    { id: "log-1", dateTime: new Date().toLocaleString(), user: "System", area: "Dashboard", action: "Version 2.0 demo loaded", detail: "Realistic demo data initialized" },
  ],
  users: [
    { id: "user-1", name: "Admin Demo", email: "admin@demo.com", password: "admin123", role: "admin", status: "active" },
    { id: "user-2", name: "Staff Demo", email: "staff@demo.com", password: "staff123", role: "staff", status: "active" },
  ],
  roles: [
    { id: "role-1", name: "Administrator", permissions: ["dashboard.view", "records.create", "records.edit", "records.delete", "reports.print", "settings.manage", "users.manage", "backup.manage"] },
    { id: "role-2", name: "Staff", permissions: ["dashboard.view", "records.create", "reports.view", "reports.print"] },
  ],
  settings: {
    businessName: "PK Business ERP Suite",
    version: "2.0",
    openingCashBalance: 500000,
    openingPetrolLiters: 3000,
    openingDieselLiters: 2500,
    petrolReorderLevel: 1800,
    dieselReorderLevel: 1500,
    lastBackupAt: dateOffset(-9),
  },
};

function useLocalStore<T>(key: string, initialValue: T) {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState<T>(initialValue);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) setValue(JSON.parse(stored) as T);
    } catch {
      setValue(initialValue);
    } finally {
      setMounted(true);
    }
  }, [key]);
  useEffect(() => {
    if (mounted) window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, mounted]);
  return [value, setValue] as const;
}

function migrateLegacyData(): ERPData {
  if (typeof window === "undefined") return seedData;
  try {
    const current = window.localStorage.getItem("pk-erp-v2-data");
    if (current) return JSON.parse(current) as ERPData;

    const legacyPartners = JSON.parse(window.localStorage.getItem("fp-partners") || "[]") as Array<{ id: string; name: string; amount: number; date: string; notes?: string }>;
    const legacyIngredients = JSON.parse(window.localStorage.getItem("fp-ingredients") || "[]") as Array<{ id: string; date: string; ingredient: string; quantity: number; unit: string; rate: number; supplier?: string; paymentType: "cash" | "credit" }>;
    const legacyProduction = JSON.parse(window.localStorage.getItem("fp-feed-production") || "[]") as Array<{ id: string; date: string; batchName: string; producedKg: number; notes?: string }>;
    const legacyFeedSales = JSON.parse(window.localStorage.getItem("fp-feed-sales") || "[]") as Array<{ id: string; date: string; customerName: string; quantityKg: number; rate: number; paidAmount: number; paymentType: "cash" | "credit"; phone?: string; address?: string; dueDate?: string }>;
    const legacyFeedExpenses = JSON.parse(window.localStorage.getItem("fp-feed-expenses") || "[]") as Array<{ id: string; date: string; title: string; category: string; amount: number; notes?: string }>;
    const legacyFuelPurchases = JSON.parse(window.localStorage.getItem("fp-fuel-purchases") || "[]") as Array<{ id: string; date: string; fuelType: FuelType; liters: number; rate: number; supplier?: string; paymentType: "cash" | "credit" }>;
    const legacyMachineReadings = JSON.parse(window.localStorage.getItem("fp-machine-readings") || "[]") as Array<{ id: string; date: string; machine: string; side: "left" | "right"; fuelType: FuelType; firstReading: number; secondReading: number; saleRate: number; paymentType: PaymentType; customerName?: string; dueDate?: string }>;
    const legacyFuelExpenses = JSON.parse(window.localStorage.getItem("fp-fuel-expenses") || "[]") as Array<{ id: string; date: string; title: string; category: string; amount: number; notes?: string }>;
    const legacyStaff = JSON.parse(window.localStorage.getItem("fp-staff") || "[]") as Array<{ id: string; name: string; role: string; phone?: string; monthlySalary: number; joiningDate: string; status: "active" | "inactive" }>;
    const legacyAudit = JSON.parse(window.localStorage.getItem("fp-audit") || "[]") as AuditLog[];
    const legacySettings = JSON.parse(window.localStorage.getItem("fp-settings") || "null") as null | { businessName?: string; openingFeedStockKg?: number; openingPetrolLiters?: number; openingDieselLiters?: number };

    const hasLegacyData = [legacyPartners, legacyIngredients, legacyProduction, legacyFeedSales, legacyFeedExpenses, legacyFuelPurchases, legacyMachineReadings, legacyFuelExpenses, legacyStaff, legacyAudit].some((items) => items.length > 0) || Boolean(legacySettings);
    if (!hasLegacyData) return seedData;

    const migratedPartners: Partner[] = legacyPartners.length
      ? legacyPartners.map((item, index) => ({ id: item.id, name: item.name, phone: "", sharePercent: legacyPartners.length === 1 ? 100 : index === 0 ? 60 : Math.max(40 / (legacyPartners.length - 1), 1), status: "active" }))
      : seedData.partners;
    const migratedInvestments: Investment[] = legacyPartners.length
      ? legacyPartners.map((item) => ({ id: `legacy-${item.id}`, date: item.date, partnerId: item.id, type: "investment", amount: item.amount, notes: item.notes || "Imported from Version 1" }))
      : seedData.investments;

    const materialNames = Array.from(new Set(legacyIngredients.map((item) => item.ingredient.trim()).filter(Boolean)));
    const migratedMaterials: RawMaterial[] = materialNames.map((name, index) => {
      const purchases = legacyIngredients.filter((item) => item.ingredient.trim() === name);
      const stock = purchases.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = purchases.reduce((sum, item) => sum + item.quantity * item.rate, 0);
      return { id: `legacy-rm-${index + 1}`, name, unit: purchases[0]?.unit || "kg", stock, reorderLevel: Math.max(stock * 0.2, 1), averageRate: stock ? totalValue / stock : 0 };
    });
    const materialIdByName = new Map(migratedMaterials.map((item) => [item.name, item.id]));
    const migratedPurchases: RawMaterialPurchase[] = legacyIngredients.map((item, index) => ({ id: item.id, date: item.date, supplierId: "sup-feed-1", materialId: materialIdByName.get(item.ingredient.trim()) || `legacy-rm-${index + 1}`, quantity: item.quantity, rate: item.rate, paymentType: item.paymentType, paidAmount: item.paymentType === "cash" ? item.quantity * item.rate : 0, invoiceNo: `V1-PUR-${String(index + 1).padStart(4, "0")}` }));
    const migratedProduction: ProductionBatch[] = legacyProduction.map((item, index) => ({ id: item.id, date: item.date, batchNo: item.batchName || `V1-BATCH-${index + 1}`, formulaId: "formula-1", outputKg: item.producedKg, bagSize: 40, bagsProduced: Math.floor(item.producedKg / 40), productionCost: 0, notes: item.notes || "Imported from Version 1" }));
    const migratedFeedSales: Sale[] = legacyFeedSales.map((item, index) => ({ id: item.id, date: item.date, business: "feed", invoiceNo: `V1-INV-F-${String(index + 1).padStart(4, "0")}`, customerId: "", customerName: item.customerName, productId: "", productName: "Feed Sale (Version 1)", quantity: item.quantityKg, unit: "kg", rate: item.rate, total: item.quantityKg * item.rate, paidAmount: item.paidAmount, paymentType: item.paymentType, dueDate: item.dueDate || "", remarks: [item.phone, item.address].filter(Boolean).join(" · ") }));
    const migratedFuelPurchases: FuelPurchase[] = legacyFuelPurchases.map((item, index) => ({ id: item.id, date: item.date, invoiceNo: `V1-FP-${String(index + 1).padStart(4, "0")}`, fuelType: item.fuelType, liters: item.liters, rate: item.rate, supplierId: "sup-petrol-1", paymentType: item.paymentType, paidAmount: item.paymentType === "cash" ? item.liters * item.rate : 0 }));
    const migratedMachineReadings: MachineReading[] = legacyMachineReadings.map((item) => ({ id: item.id, date: item.date, machine: item.machine.toLowerCase().includes("2") || item.side === "right" ? "Machine 2" : "Machine 1", fuelType: item.fuelType, openingReading: item.firstReading, closingReading: item.secondReading, saleRate: item.saleRate, paymentType: item.paymentType, customerId: "", customerName: item.customerName || (item.paymentType === "cash" ? "Walk-in Customers" : "Version 1 Customer"), paidAmount: item.paymentType === "cash" ? Math.max(item.secondReading - item.firstReading, 0) * item.saleRate : 0, dueDate: item.dueDate || "", remarks: `Imported ${item.side} side reading from Version 1` }));
    const migratedExpenses: Expense[] = [
      ...legacyFeedExpenses.map((item) => ({ id: item.id, date: item.date, business: "feed" as BusinessKey, title: item.title, category: item.category, amount: item.amount, paymentType: "cash" as const, notes: item.notes || "Imported from Version 1" })),
      ...legacyFuelExpenses.map((item) => ({ id: item.id, date: item.date, business: "petrol" as BusinessKey, title: item.title, category: item.category, amount: item.amount, paymentType: "cash" as const, notes: item.notes || "Imported from Version 1" })),
    ];
    const migratedStaff: StaffMember[] = legacyStaff.length
      ? legacyStaff.map((item) => ({ id: item.id, business: "common", name: item.name, roleTitle: item.role, phone: item.phone || "", monthlySalary: item.monthlySalary, joiningDate: item.joiningDate, status: item.status }))
      : seedData.staff;
    const migratedFinishedKg = (legacySettings?.openingFeedStockKg || 0) + legacyProduction.reduce((sum, item) => sum + item.producedKg, 0) - legacyFeedSales.reduce((sum, item) => sum + item.quantityKg, 0);

    return {
      ...seedData,
      partners: migratedPartners,
      investments: migratedInvestments,
      rawMaterials: migratedMaterials.length ? migratedMaterials : seedData.rawMaterials,
      rawMaterialPurchases: migratedPurchases.length ? migratedPurchases : seedData.rawMaterialPurchases,
      productionBatches: migratedProduction.length ? migratedProduction : seedData.productionBatches,
      finishedGoods: [{ id: "legacy-finished-feed", name: "Finished Feed", stockKg: Math.max(migratedFinishedKg, 0), averageCost: 0 }],
      sales: [...migratedFeedSales, ...seedData.sales.filter((item) => item.business !== "feed")],
      expenses: migratedExpenses.length ? [...migratedExpenses, ...seedData.expenses.filter((item) => item.business !== "feed" && item.business !== "petrol")] : seedData.expenses,
      fuelPurchases: migratedFuelPurchases.length ? migratedFuelPurchases : seedData.fuelPurchases,
      machineReadings: migratedMachineReadings.length ? migratedMachineReadings : seedData.machineReadings,
      staff: migratedStaff,
      settings: {
        ...seedData.settings,
        businessName: legacySettings?.businessName || "PK Business ERP Suite",
        openingPetrolLiters: legacySettings?.openingPetrolLiters ?? seedData.settings.openingPetrolLiters,
        openingDieselLiters: legacySettings?.openingDieselLiters ?? seedData.settings.openingDieselLiters,
      },
      auditLogs: [
        { id: uid(), dateTime: new Date().toLocaleString(), user: "System", area: "Migration", action: "Version 1 data imported", detail: "Partners, investments, purchases, production, sales, expenses, fuel records, staff, settings and audit logs were preserved" },
        ...legacyAudit,
        ...seedData.auditLogs,
      ].slice(0, 250),
    };
  } catch {
    return seedData;
  }
}

function useERPStore() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ERPData>(seedData);
  useEffect(() => {
    setData(migrateLegacyData());
    setMounted(true);
  }, []);
  useEffect(() => {
    if (mounted) window.localStorage.setItem("pk-erp-v2-data", JSON.stringify(data));
  }, [data, mounted]);
  return [data, setData, mounted] as const;
}

function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "success" | "danger" | "warning" }) {
  return <div className={`stat-card ${tone ? `tone-${tone}` : ""}`}><p>{label}</p><strong>{value}</strong>{hint ? <span>{hint}</span> : null}</div>;
}

function Panel({ title, children, actions, className = "" }: { title: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-head"><h2>{title}</h2>{actions ? <div className="panel-actions">{actions}</div> : null}</div>{children}</section>;
}

function ModuleTabs<T extends string>({ items, active, onChange }: { items: Array<[T, string]>; active: T; onChange: (key: T) => void }) {
  return <div className="module-tabs no-print">{items.map(([key, label]) => <button key={key} className={active === key ? "active" : ""} onClick={() => onChange(key)}>{label}</button>)}</div>;
}

type Column<T> = { key: string; label: string; value?: (row: T) => string | number; render?: (row: T) => ReactNode; className?: string };
function DataTable<T extends { id: string }>({ rows, columns, empty = "No record added yet.", filterLabel, filterValue, filterOptions, onFilterChange }: { rows: T[]; columns: Column<T>[]; empty?: string; filterLabel?: string; filterValue?: string; filterOptions?: string[]; onFilterChange?: (value: string) => void }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(columns[0]?.key || "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = !query ? rows : rows.filter((row) => columns.some((column) => String(column.value ? column.value(row) : (row as Record<string, unknown>)[column.key] ?? "").toLowerCase().includes(query)));
    return [...filtered].sort((a, b) => {
      const column = columns.find((item) => item.key === sortKey);
      const av = column?.value ? column.value(a) : (a as Record<string, unknown>)[sortKey];
      const bv = column?.value ? column.value(b) : (b as Record<string, unknown>)[sortKey];
      const result = typeof av === "number" && typeof bv === "number" ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDirection === "asc" ? result : -result;
    });
  }, [rows, columns, search, sortKey, sortDirection]);
  const changeSort = (key: string) => {
    if (sortKey === key) setSortDirection((prev) => prev === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
  };
  return <>
    <div className="table-tools no-print">
      <input className="table-search" placeholder="Search records..." value={search} onChange={(event) => setSearch(event.target.value)} />
      {filterOptions && onFilterChange ? <label className="filter-control"><span>{filterLabel || "Filter"}</span><select value={filterValue} onChange={(event) => onFilterChange(event.target.value)}>{filterOptions.map((item) => <option key={item} value={item}>{item === "all" ? "All" : titleCase(item)}</option>)}</select></label> : null}
    </div>
    <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key} className={column.className}><button className="sort-button" onClick={() => changeSort(column.key)}>{column.label}{sortKey === column.key ? <span>{sortDirection === "asc" ? " ↑" : " ↓"}</span> : null}</button></th>)}</tr></thead><tbody>{visibleRows.length ? visibleRows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key} className={column.className}>{column.render ? column.render(row) : String(column.value ? column.value(row) : (row as Record<string, unknown>)[column.key] ?? "—")}</td>)}</tr>) : <tr><td colSpan={columns.length} className="empty-row">{empty}</td></tr>}</tbody></table></div>
  </>;
}

function Workflow({ steps }: { steps: string[] }) {
  return <div className="workflow">{steps.map((step, index) => <div key={step} className="workflow-step"><span>{index + 1}</span><strong>{step}</strong>{index < steps.length - 1 ? <b>↓</b> : null}</div>)}</div>;
}

function InlineNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "success" }) {
  return <div className={`note-box note-${tone}`}>{children}</div>;
}

function calculateMetrics(data: ERPData) {
  const saleTotal = data.sales.reduce((sum, item) => sum + item.total, 0);
  const salePaid = data.sales.reduce((sum, item) => sum + item.paidAmount, 0);
  const grindingTotal = data.grindingJobs.reduce((sum, item) => sum + item.charges, 0);
  const grindingPaid = data.grindingJobs.reduce((sum, item) => sum + item.paidAmount, 0);
  const fuelTotal = data.machineReadings.reduce((sum, item) => sum + readingAmount(item), 0);
  const fuelPaid = data.machineReadings.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalSales = saleTotal + grindingTotal + fuelTotal;
  const totalCollection = salePaid + grindingPaid + fuelPaid;
  const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0) + data.salaryPayments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
  const purchaseCost = data.rawMaterialPurchases.reduce((sum, item) => sum + item.quantity * item.rate, 0) + data.fuelPurchases.reduce((sum, item) => sum + item.liters * item.rate, 0) + data.storePurchases.reduce((sum, item) => sum + item.quantity * item.rate, 0) + data.gasPurchases.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const cashReceived = data.cashEntries.filter((item) => item.type === "received").reduce((sum, item) => sum + item.amount, 0);
  const cashPaid = data.cashEntries.filter((item) => item.type === "paid" || item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const cashBalance = data.settings.openingCashBalance + cashReceived - cashPaid;
  const feedDue = data.sales.filter((item) => item.business === "feed").reduce((sum, item) => sum + Math.max(item.total - item.paidAmount, 0), 0);
  const flourDue = data.sales.filter((item) => item.business === "chakki").reduce((sum, item) => sum + Math.max(item.total - item.paidAmount, 0), 0) + data.grindingJobs.reduce((sum, item) => sum + Math.max(item.charges - item.paidAmount, 0), 0);
  const petrolDue = data.machineReadings.reduce((sum, item) => sum + Math.max(readingAmount(item) - item.paidAmount, 0), 0);
  const storeDue = data.sales.filter((item) => item.business === "store").reduce((sum, item) => sum + Math.max(item.total - item.paidAmount, 0), 0);
  const gasDue = data.sales.filter((item) => item.business === "gas").reduce((sum, item) => sum + Math.max(item.total - item.paidAmount, 0), 0);
  const outstandingCredit = feedDue + flourDue + petrolDue + storeDue + gasDue;
  const petrolPurchased = data.fuelPurchases.filter((item) => item.fuelType === "petrol").reduce((sum, item) => sum + item.liters, 0);
  const dieselPurchased = data.fuelPurchases.filter((item) => item.fuelType === "diesel").reduce((sum, item) => sum + item.liters, 0);
  const petrolSold = data.machineReadings.filter((item) => item.fuelType === "petrol").reduce((sum, item) => sum + soldLiters(item), 0);
  const dieselSold = data.machineReadings.filter((item) => item.fuelType === "diesel").reduce((sum, item) => sum + soldLiters(item), 0);
  const petrolStock = data.settings.openingPetrolLiters + petrolPurchased - petrolSold;
  const dieselStock = data.settings.openingDieselLiters + dieselPurchased - dieselSold;
  const inventoryValue = data.rawMaterials.reduce((sum, item) => sum + item.stock * item.averageRate, 0) + data.bagInventory.reduce((sum, item) => sum + item.quantity * item.costRate, 0) + data.flourProducts.reduce((sum, item) => sum + item.stock * item.costRate, 0) + data.storeProducts.reduce((sum, item) => sum + item.stock * item.costRate, 0) + data.gasProducts.reduce((sum, item) => sum + item.stock * item.costRate, 0) + petrolStock * 271.5 + dieselStock * 279.2;
  const lowStockItems = [
    ...data.rawMaterials.filter((item) => item.stock <= item.reorderLevel).map((item) => ({ id: item.id, business: "Feed Unit", item: item.name, stock: `${fmt(item.stock)} ${item.unit}`, reorder: `${fmt(item.reorderLevel)} ${item.unit}` })),
    ...data.bagInventory.filter((item) => item.quantity <= item.reorderLevel).map((item) => ({ id: item.id, business: "Feed Unit", item: item.productName, stock: `${fmt(item.quantity)} bags`, reorder: `${fmt(item.reorderLevel)} bags` })),
    ...data.flourProducts.filter((item) => item.stock <= item.reorderLevel).map((item) => ({ id: item.id, business: "Chakki", item: item.name, stock: `${fmt(item.stock)} bags`, reorder: `${fmt(item.reorderLevel)} bags` })),
    ...data.storeProducts.filter((item) => item.stock <= item.reorderLevel).map((item) => ({ id: item.id, business: "Super Store", item: item.name, stock: `${fmt(item.stock)} pcs`, reorder: `${fmt(item.reorderLevel)} pcs` })),
    ...data.gasProducts.filter((item) => item.stock <= item.reorderLevel).map((item) => ({ id: item.id, business: "Gas", item: item.name, stock: `${fmt(item.stock)} ${item.unit}`, reorder: `${fmt(item.reorderLevel)} ${item.unit}` })),
    ...(petrolStock <= data.settings.petrolReorderLevel ? [{ id: "petrol-stock", business: "Petrol Pump", item: "Petrol Tank", stock: `${fmt(petrolStock)} L`, reorder: `${fmt(data.settings.petrolReorderLevel)} L` }] : []),
    ...(dieselStock <= data.settings.dieselReorderLevel ? [{ id: "diesel-stock", business: "Petrol Pump", item: "Diesel Tank", stock: `${fmt(dieselStock)} L`, reorder: `${fmt(data.settings.dieselReorderLevel)} L` }] : []),
  ];
  const todaySales = data.sales.filter((item) => item.date === today()).reduce((sum, item) => sum + item.total, 0) + data.grindingJobs.filter((item) => item.date === today()).reduce((sum, item) => sum + item.charges, 0) + data.machineReadings.filter((item) => item.date === today()).reduce((sum, item) => sum + readingAmount(item), 0);
  const todayExpenses = data.expenses.filter((item) => item.date === today()).reduce((sum, item) => sum + item.amount, 0) + data.salaryPayments.filter((item) => item.date === today() && item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
  const todayCollection = data.cashEntries.filter((item) => item.date === today() && item.type === "received").reduce((sum, item) => sum + item.amount, 0);
  const cashSales = data.sales.filter((item) => item.paymentType === "cash").reduce((sum, item) => sum + item.total, 0) + data.grindingJobs.filter((item) => item.paymentType === "cash").reduce((sum, item) => sum + item.charges, 0) + data.machineReadings.filter((item) => item.paymentType === "cash").reduce((sum, item) => sum + readingAmount(item), 0);
  const creditSales = totalSales - cashSales;
  const estimatedProfit = totalSales - totalExpenses - purchaseCost * 0.18;
  return { saleTotal, grindingTotal, fuelTotal, totalSales, totalCollection, totalExpenses, purchaseCost, cashBalance, outstandingCredit, feedDue, flourDue, petrolDue, storeDue, gasDue, petrolStock, dieselStock, inventoryValue, lowStockItems, todaySales, todayExpenses, todayCollection, cashSales, creditSales, estimatedProfit };
}

export default function DashboardApp() {
  const [data, setData, mounted] = useERPStore();
  const [session, setSession] = useLocalStore<UserSession | null>("fp-session", null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loginEmail, setLoginEmail] = useState("admin@demo.com");
  const [loginPassword, setLoginPassword] = useState("admin123");
  const [loginError, setLoginError] = useState("");
  const [printDocument, setPrintDocument] = useState<PrintDocument | null>(null);
  const isAdmin = session?.role === "admin";
  const metrics = useMemo(() => calculateMetrics(data), [data]);

  const commit = (area: string, action: string, detail: string, updater: (current: ERPData) => ERPData) => {
    setData((current) => {
      const updated = updater(current);
      const log: AuditLog = { id: uid(), dateTime: new Date().toLocaleString(), user: session?.name || "Demo User", area, action, detail };
      return { ...updated, auditLogs: [log, ...updated.auditLogs].slice(0, 250) };
    });
  };

  const deleteRecord = <K extends keyof ERPData>(key: K, id: string, area: string, label: string) => {
    if (!isAdmin) return;
    commit(area, `Delete ${label}`, id, (current) => ({ ...current, [key]: (current[key] as unknown as Array<{ id: string }>).filter((item) => item.id !== id) }));
  };

  const addCashEntry = (current: ERPData, entry: Omit<CashEntry, "id">) => ({ ...current, cashEntries: [{ ...entry, id: uid() }, ...current.cashEntries] });

  const openPrint = (document: PrintDocument) => setPrintDocument(document);

  const login = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const user = data.users.find((item) => item.email.toLowerCase() === loginEmail.toLowerCase() && item.password === loginPassword && item.status === "active");
    if (!user) { setLoginError("Invalid email or password. Use the demo credentials below."); return; }
    setSession({ name: user.name, email: user.email, role: user.role });
    setLoginError("");
  };

  if (!mounted) return <div className="loading-screen"><div className="brand-mark">PK</div><strong>Loading ERP Suite...</strong></div>;

  if (!session) {
    return <main className="login-page"><section className="login-card"><div className="brand-mark">PK</div><span className="version-pill">Version 2.0</span><h1>PK Business ERP Suite</h1><p>Clickable multi-business ERP demo for Feed Unit, Chakki, Petrol Pump, Super Store, Gas Management, Cash Book and reporting.</p><form className="login-form" onSubmit={login}><label>Email<input type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required /></label><label>Password<input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required /></label>{loginError ? <div className="form-error">{loginError}</div> : null}<button>Sign In</button></form><div className="demo-credentials"><strong>Demo credentials</strong><span>Admin: admin@demo.com / admin123</span><span>Staff: staff@demo.com / staff123</span></div></section></main>;
  }

  const navItems: Array<[TabKey, string]> = [
    ["overview", "Dashboard"], ["feed", "Feed Unit"], ["chakki", "Chakki"], ["petrol", "Petrol Pump"], ["store", "Super Store"], ["gas", "Gas Management"], ["cashbook", "Cash Book"], ["staff", "Staff"], ["reports", "Reports / Print"], ["settings", "Settings"],
  ];
  const pageTitle: Record<TabKey, string> = { overview: "Business Dashboard", feed: "Feed Unit Management", chakki: "Chakki Management", petrol: "Petrol Pump Management", store: "Super Store Management", gas: "Gas Management", cashbook: "Cash Book", staff: "Staff & Salary", reports: "Reports & Print", settings: "System Settings" };

  return <>
    <main className="app-shell">
      <aside className="sidebar no-print">
        <div className="logo-wrap"><div className="brand-mark small">PK</div><div><strong>{data.settings.businessName}</strong><span>Version {data.settings.version}</span></div></div>
        <nav>{navItems.map(([key, label]) => <button key={key} className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)}>{label}</button>)}</nav>
        <div className="sidebar-status"><span className="status-dot" /> LocalStorage active</div>
        <button className="logout" onClick={() => setSession(null)}>Sign Out</button>
      </aside>
      <section className="content-area">
        <header className="topbar no-print"><div><p>{new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p><h1>{pageTitle[activeTab]}</h1></div><div className="topbar-actions"><button className="notification-button" onClick={() => setActiveTab("overview")}>Notifications <b>{metrics.lowStockItems.length + (metrics.outstandingCredit > 0 ? 1 : 0)}</b></button><div className="user-chip"><strong>{session.name}</strong><span>{titleCase(session.role)}</span></div></div></header>
        {activeTab === "overview" ? <Overview data={data} metrics={metrics} navigate={setActiveTab} openPrint={openPrint} /> : null}
        {activeTab === "feed" ? <FeedUnitPanel data={data} setData={setData} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} /> : null}
        {activeTab === "chakki" ? <ChakkiPanel data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} /> : null}
        {activeTab === "petrol" ? <PetrolPanel data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} metrics={metrics} /> : null}
        {activeTab === "store" ? <StorePanel data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} /> : null}
        {activeTab === "gas" ? <GasPanel data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} /> : null}
        {activeTab === "cashbook" ? <CashBookPanel data={data} commit={commit} deleteRecord={deleteRecord} metrics={metrics} openPrint={openPrint} /> : null}
        {activeTab === "staff" ? <StaffPanel data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} /> : null}
        {activeTab === "reports" ? <ReportsPanel data={data} metrics={metrics} openPrint={openPrint} /> : null}
        {activeTab === "settings" ? <SettingsPanel data={data} setData={setData} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin} /> : null}
      </section>
    </main>
    {printDocument ? <PrintPreview document={printDocument} onClose={() => setPrintDocument(null)} /> : null}
  </>;
}

function Overview({ data, metrics, navigate, openPrint }: { data: ERPData; metrics: ReturnType<typeof calculateMetrics>; navigate: (tab: TabKey) => void; openPrint: (document: PrintDocument) => void }) {
  const months = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setMonth(date.getMonth() - (5 - index));
    const key = date.toISOString().slice(0, 7);
    const sales = data.sales.filter((item) => monthKey(item.date) === key).reduce((sum, item) => sum + item.total, 0) + data.grindingJobs.filter((item) => monthKey(item.date) === key).reduce((sum, item) => sum + item.charges, 0) + data.machineReadings.filter((item) => monthKey(item.date) === key).reduce((sum, item) => sum + readingAmount(item), 0);
    return { key, label: date.toLocaleDateString("en-PK", { month: "short" }), sales };
  }), [data]);
  const maxSales = Math.max(...months.map((item) => item.sales), 1);
  const currentMonth = today().slice(0, 7);
  const hasSalaryDue = data.staff.some((member) => member.status === "active" && !data.salaryPayments.some((payment) => payment.staffId === member.id && payment.month === currentMonth && payment.status === "paid"));
  const daysSinceBackup = Math.floor((Date.now() - new Date(data.settings.lastBackupAt || dateOffset(-30)).getTime()) / 86400000);
  const notifications = [
    ...metrics.lowStockItems.slice(0, 4).map((item) => ({ id: item.id, title: `Low stock: ${item.item}`, detail: `${item.business} has ${item.stock} remaining.`, type: "warning" })),
    ...(metrics.outstandingCredit > 0 ? [{ id: "credit-due", title: "Credit due", detail: `${money(metrics.outstandingCredit)} is outstanding across businesses.`, type: "danger" }] : []),
    ...(hasSalaryDue ? [{ id: "salary-due", title: "Salary due", detail: "One or more active staff salaries are pending this month.", type: "warning" }] : []),
    ...(!data.closings.some((item) => item.period === "monthly" && item.date.slice(0, 7) === currentMonth) ? [{ id: "closing-reminder", title: "Monthly closing reminder", detail: "Current month closing has not been saved.", type: "info" }] : []),
    ...(daysSinceBackup >= 7 ? [{ id: "backup-reminder", title: "Backup reminder", detail: `Last backup was ${daysSinceBackup} days ago.`, type: "info" }] : []),
  ];
  return <div className="screen-stack">
    <section className="hero-panel"><div><p>PK Business ERP Suite</p><h2>One dashboard. Five businesses.</h2><span>Feed Unit, Chakki, Petrol Pump, Super Store and Gas Management with LocalStorage demo data.</span></div><button className="secondary-btn" onClick={() => openPrint({ title: "Business Dashboard Summary", subtitle: today(), fields: [["Today's Sales", money(metrics.todaySales)], ["Today's Expenses", money(metrics.todayExpenses)], ["Today's Profit", money(metrics.todaySales - metrics.todayExpenses)], ["Cash Balance", money(metrics.cashBalance)], ["Outstanding Credit", money(metrics.outstandingCredit)], ["Inventory Value", money(metrics.inventoryValue)]], footer: "PK Business ERP Suite Version 2.0" })}>Print Summary</button></section>
    <div className="business-cards">
      <button onClick={() => navigate("feed")}><span>Feed Unit</span><strong>{fmt(data.bagInventory.reduce((sum, item) => sum + item.quantity, 0))} bags</strong><small>Production, formula and bag sales</small></button>
      <button onClick={() => navigate("petrol")}><span>Petrol Pump</span><strong>{fmt(metrics.petrolStock + metrics.dieselStock)} L</strong><small>Tank stock and machine readings</small></button>
      <button onClick={() => navigate("store")}><span>Super Store</span><strong>{fmt(data.storeProducts.reduce((sum, item) => sum + item.stock, 0))} items</strong><small>Purchase, inventory and POS sales</small></button>
      <button onClick={() => navigate("gas")}><span>Gas Management</span><strong>{fmt(data.gasProducts.reduce((sum, item) => sum + item.stock, 0))} units</strong><small>Purchase, stock and sales</small></button>
    </div>
    <div className="stats-grid">
      <StatCard label="Today's Sales" value={money(metrics.todaySales)} hint="All business units" tone="success" />
      <StatCard label="Today's Expenses" value={money(metrics.todayExpenses)} hint="Operational + salary" tone="danger" />
      <StatCard label="Today's Profit" value={money(metrics.todaySales - metrics.todayExpenses)} hint="Demo gross view" tone="success" />
      <StatCard label="Today's Collection" value={money(metrics.todayCollection)} hint="Cash received today" />
      <StatCard label="Cash Sales" value={money(metrics.cashSales)} hint="All-time cash sales" />
      <StatCard label="Credit Sales" value={money(metrics.creditSales)} hint="Credit and temporary" />
      <StatCard label="Outstanding Credit" value={money(metrics.outstandingCredit)} hint="Customer receivables" tone="warning" />
      <StatCard label="Inventory Summary" value={money(metrics.inventoryValue)} hint="Estimated stock value" />
    </div>
    <div className="two-col">
      <Panel title="Low Stock"><DataTable rows={metrics.lowStockItems} columns={[{ key: "business", label: "Business" }, { key: "item", label: "Item" }, { key: "stock", label: "Current" }, { key: "reorder", label: "Reorder At" }]} empty="All stock levels are healthy." /></Panel>
      <Panel title="Notifications"><div className="notification-list">{notifications.length ? notifications.map((item) => <div key={item.id} className={`notification-item ${item.type}`}><strong>{item.title}</strong><span>{item.detail}</span></div>) : <div className="empty-card">No active notification.</div>}</div></Panel>
    </div>
    <div className="two-col">
      <Panel title="Recent Activities"><div className="activity-list">{data.auditLogs.slice(0, 8).map((item) => <div key={item.id}><span>{item.dateTime}</span><strong>{item.action}</strong><small>{item.area} · {item.detail}</small></div>)}</div></Panel>
      <Panel title="Quick Actions"><div className="quick-actions"><button onClick={() => navigate("feed")}>New Feed Production</button><button onClick={() => navigate("chakki")}>Grinding Receipt</button><button onClick={() => navigate("petrol")}>Machine Reading</button><button onClick={() => navigate("store")}>Store Sale</button><button onClick={() => navigate("cashbook")}>Cash Entry</button><button onClick={() => navigate("reports")}>Monthly Report</button></div></Panel>
    </div>
    <Panel title="Monthly Charts"><div className="bar-chart">{months.map((item) => <div key={item.key} className="bar-column"><div className="bar-value">{money(item.sales)}</div><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max((item.sales / maxSales) * 100, 4)}%` }} /></div><strong>{item.label}</strong></div>)}</div></Panel>
  </div>;
}

type CommitFn = (area: string, action: string, detail: string, updater: (current: ERPData) => ERPData) => void;
type DeleteFn = <K extends keyof ERPData>(key: K, id: string, area: string, label: string) => void;
type CashAdder = (current: ERPData, entry: Omit<CashEntry, "id">) => ERPData;

function ContactManager({ type, business, data, commit, deleteRecord, isAdmin }: { type: "supplier" | "customer"; business: BusinessKey; data: ERPData; commit: CommitFn; deleteRecord: DeleteFn; isAdmin: boolean }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", amount: "0", creditLimit: "0" });
  const rows = type === "supplier" ? data.suppliers.filter((item) => item.business === business) : data.customers.filter((item) => item.business === business);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (type === "supplier") {
      const record: Supplier = { id: uid(), business, name: form.name, phone: form.phone, address: form.address, openingBalance: toNum(form.amount) };
      commit(businessLabel(business), "Add supplier", record.name, (current) => ({ ...current, suppliers: [record, ...current.suppliers] }));
    } else {
      const record: Customer = { id: uid(), business, name: form.name, phone: form.phone, address: form.address, openingBalance: toNum(form.amount), creditLimit: toNum(form.creditLimit) };
      commit(businessLabel(business), "Add customer", record.name, (current) => ({ ...current, customers: [record, ...current.customers] }));
    }
    setForm({ name: "", phone: "", address: "", amount: "0", creditLimit: "0" });
  };
  return <Panel title={`${type === "supplier" ? "Supplier" : "Customer"} Management`}>
    <form className="form-grid wide" onSubmit={submit}><input placeholder={`${titleCase(type)} name`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><input placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /><input placeholder="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /><input type="number" min="0" placeholder="Opening balance" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />{type === "customer" ? <input type="number" min="0" placeholder="Credit limit" value={form.creditLimit} onChange={(event) => setForm({ ...form, creditLimit: event.target.value })} /> : null}<button>Add {titleCase(type)}</button></form>
    <DataTable rows={rows} columns={[{ key: "name", label: "Name" }, { key: "phone", label: "Phone" }, { key: "address", label: "Address" }, { key: "openingBalance", label: "Opening Balance", value: (row) => row.openingBalance, render: (row) => money(row.openingBalance) }, ...(type === "customer" ? [{ key: "creditLimit", label: "Credit Limit", value: (row: Customer) => row.creditLimit, render: (row: Customer) => money(row.creditLimit) } as Column<Supplier | Customer>] : []), { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord(type === "supplier" ? "suppliers" : "customers", row.id, businessLabel(business), type)}>Delete</button> : <span className="muted-text">View only</span> }]} />
  </Panel>;
}

function ExpenseManager({ business, data, commit, deleteRecord, addCashEntry, isAdmin, openPrint }: { business: BusinessKey; data: ERPData; commit: CommitFn; deleteRecord: DeleteFn; addCashEntry: CashAdder; isAdmin: boolean; openPrint: (document: PrintDocument) => void }) {
  const [form, setForm] = useState({ date: today(), title: "", category: "Utilities", amount: "", paymentType: "cash" as "cash" | "credit", notes: "" });
  const rows = data.expenses.filter((item) => item.business === business);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const record: Expense = { id: uid(), business, date: form.date, title: form.title, category: form.category, amount: toNum(form.amount), paymentType: form.paymentType, notes: form.notes };
    commit(businessLabel(business), "Add expense", `${record.title}: ${money(record.amount)}`, (current) => {
      let next: ERPData = { ...current, expenses: [record, ...current.expenses] };
      if (record.paymentType === "cash") next = addCashEntry(next, { date: record.date, type: "expense", business, category: record.category, reference: record.id, description: record.title, amount: record.amount });
      return next;
    });
    setForm({ date: today(), title: "", category: "Utilities", amount: "", paymentType: "cash", notes: "" });
  };
  return <Panel title={`${businessLabel(business)} Expenses`} actions={<button className="secondary-btn" onClick={() => openPrint({ title: `${businessLabel(business)} Expense Report`, subtitle: `Generated ${today()}`, columns: ["Date", "Title", "Category", "Amount", "Payment"], rows: rows.map((item) => [item.date, item.title, item.category, money(item.amount), titleCase(item.paymentType)]), footer: `Total: ${money(rows.reduce((sum, item) => sum + item.amount, 0))}` })}>Print Expense Report</button>}>
    <form className="form-grid wide" onSubmit={submit}><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /><input placeholder="Expense title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Utilities</option><option>Maintenance</option><option>Transport</option><option>Rent</option><option>Office</option><option>Other</option></select><input type="number" min="0" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /><select value={form.paymentType} onChange={(event) => setForm({ ...form, paymentType: event.target.value as "cash" | "credit" })}><option value="cash">Cash</option><option value="credit">Credit</option></select><input placeholder="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /><button>Add Expense</button></form>
    <DataTable rows={rows} columns={[{ key: "date", label: "Date" }, { key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }, { key: "notes", label: "Notes" }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("expenses", row.id, businessLabel(business), "expense")}>Delete</button> : <span className="muted-text">View only</span> }]} />
  </Panel>;
}

function BusinessStaffView({ business, data }: { business: BusinessKey; data: ERPData }) {
  const rows = data.staff.filter((item) => item.business === business || item.business === "common");
  return <Panel title={`${businessLabel(business)} Staff`}><DataTable rows={rows} columns={[{ key: "name", label: "Name" }, { key: "roleTitle", label: "Role" }, { key: "phone", label: "Phone" }, { key: "monthlySalary", label: "Monthly Salary", value: (row) => row.monthlySalary, render: (row) => money(row.monthlySalary) }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }]} /></Panel>;
}

function BusinessSalaryView({ business, data }: { business: BusinessKey; data: ERPData }) {
  const staffIds = new Set(data.staff.filter((item) => item.business === business || item.business === "common").map((item) => item.id));
  const rows = data.salaryPayments.filter((item) => staffIds.has(item.staffId));
  return <Panel title={`${businessLabel(business)} Salary History`}><DataTable rows={rows} columns={[{ key: "date", label: "Date" }, { key: "month", label: "Salary Month" }, { key: "staffId", label: "Staff", value: (row) => data.staff.find((item) => item.id === row.staffId)?.name || "Unknown" }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }, { key: "notes", label: "Notes" }]} /></Panel>;
}

function SimpleBusinessReport({ business, data, openPrint }: { business: BusinessKey; data: ERPData; openPrint: (document: PrintDocument) => void }) {
  const sales = data.sales.filter((item) => item.business === business);
  const expenses = data.expenses.filter((item) => item.business === business);
  const extraSales = business === "chakki" ? data.grindingJobs.reduce((sum, item) => sum + item.charges, 0) : business === "petrol" ? data.machineReadings.reduce((sum, item) => sum + readingAmount(item), 0) : 0;
  const totalSales = sales.reduce((sum, item) => sum + item.total, 0) + extraSales;
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  return <div className="screen-stack"><div className="stats-grid compact"><StatCard label="Sales" value={money(totalSales)} /><StatCard label="Expenses" value={money(totalExpenses)} /><StatCard label="Profit" value={money(totalSales - totalExpenses)} tone="success" /><StatCard label="Transactions" value={fmt(sales.length + (business === "chakki" ? data.grindingJobs.length : business === "petrol" ? data.machineReadings.length : 0))} /></div><Panel title={`${businessLabel(business)} Report`} actions={<button className="primary-btn" onClick={() => openPrint({ title: `${businessLabel(business)} Monthly Report`, subtitle: new Date().toLocaleDateString("en-PK", { month: "long", year: "numeric" }), fields: [["Sales", money(totalSales)], ["Expenses", money(totalExpenses)], ["Estimated Profit", money(totalSales - totalExpenses)], ["Transactions", String(sales.length)]], columns: ["Date", "Invoice", "Customer", "Product", "Total", "Paid"], rows: sales.map((item) => [item.date, item.invoiceNo, item.customerName, item.productName, money(item.total), money(item.paidAmount)]), footer: "Generated by PK Business ERP Suite Version 2.0" })}>Print Monthly Report</button>}><DataTable rows={sales} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Product" }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "paidAmount", label: "Paid", value: (row) => row.paidAmount, render: (row) => money(row.paidAmount) }]} /></Panel></div>;
}

type FeedSection = "partners" | "investment" | "investment-history" | "suppliers" | "purchases" | "raw-inventory" | "production" | "batches" | "formula" | "production-cost" | "finished-goods" | "finished-bags" | "bag-inventory" | "bag-sales" | "customers" | "expenses" | "staff" | "salary" | "reports" | "settings";
function FeedUnitPanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint }: { data: ERPData; setData: Dispatch<SetStateAction<ERPData>>; commit: CommitFn; deleteRecord: DeleteFn; addCashEntry: CashAdder; isAdmin: boolean; openPrint: (document: PrintDocument) => void }) {
  const [section, setSection] = useState<FeedSection>("partners");
  const [partnerForm, setPartnerForm] = useState({ name: "", phone: "", sharePercent: "" });
  const [investmentForm, setInvestmentForm] = useState({ date: today(), partnerId: data.partners[0]?.id || "", type: "investment" as "investment" | "withdrawal", amount: "", notes: "" });
  const [materialForm, setMaterialForm] = useState({ name: "", unit: "kg", openingStock: "", reorderLevel: "", averageRate: "" });
  const [purchaseForm, setPurchaseForm] = useState({ date: today(), invoiceNo: `PUR-F-${Date.now().toString().slice(-5)}`, supplierId: data.suppliers.find((item) => item.business === "feed")?.id || "", materialId: data.rawMaterials[0]?.id || "", quantity: "", rate: "", paymentType: "cash" as "cash" | "credit", paidAmount: "" });
  const [formulaForm, setFormulaForm] = useState({ name: "", outputKg: "1000", material1: data.rawMaterials[0]?.id || "", qty1: "", material2: data.rawMaterials[1]?.id || data.rawMaterials[0]?.id || "", qty2: "", notes: "" });
  const [productionForm, setProductionForm] = useState({ date: today(), batchNo: `BATCH-${today().replaceAll("-", "")}-${String(data.productionBatches.length + 1).padStart(2, "0")}`, formulaId: data.feedFormulas[0]?.id || "", outputKg: "1000", bagSize: "40", productName: "Dairy Gold Feed", saleRate: "5200", notes: "" });
  const [saleForm, setSaleForm] = useState({ date: today(), invoiceNo: `INV-F-${1000 + data.sales.filter((item) => item.business === "feed").length + 1}`, customerId: data.customers.find((item) => item.business === "feed")?.id || "", productId: data.bagInventory[0]?.id || "", quantity: "", rate: String(data.bagInventory[0]?.saleRate || ""), paymentType: "cash" as PaymentType, paidAmount: "", dueDate: dateOffset(7), remarks: "" });

  const tabs: Array<[FeedSection, string]> = [["partners", "Partner Management"], ["investment", "Investment Management"], ["investment-history", "Investment History"], ["suppliers", "Supplier Management"], ["purchases", "Purchase Management"], ["raw-inventory", "Raw Material Inventory"], ["production", "Feed Production"], ["batches", "Batch Production"], ["formula", "Feed Formula"], ["production-cost", "Production Cost"], ["finished-goods", "Finished Goods"], ["finished-bags", "Finished Feed Bags"], ["bag-inventory", "Bag Inventory"], ["bag-sales", "Bag Sales"], ["customers", "Customers"], ["expenses", "Expenses"], ["staff", "Staff"], ["salary", "Salary"], ["reports", "Reports"], ["settings", "Settings"]];

  const addPartner = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const record: Partner = { id: uid(), name: partnerForm.name, phone: partnerForm.phone, sharePercent: toNum(partnerForm.sharePercent), status: "active" };
    commit("Feed Unit", "Add partner", record.name, (current) => ({ ...current, partners: [record, ...current.partners] }));
    setPartnerForm({ name: "", phone: "", sharePercent: "" });
  };
  const addInvestment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const record: Investment = { id: uid(), date: investmentForm.date, partnerId: investmentForm.partnerId, type: investmentForm.type, amount: toNum(investmentForm.amount), notes: investmentForm.notes };
    const partner = data.partners.find((item) => item.id === record.partnerId)?.name || "Partner";
    commit("Feed Unit", `Add ${record.type}`, `${partner}: ${money(record.amount)}`, (current) => {
      let next: ERPData = { ...current, investments: [record, ...current.investments] };
      next = addCashEntry(next, { date: record.date, type: record.type === "investment" ? "received" : "paid", business: "feed", category: "Partner Capital", reference: record.id, description: `${partner} ${record.type}`, amount: record.amount });
      return next;
    });
    setInvestmentForm({ ...investmentForm, amount: "", notes: "" });
  };
  const addMaterial = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const record: RawMaterial = { id: uid(), name: materialForm.name, unit: materialForm.unit, stock: toNum(materialForm.openingStock), reorderLevel: toNum(materialForm.reorderLevel), averageRate: toNum(materialForm.averageRate) };
    commit("Feed Unit", "Add raw material", record.name, (current) => ({ ...current, rawMaterials: [record, ...current.rawMaterials] }));
    setMaterialForm({ name: "", unit: "kg", openingStock: "", reorderLevel: "", averageRate: "" });
  };
  const addPurchase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const record: RawMaterialPurchase = { id: uid(), date: purchaseForm.date, invoiceNo: purchaseForm.invoiceNo, supplierId: purchaseForm.supplierId, materialId: purchaseForm.materialId, quantity: toNum(purchaseForm.quantity), rate: toNum(purchaseForm.rate), paymentType: purchaseForm.paymentType, paidAmount: purchaseForm.paymentType === "cash" ? toNum(purchaseForm.quantity) * toNum(purchaseForm.rate) : toNum(purchaseForm.paidAmount) };
    const material = data.rawMaterials.find((item) => item.id === record.materialId);
    commit("Feed Unit", "Add raw material purchase", `${material?.name || "Material"}: ${fmt(record.quantity)} kg`, (current) => {
      const materials = current.rawMaterials.map((item) => {
        if (item.id !== record.materialId) return item;
        const oldValue = item.stock * item.averageRate;
        const newStock = item.stock + record.quantity;
        return { ...item, stock: newStock, averageRate: newStock ? (oldValue + record.quantity * record.rate) / newStock : record.rate };
      });
      let next: ERPData = { ...current, rawMaterials: materials, rawMaterialPurchases: [record, ...current.rawMaterialPurchases] };
      if (record.paidAmount > 0) next = addCashEntry(next, { date: record.date, type: "paid", business: "feed", category: "Raw Material Purchase", reference: record.invoiceNo, description: material?.name || "Raw material", amount: record.paidAmount });
      return next;
    });
    setPurchaseForm({ ...purchaseForm, invoiceNo: `PUR-F-${Date.now().toString().slice(-5)}`, quantity: "", rate: "", paidAmount: "" });
  };
  const addFormula = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ingredients = [{ materialId: formulaForm.material1, quantity: toNum(formulaForm.qty1) }, { materialId: formulaForm.material2, quantity: toNum(formulaForm.qty2) }].filter((item) => item.materialId && item.quantity > 0);
    const record: FeedFormula = { id: uid(), name: formulaForm.name, outputKg: toNum(formulaForm.outputKg), ingredients, notes: formulaForm.notes };
    commit("Feed Unit", "Add feed formula", record.name, (current) => ({ ...current, feedFormulas: [record, ...current.feedFormulas] }));
    setFormulaForm({ ...formulaForm, name: "", qty1: "", qty2: "", notes: "" });
  };
  const produceFeed = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formula = data.feedFormulas.find((item) => item.id === productionForm.formulaId);
    if (!formula) return;
    const outputKg = toNum(productionForm.outputKg);
    const scale = outputKg / formula.outputKg;
    const shortages = formula.ingredients.filter((ingredient) => (data.rawMaterials.find((item) => item.id === ingredient.materialId)?.stock || 0) < ingredient.quantity * scale);
    if (shortages.length) { window.alert(`Insufficient stock: ${shortages.map((item) => data.rawMaterials.find((material) => material.id === item.materialId)?.name).join(", ")}`); return; }
    const bagSize = toNum(productionForm.bagSize);
    const bagsProduced = Math.floor(outputKg / bagSize);
    const productionCost = formula.ingredients.reduce((sum, ingredient) => {
      const material = data.rawMaterials.find((item) => item.id === ingredient.materialId);
      return sum + ingredient.quantity * scale * (material?.averageRate || 0);
    }, 0);
    const record: ProductionBatch = { id: uid(), date: productionForm.date, batchNo: productionForm.batchNo, formulaId: formula.id, outputKg, bagSize, bagsProduced, productionCost, notes: productionForm.notes };
    commit("Feed Unit", "Complete production batch", `${record.batchNo}: ${fmt(outputKg)} kg`, (current) => {
      const rawMaterials = current.rawMaterials.map((material) => {
        const ingredient = formula.ingredients.find((item) => item.materialId === material.id);
        return ingredient ? { ...material, stock: material.stock - ingredient.quantity * scale } : material;
      });
      const existingFinished = current.finishedGoods.find((item) => item.name === "Finished Feed");
      const finishedGoods = existingFinished ? current.finishedGoods.map((item) => item.id === existingFinished.id ? { ...item, stockKg: item.stockKg + outputKg, averageCost: productionCost / outputKg } : item) : [{ id: uid(), name: "Finished Feed", stockKg: outputKg, averageCost: productionCost / outputKg }, ...current.finishedGoods];
      const existingBag = current.bagInventory.find((item) => item.productName === productionForm.productName && item.bagSize === bagSize);
      const bagInventory = existingBag ? current.bagInventory.map((item) => item.id === existingBag.id ? { ...item, quantity: item.quantity + bagsProduced, costRate: productionCost / Math.max(bagsProduced, 1), saleRate: toNum(productionForm.saleRate) || item.saleRate } : item) : [{ id: uid(), productName: productionForm.productName, bagSize, quantity: bagsProduced, reorderLevel: 10, saleRate: toNum(productionForm.saleRate), costRate: productionCost / Math.max(bagsProduced, 1) }, ...current.bagInventory];
      return { ...current, rawMaterials, finishedGoods, bagInventory, productionBatches: [record, ...current.productionBatches] };
    });
    setProductionForm({ ...productionForm, batchNo: `BATCH-${today().replaceAll("-", "")}-${String(data.productionBatches.length + 2).padStart(2, "0")}`, notes: "" });
  };
  const addBagSale = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const bag = data.bagInventory.find((item) => item.id === saleForm.productId);
    if (!bag) return;
    const quantity = toNum(saleForm.quantity);
    if (quantity > bag.quantity) { window.alert(`Only ${bag.quantity} bags are available.`); return; }
    const customer = data.customers.find((item) => item.id === saleForm.customerId);
    const total = quantity * toNum(saleForm.rate);
    const paidAmount = saleForm.paymentType === "cash" ? total : Math.min(toNum(saleForm.paidAmount), total);
    const record: Sale = { id: uid(), date: saleForm.date, business: "feed", invoiceNo: saleForm.invoiceNo, customerId: saleForm.customerId, customerName: customer?.name || "Walk-in Customer", productId: bag.id, productName: `${bag.productName} ${bag.bagSize} KG`, quantity, unit: "bags", rate: toNum(saleForm.rate), total, paidAmount, paymentType: saleForm.paymentType, dueDate: saleForm.paymentType === "cash" ? "" : saleForm.dueDate, remarks: saleForm.remarks };
    commit("Feed Unit", "Add bag sale", `${record.invoiceNo}: ${money(record.total)}`, (current) => {
      let next: ERPData = { ...current, sales: [record, ...current.sales], bagInventory: current.bagInventory.map((item) => item.id === bag.id ? { ...item, quantity: item.quantity - quantity } : item), finishedGoods: current.finishedGoods.map((item) => item.name === "Finished Feed" ? { ...item, stockKg: Math.max(item.stockKg - quantity * bag.bagSize, 0) } : item) };
      if (paidAmount > 0) next = addCashEntry(next, { date: record.date, type: "received", business: "feed", category: "Bag Sales", reference: record.invoiceNo, description: `${record.customerName} - ${record.productName}`, amount: paidAmount });
      return next;
    });
    openPrint({ title: "Feed Sale Invoice", subtitle: record.invoiceNo, fields: [["Date", record.date], ["Customer", record.customerName], ["Product", record.productName], ["Quantity", `${fmt(record.quantity)} bags`], ["Rate", money(record.rate)], ["Total", money(record.total)], ["Paid", money(record.paidAmount)], ["Balance", money(record.total - record.paidAmount)], ["Payment", titleCase(record.paymentType)]], footer: "Thank you for your business." });
    setSaleForm({ ...saleForm, invoiceNo: `INV-F-${1001 + data.sales.filter((item) => item.business === "feed").length + 1}`, quantity: "", paidAmount: "", remarks: "" });
  };

  const investmentRows = data.investments.map((item) => ({ ...item, partnerName: data.partners.find((partner) => partner.id === item.partnerId)?.name || "Unknown" }));
  const feedSales = data.sales.filter((item) => item.business === "feed");
  return <div className="screen-stack"><InlineNotice>Version 2 workflow: Raw Material Purchase → Inventory → Feed Formula → Production Batch → Finished Feed → Feed Bags → Inventory → Sales. Completing production automatically increases finished goods and bag stock.</InlineNotice><ModuleTabs items={tabs} active={section} onChange={setSection} />
    {section === "partners" ? <Panel title="Partner Management"><form className="form-grid wide" onSubmit={addPartner}><input placeholder="Partner name" value={partnerForm.name} onChange={(event) => setPartnerForm({ ...partnerForm, name: event.target.value })} required /><input placeholder="Phone" value={partnerForm.phone} onChange={(event) => setPartnerForm({ ...partnerForm, phone: event.target.value })} /><input type="number" min="0" max="100" placeholder="Share %" value={partnerForm.sharePercent} onChange={(event) => setPartnerForm({ ...partnerForm, sharePercent: event.target.value })} required /><button>Add Partner</button></form><DataTable rows={data.partners} columns={[{ key: "name", label: "Partner" }, { key: "phone", label: "Phone" }, { key: "sharePercent", label: "Share", value: (row) => row.sharePercent, render: (row) => `${fmt(row.sharePercent)}%` }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("partners", row.id, "Feed Unit", "partner")}>Delete</button> : <span className="muted-text">View only</span> }]} /></Panel> : null}
    {section === "investment" ? <Panel title="Investment Management"><form className="form-grid wide" onSubmit={addInvestment}><input type="date" value={investmentForm.date} onChange={(event) => setInvestmentForm({ ...investmentForm, date: event.target.value })} /><select value={investmentForm.partnerId} onChange={(event) => setInvestmentForm({ ...investmentForm, partnerId: event.target.value })}>{data.partners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={investmentForm.type} onChange={(event) => setInvestmentForm({ ...investmentForm, type: event.target.value as "investment" | "withdrawal" })}><option value="investment">Investment</option><option value="withdrawal">Withdrawal</option></select><input type="number" min="0" placeholder="Amount" value={investmentForm.amount} onChange={(event) => setInvestmentForm({ ...investmentForm, amount: event.target.value })} required /><input placeholder="Notes" value={investmentForm.notes} onChange={(event) => setInvestmentForm({ ...investmentForm, notes: event.target.value })} /><button>Save Investment</button></form><div className="stats-grid compact"><StatCard label="Total Investment" value={money(data.investments.filter((item) => item.type === "investment").reduce((sum, item) => sum + item.amount, 0))} /><StatCard label="Withdrawals" value={money(data.investments.filter((item) => item.type === "withdrawal").reduce((sum, item) => sum + item.amount, 0))} /><StatCard label="Net Capital" value={money(data.investments.reduce((sum, item) => sum + (item.type === "investment" ? item.amount : -item.amount), 0))} /><StatCard label="Partners" value={fmt(data.partners.length)} /></div></Panel> : null}
    {section === "investment-history" ? <Panel title="Investment History"><DataTable rows={investmentRows} columns={[{ key: "date", label: "Date" }, { key: "partnerName", label: "Partner" }, { key: "type", label: "Type", render: (row) => titleCase(row.type) }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "notes", label: "Notes" }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("investments", row.id, "Feed Unit", "investment")}>Delete</button> : <span className="muted-text">View only</span> }]} /></Panel> : null}
    {section === "suppliers" ? <ContactManager type="supplier" business="feed" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin} /> : null}
    {section === "purchases" ? <Panel title="Raw Material Purchase"><form className="form-grid wide" onSubmit={addPurchase}><input type="date" value={purchaseForm.date} onChange={(event) => setPurchaseForm({ ...purchaseForm, date: event.target.value })} /><input placeholder="Invoice no" value={purchaseForm.invoiceNo} onChange={(event) => setPurchaseForm({ ...purchaseForm, invoiceNo: event.target.value })} /><select value={purchaseForm.supplierId} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplierId: event.target.value })}>{data.suppliers.filter((item) => item.business === "feed").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={purchaseForm.materialId} onChange={(event) => setPurchaseForm({ ...purchaseForm, materialId: event.target.value })}>{data.rawMaterials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="0" placeholder="Quantity" value={purchaseForm.quantity} onChange={(event) => setPurchaseForm({ ...purchaseForm, quantity: event.target.value })} required /><input type="number" min="0" placeholder="Rate" value={purchaseForm.rate} onChange={(event) => setPurchaseForm({ ...purchaseForm, rate: event.target.value })} required /><select value={purchaseForm.paymentType} onChange={(event) => setPurchaseForm({ ...purchaseForm, paymentType: event.target.value as "cash" | "credit" })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{purchaseForm.paymentType === "credit" ? <input type="number" min="0" placeholder="Paid amount" value={purchaseForm.paidAmount} onChange={(event) => setPurchaseForm({ ...purchaseForm, paidAmount: event.target.value })} /> : null}<button>Add Purchase</button></form><DataTable rows={data.rawMaterialPurchases} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "materialId", label: "Material", value: (row) => data.rawMaterials.find((item) => item.id === row.materialId)?.name || "Unknown" }, { key: "quantity", label: "Quantity", value: (row) => row.quantity, render: (row) => fmt(row.quantity) }, { key: "rate", label: "Rate", value: (row) => row.rate, render: (row) => money(row.rate) }, { key: "total", label: "Total", value: (row) => row.quantity * row.rate, render: (row) => money(row.quantity * row.rate) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }]} /></Panel> : null}
    {section === "raw-inventory" ? <Panel title="Raw Material Inventory"><form className="form-grid wide" onSubmit={addMaterial}><input placeholder="Material name" value={materialForm.name} onChange={(event) => setMaterialForm({ ...materialForm, name: event.target.value })} required /><input placeholder="Unit" value={materialForm.unit} onChange={(event) => setMaterialForm({ ...materialForm, unit: event.target.value })} /><input type="number" min="0" placeholder="Opening stock" value={materialForm.openingStock} onChange={(event) => setMaterialForm({ ...materialForm, openingStock: event.target.value })} /><input type="number" min="0" placeholder="Reorder level" value={materialForm.reorderLevel} onChange={(event) => setMaterialForm({ ...materialForm, reorderLevel: event.target.value })} /><input type="number" min="0" placeholder="Average rate" value={materialForm.averageRate} onChange={(event) => setMaterialForm({ ...materialForm, averageRate: event.target.value })} /><button>Add Material</button></form><DataTable rows={data.rawMaterials} columns={[{ key: "name", label: "Material" }, { key: "unit", label: "Unit" }, { key: "stock", label: "Stock", value: (row) => row.stock, render: (row) => `${fmt(row.stock)} ${row.unit}` }, { key: "reorderLevel", label: "Reorder At", value: (row) => row.reorderLevel, render: (row) => `${fmt(row.reorderLevel)} ${row.unit}` }, { key: "averageRate", label: "Avg Rate", value: (row) => row.averageRate, render: (row) => money(row.averageRate) }, { key: "value", label: "Stock Value", value: (row) => row.stock * row.averageRate, render: (row) => money(row.stock * row.averageRate) }, { key: "status", label: "Status", value: (row) => row.stock <= row.reorderLevel ? "Low Stock" : "Available", render: (row) => <span className={`status-badge ${row.stock <= row.reorderLevel ? "danger" : "success"}`}>{row.stock <= row.reorderLevel ? "Low Stock" : "Available"}</span> }]} /></Panel> : null}
    {section === "production" ? <><Workflow steps={["Raw Material Purchase", "Inventory", "Feed Formula", "Production Batch", "Finished Feed", "Feed Bags", "Inventory", "Sales"]} /><Panel title="Feed Production"><form className="form-grid wide" onSubmit={produceFeed}><input type="date" value={productionForm.date} onChange={(event) => setProductionForm({ ...productionForm, date: event.target.value })} /><input placeholder="Batch number" value={productionForm.batchNo} onChange={(event) => setProductionForm({ ...productionForm, batchNo: event.target.value })} /><select value={productionForm.formulaId} onChange={(event) => setProductionForm({ ...productionForm, formulaId: event.target.value })}>{data.feedFormulas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="1" placeholder="Output KG" value={productionForm.outputKg} onChange={(event) => setProductionForm({ ...productionForm, outputKg: event.target.value })} required /><select value={productionForm.bagSize} onChange={(event) => setProductionForm({ ...productionForm, bagSize: event.target.value })}><option value="10">10 KG</option><option value="20">20 KG</option><option value="40">40 KG</option><option value="50">50 KG</option></select><input placeholder="Bag product name" value={productionForm.productName} onChange={(event) => setProductionForm({ ...productionForm, productName: event.target.value })} /><input type="number" min="0" placeholder="Sale rate / bag" value={productionForm.saleRate} onChange={(event) => setProductionForm({ ...productionForm, saleRate: event.target.value })} /><input placeholder="Notes" value={productionForm.notes} onChange={(event) => setProductionForm({ ...productionForm, notes: event.target.value })} /><button>Complete Production</button></form><InlineNotice tone="success">On completion, formula ingredients are deducted from raw material inventory and finished feed/bag inventory is increased automatically.</InlineNotice></Panel></> : null}
    {section === "batches" ? <Panel title="Batch Production"><DataTable rows={data.productionBatches} columns={[{ key: "date", label: "Date" }, { key: "batchNo", label: "Batch" }, { key: "formulaId", label: "Formula", value: (row) => data.feedFormulas.find((item) => item.id === row.formulaId)?.name || "Unknown" }, { key: "outputKg", label: "Output", value: (row) => row.outputKg, render: (row) => `${fmt(row.outputKg)} kg` }, { key: "bagsProduced", label: "Bags", value: (row) => row.bagsProduced }, { key: "productionCost", label: "Cost", value: (row) => row.productionCost, render: (row) => money(row.productionCost) }, { key: "notes", label: "Notes" }]} /></Panel> : null}
    {section === "formula" ? <Panel title="Feed Formula"><form className="form-grid wide" onSubmit={addFormula}><input placeholder="Formula name" value={formulaForm.name} onChange={(event) => setFormulaForm({ ...formulaForm, name: event.target.value })} required /><input type="number" min="1" placeholder="Standard output KG" value={formulaForm.outputKg} onChange={(event) => setFormulaForm({ ...formulaForm, outputKg: event.target.value })} /><select value={formulaForm.material1} onChange={(event) => setFormulaForm({ ...formulaForm, material1: event.target.value })}>{data.rawMaterials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="0" placeholder="Material 1 KG" value={formulaForm.qty1} onChange={(event) => setFormulaForm({ ...formulaForm, qty1: event.target.value })} /><select value={formulaForm.material2} onChange={(event) => setFormulaForm({ ...formulaForm, material2: event.target.value })}>{data.rawMaterials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="0" placeholder="Material 2 KG" value={formulaForm.qty2} onChange={(event) => setFormulaForm({ ...formulaForm, qty2: event.target.value })} /><input placeholder="Notes" value={formulaForm.notes} onChange={(event) => setFormulaForm({ ...formulaForm, notes: event.target.value })} /><button>Add Formula</button></form><DataTable rows={data.feedFormulas} columns={[{ key: "name", label: "Formula" }, { key: "outputKg", label: "Output", value: (row) => row.outputKg, render: (row) => `${fmt(row.outputKg)} kg` }, { key: "ingredients", label: "Ingredients", value: (row) => row.ingredients.map((item) => data.rawMaterials.find((material) => material.id === item.materialId)?.name || "").join(" "), render: (row) => row.ingredients.map((ingredient) => `${data.rawMaterials.find((item) => item.id === ingredient.materialId)?.name || "Unknown"}: ${fmt(ingredient.quantity)} kg`).join(" · ") }, { key: "notes", label: "Notes" }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("feedFormulas", row.id, "Feed Unit", "formula")}>Delete</button> : <span className="muted-text">View only</span> }]} /></Panel> : null}
    {section === "production-cost" ? <Panel title="Production Cost"><DataTable rows={data.productionBatches} columns={[{ key: "batchNo", label: "Batch" }, { key: "date", label: "Date" }, { key: "outputKg", label: "Output", value: (row) => row.outputKg, render: (row) => `${fmt(row.outputKg)} kg` }, { key: "productionCost", label: "Total Cost", value: (row) => row.productionCost, render: (row) => money(row.productionCost) }, { key: "costPerKg", label: "Cost / KG", value: (row) => row.productionCost / row.outputKg, render: (row) => money(row.productionCost / row.outputKg) }, { key: "bagCost", label: "Cost / Bag", value: (row) => row.productionCost / row.bagsProduced, render: (row) => money(row.productionCost / Math.max(row.bagsProduced, 1)) }]} /></Panel> : null}
    {section === "finished-goods" ? <Panel title="Finished Goods"><DataTable rows={data.finishedGoods} columns={[{ key: "name", label: "Finished Good" }, { key: "stockKg", label: "Stock", value: (row) => row.stockKg, render: (row) => `${fmt(row.stockKg)} kg` }, { key: "averageCost", label: "Average Cost / KG", value: (row) => row.averageCost, render: (row) => money(row.averageCost) }, { key: "stockValue", label: "Stock Value", value: (row) => row.stockKg * row.averageCost, render: (row) => money(row.stockKg * row.averageCost) }]} /></Panel> : null}
    {section === "finished-bags" || section === "bag-inventory" ? <Panel title={section === "finished-bags" ? "Finished Feed Bags" : "Bag Inventory"}><DataTable rows={data.bagInventory} columns={[{ key: "productName", label: "Product" }, { key: "bagSize", label: "Bag Size", value: (row) => row.bagSize, render: (row) => `${fmt(row.bagSize)} KG` }, { key: "quantity", label: "Bags in Stock", value: (row) => row.quantity }, { key: "reorderLevel", label: "Reorder At", value: (row) => row.reorderLevel }, { key: "costRate", label: "Cost / Bag", value: (row) => row.costRate, render: (row) => money(row.costRate) }, { key: "saleRate", label: "Sale Rate", value: (row) => row.saleRate, render: (row) => money(row.saleRate) }, { key: "status", label: "Status", value: (row) => row.quantity <= row.reorderLevel ? "Low Stock" : "Available", render: (row) => <span className={`status-badge ${row.quantity <= row.reorderLevel ? "danger" : "success"}`}>{row.quantity <= row.reorderLevel ? "Low Stock" : "Available"}</span> }]} /></Panel> : null}
    {section === "bag-sales" ? <Panel title="Bag Sales"><form className="form-grid wide" onSubmit={addBagSale}><input type="date" value={saleForm.date} onChange={(event) => setSaleForm({ ...saleForm, date: event.target.value })} /><input placeholder="Invoice no" value={saleForm.invoiceNo} onChange={(event) => setSaleForm({ ...saleForm, invoiceNo: event.target.value })} /><select value={saleForm.customerId} onChange={(event) => setSaleForm({ ...saleForm, customerId: event.target.value })}>{data.customers.filter((item) => item.business === "feed").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={saleForm.productId} onChange={(event) => { const bag = data.bagInventory.find((item) => item.id === event.target.value); setSaleForm({ ...saleForm, productId: event.target.value, rate: String(bag?.saleRate || "") }); }}>{data.bagInventory.map((item) => <option key={item.id} value={item.id}>{item.productName} {item.bagSize} KG ({item.quantity} available)</option>)}</select><input type="number" min="1" placeholder="Bags" value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })} required /><input type="number" min="0" placeholder="Rate" value={saleForm.rate} onChange={(event) => setSaleForm({ ...saleForm, rate: event.target.value })} required /><select value={saleForm.paymentType} onChange={(event) => setSaleForm({ ...saleForm, paymentType: event.target.value as PaymentType })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{saleForm.paymentType !== "cash" ? <><input type="number" min="0" placeholder="Paid amount" value={saleForm.paidAmount} onChange={(event) => setSaleForm({ ...saleForm, paidAmount: event.target.value })} /><input type="date" value={saleForm.dueDate} onChange={(event) => setSaleForm({ ...saleForm, dueDate: event.target.value })} /></> : null}<input placeholder="Remarks" value={saleForm.remarks} onChange={(event) => setSaleForm({ ...saleForm, remarks: event.target.value })} /><button>Save & Print Invoice</button></form><DataTable rows={feedSales} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Product" }, { key: "quantity", label: "Bags", value: (row) => row.quantity }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "due", label: "Due", value: (row) => row.total - row.paidAmount, render: (row) => money(row.total - row.paidAmount) }, { key: "actions", label: "Print", render: (row) => <button className="secondary-btn mini" onClick={() => openPrint({ title: "Feed Sale Invoice", subtitle: row.invoiceNo, fields: [["Date", row.date], ["Customer", row.customerName], ["Product", row.productName], ["Quantity", `${row.quantity} bags`], ["Total", money(row.total)], ["Paid", money(row.paidAmount)], ["Balance", money(row.total - row.paidAmount)]] })}>Print</button> }]} /></Panel> : null}
    {section === "customers" ? <ContactManager type="customer" business="feed" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin} /> : null}
    {section === "expenses" ? <ExpenseManager business="feed" data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} /> : null}
    {section === "staff" ? <BusinessStaffView business="feed" data={data} /> : null}
    {section === "salary" ? <BusinessSalaryView business="feed" data={data} /> : null}
    {section === "reports" ? <SimpleBusinessReport business="feed" data={data} openPrint={openPrint} /> : null}
    {section === "settings" ? <Panel title="Feed Unit Settings"><div className="settings-summary"><span><b>Raw materials:</b> {data.rawMaterials.length}</span><span><b>Active formulas:</b> {data.feedFormulas.length}</span><span><b>Bag products:</b> {data.bagInventory.length}</span><span><b>Low-stock products:</b> {data.bagInventory.filter((item) => item.quantity <= item.reorderLevel).length}</span></div><InlineNotice>Global opening balances, users, roles, permissions, backup and restore are available in the main Settings tab.</InlineNotice></Panel> : null}
  </div>;
}

type ChakkiSection = "overview" | "grinding" | "flour-products" | "flour-production" | "flour-sales" | "reports";
function ChakkiPanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint }: { data: ERPData; commit: CommitFn; deleteRecord: DeleteFn; addCashEntry: CashAdder; isAdmin: boolean; openPrint: (document: PrintDocument) => void }) {
  const [section, setSection] = useState<ChakkiSection>("overview");
  const [grindingForm, setGrindingForm] = useState({ date: today(), receiptNo: `GR-${1000 + data.grindingJobs.length + 1}`, customerName: "", phone: "", weightKg: "", grindingRate: "8", paymentType: "cash" as "cash" | "credit", paidAmount: "", remarks: "" });
  const [productForm, setProductForm] = useState({ name: "10 KG Flour Bag", bagSize: "10", openingStock: "0", reorderLevel: "10", costRate: "", saleRate: "" });
  const [productionForm, setProductionForm] = useState({ date: today(), batchNo: `FLOUR-B-${1000 + data.flourProduction.length + 1}`, productId: data.flourProducts[0]?.id || "", bagsProduced: "", totalCost: "", notes: "" });
  const [saleForm, setSaleForm] = useState({ date: today(), invoiceNo: `INV-C-${1000 + data.sales.filter((item) => item.business === "chakki").length + 1}`, customerName: "Walk-in Customer", productId: data.flourProducts[0]?.id || "", quantity: "", rate: String(data.flourProducts[0]?.saleRate || ""), paymentType: "cash" as "cash" | "credit", paidAmount: "", dueDate: dateOffset(7), remarks: "" });
  const tabs: Array<[ChakkiSection, string]> = [["overview", "Two Businesses"], ["grinding", "Grinding Service"], ["flour-products", "Flour Products"], ["flour-production", "Flour Production"], ["flour-sales", "Flour Bag Sales"], ["reports", "Monthly Reports"]];
  const addGrinding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const charges = toNum(grindingForm.weightKg) * toNum(grindingForm.grindingRate);
    const paidAmount = grindingForm.paymentType === "cash" ? charges : Math.min(toNum(grindingForm.paidAmount), charges);
    const record: GrindingJob = { id: uid(), date: grindingForm.date, receiptNo: grindingForm.receiptNo, customerName: grindingForm.customerName, phone: grindingForm.phone, weightKg: toNum(grindingForm.weightKg), grindingRate: toNum(grindingForm.grindingRate), charges, paymentType: grindingForm.paymentType, paidAmount, remarks: grindingForm.remarks };
    commit("Chakki", "Add grinding service", `${record.receiptNo}: ${money(record.charges)}`, (current) => {
      let next: ERPData = { ...current, grindingJobs: [record, ...current.grindingJobs] };
      if (paidAmount > 0) next = addCashEntry(next, { date: record.date, type: "received", business: "chakki", category: "Grinding Income", reference: record.receiptNo, description: `${record.customerName} grinding charges`, amount: paidAmount });
      return next;
    });
    openPrint({ title: "Grinding Receipt", subtitle: record.receiptNo, fields: [["Date", record.date], ["Customer", record.customerName], ["Phone", record.phone || "—"], ["Customer Wheat", `${fmt(record.weightKg)} KG`], ["Grinding Rate", `${money(record.grindingRate)} / KG`], ["Grinding Charges", money(record.charges)], ["Paid", money(record.paidAmount)], ["Balance", money(record.charges - record.paidAmount)], ["Payment", titleCase(record.paymentType)], ["Remarks", record.remarks || "—"]], footer: "Customer wheat is processed as service material only and is not added to company inventory." });
    setGrindingForm({ ...grindingForm, receiptNo: `GR-${1001 + data.grindingJobs.length + 1}`, customerName: "", phone: "", weightKg: "", paidAmount: "", remarks: "" });
  };
  const addProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const record: FlourProduct = { id: uid(), name: productForm.name, bagSize: toNum(productForm.bagSize), stock: toNum(productForm.openingStock), reorderLevel: toNum(productForm.reorderLevel), costRate: toNum(productForm.costRate), saleRate: toNum(productForm.saleRate) };
    commit("Chakki", "Add flour product", record.name, (current) => ({ ...current, flourProducts: [record, ...current.flourProducts] }));
    setProductForm({ name: "10 KG Flour Bag", bagSize: "10", openingStock: "0", reorderLevel: "10", costRate: "", saleRate: "" });
  };
  const manufactureFlour = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const product = data.flourProducts.find((item) => item.id === productionForm.productId);
    if (!product) return;
    const record: FlourProduction = { id: uid(), date: productionForm.date, batchNo: productionForm.batchNo, productId: product.id, bagsProduced: toNum(productionForm.bagsProduced), totalCost: toNum(productionForm.totalCost), notes: productionForm.notes };
    commit("Chakki", "Manufacture flour bags", `${product.name}: ${record.bagsProduced} bags`, (current) => ({ ...current, flourProduction: [record, ...current.flourProduction], flourProducts: current.flourProducts.map((item) => item.id === product.id ? { ...item, stock: item.stock + record.bagsProduced, costRate: record.totalCost > 0 ? record.totalCost / record.bagsProduced : item.costRate } : item) }));
    setProductionForm({ ...productionForm, batchNo: `FLOUR-B-${1001 + data.flourProduction.length + 1}`, bagsProduced: "", totalCost: "", notes: "" });
  };
  const sellFlour = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const product = data.flourProducts.find((item) => item.id === saleForm.productId);
    if (!product) return;
    const quantity = toNum(saleForm.quantity);
    if (quantity > product.stock) { window.alert(`Only ${product.stock} bags are available.`); return; }
    const total = quantity * toNum(saleForm.rate);
    const paidAmount = saleForm.paymentType === "cash" ? total : Math.min(toNum(saleForm.paidAmount), total);
    const record: Sale = { id: uid(), date: saleForm.date, business: "chakki", invoiceNo: saleForm.invoiceNo, customerId: "", customerName: saleForm.customerName, productId: product.id, productName: product.name, quantity, unit: "bags", rate: toNum(saleForm.rate), total, paidAmount, paymentType: saleForm.paymentType, dueDate: saleForm.paymentType === "cash" ? "" : saleForm.dueDate, remarks: saleForm.remarks };
    commit("Chakki", "Add flour bag sale", `${record.invoiceNo}: ${money(total)}`, (current) => {
      let next: ERPData = { ...current, sales: [record, ...current.sales], flourProducts: current.flourProducts.map((item) => item.id === product.id ? { ...item, stock: item.stock - quantity } : item) };
      if (paidAmount > 0) next = addCashEntry(next, { date: record.date, type: "received", business: "chakki", category: "Flour Bag Sales", reference: record.invoiceNo, description: `${record.customerName} - ${record.productName}`, amount: paidAmount });
      return next;
    });
    openPrint({ title: "Flour Bag Sale Invoice", subtitle: record.invoiceNo, fields: [["Date", record.date], ["Customer", record.customerName], ["Product", record.productName], ["Quantity", `${record.quantity} bags`], ["Rate", money(record.rate)], ["Total", money(record.total)], ["Paid", money(record.paidAmount)], ["Balance", money(record.total - record.paidAmount)]], footer: "PK Business ERP Suite - Chakki" });
    setSaleForm({ ...saleForm, invoiceNo: `INV-C-${1001 + data.sales.filter((item) => item.business === "chakki").length + 1}`, quantity: "", paidAmount: "", remarks: "" });
  };
  const flourSales = data.sales.filter((item) => item.business === "chakki");
  return <div className="screen-stack"><ModuleTabs items={tabs} active={section} onChange={setSection} />
    {section === "overview" ? <><div className="two-col"><Panel title="1. Grinding Service"><InlineNotice tone="warning"><b>Important:</b> Customer wheat never becomes company inventory. Only grinding income is recorded in sales/cash book.</InlineNotice><div className="feature-list"><span>Customer details and weight</span><span>Grinding rate and charges</span><span>Cash or credit</span><span>Grinding receipt and reports</span></div><button className="primary-btn" onClick={() => setSection("grinding")}>Open Grinding Service</button></Panel><Panel title="2. Flour Bag Sales"><InlineNotice>The company manufactures its own flour bags. Manufacturing increases stock and every invoice decreases inventory automatically.</InlineNotice><div className="feature-list"><span>10 KG Bag</span><span>20 KG Bag</span><span>40 KG Bag</span><span>50 KG Bag</span></div><button className="primary-btn" onClick={() => setSection("flour-sales")}>Open Flour Bag Sales</button></Panel></div><div className="stats-grid compact"><StatCard label="Grinding Income" value={money(data.grindingJobs.reduce((sum, item) => sum + item.charges, 0))} /><StatCard label="Customer Wheat Processed" value={`${fmt(data.grindingJobs.reduce((sum, item) => sum + item.weightKg, 0))} KG`} /><StatCard label="Flour Bag Stock" value={`${fmt(data.flourProducts.reduce((sum, item) => sum + item.stock, 0))} bags`} /><StatCard label="Flour Sales" value={money(flourSales.reduce((sum, item) => sum + item.total, 0))} /></div></> : null}
    {section === "grinding" ? <Panel title="Grinding Service"><form className="form-grid wide" onSubmit={addGrinding}><input type="date" value={grindingForm.date} onChange={(event) => setGrindingForm({ ...grindingForm, date: event.target.value })} /><input placeholder="Receipt no" value={grindingForm.receiptNo} onChange={(event) => setGrindingForm({ ...grindingForm, receiptNo: event.target.value })} /><input placeholder="Customer name" value={grindingForm.customerName} onChange={(event) => setGrindingForm({ ...grindingForm, customerName: event.target.value })} required /><input placeholder="Phone" value={grindingForm.phone} onChange={(event) => setGrindingForm({ ...grindingForm, phone: event.target.value })} /><input type="number" min="0" placeholder="Weight KG" value={grindingForm.weightKg} onChange={(event) => setGrindingForm({ ...grindingForm, weightKg: event.target.value })} required /><input type="number" min="0" placeholder="Grinding rate / KG" value={grindingForm.grindingRate} onChange={(event) => setGrindingForm({ ...grindingForm, grindingRate: event.target.value })} required /><select value={grindingForm.paymentType} onChange={(event) => setGrindingForm({ ...grindingForm, paymentType: event.target.value as "cash" | "credit" })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{grindingForm.paymentType === "credit" ? <input type="number" min="0" placeholder="Paid amount" value={grindingForm.paidAmount} onChange={(event) => setGrindingForm({ ...grindingForm, paidAmount: event.target.value })} /> : null}<input placeholder="Remarks" value={grindingForm.remarks} onChange={(event) => setGrindingForm({ ...grindingForm, remarks: event.target.value })} /><button>Generate Receipt</button></form><InlineNotice tone="warning">This form records grinding service income only. The wheat weight is kept as a service record and is never posted to company stock.</InlineNotice><DataTable rows={data.grindingJobs} columns={[{ key: "date", label: "Date" }, { key: "receiptNo", label: "Receipt" }, { key: "customerName", label: "Customer" }, { key: "phone", label: "Phone" }, { key: "weightKg", label: "Weight", value: (row) => row.weightKg, render: (row) => `${fmt(row.weightKg)} KG` }, { key: "charges", label: "Charges", value: (row) => row.charges, render: (row) => money(row.charges) }, { key: "balance", label: "Balance", value: (row) => row.charges - row.paidAmount, render: (row) => money(row.charges - row.paidAmount) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }, { key: "print", label: "Receipt", render: (row) => <button className="secondary-btn mini" onClick={() => openPrint({ title: "Grinding Receipt", subtitle: row.receiptNo, fields: [["Date", row.date], ["Customer", row.customerName], ["Phone", row.phone || "—"], ["Customer Wheat", `${row.weightKg} KG`], ["Rate", `${money(row.grindingRate)} / KG`], ["Charges", money(row.charges)], ["Paid", money(row.paidAmount)], ["Balance", money(row.charges - row.paidAmount)], ["Remarks", row.remarks || "—"]], footer: "Customer wheat is not company inventory." })}>Print</button> }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("grindingJobs", row.id, "Chakki", "grinding receipt")}>Delete</button> : <span className="muted-text">View only</span> }]} /></Panel> : null}
    {section === "flour-products" ? <Panel title="Flour Products"><form className="form-grid wide" onSubmit={addProduct}><select value={productForm.name} onChange={(event) => { const size = event.target.value.split(" ")[0]; setProductForm({ ...productForm, name: event.target.value, bagSize: size }); }}><option>10 KG Flour Bag</option><option>20 KG Flour Bag</option><option>40 KG Flour Bag</option><option>50 KG Flour Bag</option></select><input type="number" min="1" placeholder="Bag size KG" value={productForm.bagSize} onChange={(event) => setProductForm({ ...productForm, bagSize: event.target.value })} /><input type="number" min="0" placeholder="Opening stock" value={productForm.openingStock} onChange={(event) => setProductForm({ ...productForm, openingStock: event.target.value })} /><input type="number" min="0" placeholder="Reorder level" value={productForm.reorderLevel} onChange={(event) => setProductForm({ ...productForm, reorderLevel: event.target.value })} /><input type="number" min="0" placeholder="Cost rate" value={productForm.costRate} onChange={(event) => setProductForm({ ...productForm, costRate: event.target.value })} /><input type="number" min="0" placeholder="Sale rate" value={productForm.saleRate} onChange={(event) => setProductForm({ ...productForm, saleRate: event.target.value })} /><button>Create Product</button></form><DataTable rows={data.flourProducts} columns={[{ key: "name", label: "Product" }, { key: "bagSize", label: "Size", value: (row) => row.bagSize, render: (row) => `${row.bagSize} KG` }, { key: "stock", label: "Stock", value: (row) => row.stock, render: (row) => `${row.stock} bags` }, { key: "costRate", label: "Cost", value: (row) => row.costRate, render: (row) => money(row.costRate) }, { key: "saleRate", label: "Sale Rate", value: (row) => row.saleRate, render: (row) => money(row.saleRate) }, { key: "status", label: "Status", value: (row) => row.stock <= row.reorderLevel ? "Low Stock" : "Available", render: (row) => <span className={`status-badge ${row.stock <= row.reorderLevel ? "danger" : "success"}`}>{row.stock <= row.reorderLevel ? "Low Stock" : "Available"}</span> }]} /></Panel> : null}
    {section === "flour-production" ? <Panel title="Company Flour Production"><form className="form-grid wide" onSubmit={manufactureFlour}><input type="date" value={productionForm.date} onChange={(event) => setProductionForm({ ...productionForm, date: event.target.value })} /><input placeholder="Batch no" value={productionForm.batchNo} onChange={(event) => setProductionForm({ ...productionForm, batchNo: event.target.value })} /><select value={productionForm.productId} onChange={(event) => setProductionForm({ ...productionForm, productId: event.target.value })}>{data.flourProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="1" placeholder="Bags produced" value={productionForm.bagsProduced} onChange={(event) => setProductionForm({ ...productionForm, bagsProduced: event.target.value })} required /><input type="number" min="0" placeholder="Total production cost" value={productionForm.totalCost} onChange={(event) => setProductionForm({ ...productionForm, totalCost: event.target.value })} /><input placeholder="Notes" value={productionForm.notes} onChange={(event) => setProductionForm({ ...productionForm, notes: event.target.value })} /><button>Complete Production</button></form><InlineNotice tone="success">Completing this batch automatically increases the selected flour bag inventory.</InlineNotice><DataTable rows={data.flourProduction} columns={[{ key: "date", label: "Date" }, { key: "batchNo", label: "Batch" }, { key: "productId", label: "Product", value: (row) => data.flourProducts.find((item) => item.id === row.productId)?.name || "Unknown" }, { key: "bagsProduced", label: "Bags", value: (row) => row.bagsProduced }, { key: "totalCost", label: "Total Cost", value: (row) => row.totalCost, render: (row) => money(row.totalCost) }, { key: "notes", label: "Notes" }]} /></Panel> : null}
    {section === "flour-sales" ? <Panel title="Flour Bag Sales"><form className="form-grid wide" onSubmit={sellFlour}><input type="date" value={saleForm.date} onChange={(event) => setSaleForm({ ...saleForm, date: event.target.value })} /><input placeholder="Invoice no" value={saleForm.invoiceNo} onChange={(event) => setSaleForm({ ...saleForm, invoiceNo: event.target.value })} /><input placeholder="Customer name" value={saleForm.customerName} onChange={(event) => setSaleForm({ ...saleForm, customerName: event.target.value })} required /><select value={saleForm.productId} onChange={(event) => { const product = data.flourProducts.find((item) => item.id === event.target.value); setSaleForm({ ...saleForm, productId: event.target.value, rate: String(product?.saleRate || "") }); }}>{data.flourProducts.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stock} bags)</option>)}</select><input type="number" min="1" placeholder="Bags" value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })} required /><input type="number" min="0" placeholder="Rate" value={saleForm.rate} onChange={(event) => setSaleForm({ ...saleForm, rate: event.target.value })} required /><select value={saleForm.paymentType} onChange={(event) => setSaleForm({ ...saleForm, paymentType: event.target.value as "cash" | "credit" })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{saleForm.paymentType === "credit" ? <><input type="number" min="0" placeholder="Paid amount" value={saleForm.paidAmount} onChange={(event) => setSaleForm({ ...saleForm, paidAmount: event.target.value })} /><input type="date" value={saleForm.dueDate} onChange={(event) => setSaleForm({ ...saleForm, dueDate: event.target.value })} /></> : null}<input placeholder="Remarks" value={saleForm.remarks} onChange={(event) => setSaleForm({ ...saleForm, remarks: event.target.value })} /><button>Generate Invoice</button></form><DataTable rows={flourSales} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Product" }, { key: "quantity", label: "Bags", value: (row) => row.quantity }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "due", label: "Due", value: (row) => row.total - row.paidAmount, render: (row) => money(row.total - row.paidAmount) }, { key: "print", label: "Invoice", render: (row) => <button className="secondary-btn mini" onClick={() => openPrint({ title: "Flour Bag Sale Invoice", subtitle: row.invoiceNo, fields: [["Date", row.date], ["Customer", row.customerName], ["Product", row.productName], ["Quantity", `${row.quantity} bags`], ["Total", money(row.total)], ["Paid", money(row.paidAmount)], ["Balance", money(row.total - row.paidAmount)]] })}>Print</button> }]} /></Panel> : null}
    {section === "reports" ? <div className="screen-stack"><SimpleBusinessReport business="chakki" data={data} openPrint={openPrint} /><Panel title="Grinding Reports" actions={<button className="secondary-btn" onClick={() => openPrint({ title: "Monthly Grinding Report", subtitle: new Date().toLocaleDateString("en-PK", { month: "long", year: "numeric" }), columns: ["Date", "Receipt", "Customer", "Weight", "Charges", "Paid", "Credit"], rows: data.grindingJobs.map((item) => [item.date, item.receiptNo, item.customerName, `${item.weightKg} KG`, money(item.charges), money(item.paidAmount), money(item.charges - item.paidAmount)]), footer: `Grinding Income: ${money(data.grindingJobs.reduce((sum, item) => sum + item.charges, 0))}` })}>Print Grinding Report</button>}><DataTable rows={data.grindingJobs} columns={[{ key: "date", label: "Date" }, { key: "receiptNo", label: "Receipt" }, { key: "customerName", label: "Customer" }, { key: "weightKg", label: "Weight", value: (row) => row.weightKg, render: (row) => `${row.weightKg} KG` }, { key: "charges", label: "Charges", value: (row) => row.charges, render: (row) => money(row.charges) }]} /></Panel></div> : null}
  </div>;
}

type PetrolSection = "fuel-purchase" | "tank-stock" | "machine-reading" | "customers" | "temporary-credit" | "cash" | "expenses" | "salary" | "reports" | "daily-closing" | "monthly-closing";
function PetrolPanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint, metrics }: { data: ERPData; commit: CommitFn; deleteRecord: DeleteFn; addCashEntry: CashAdder; isAdmin: boolean; openPrint: (document: PrintDocument) => void; metrics: ReturnType<typeof calculateMetrics> }) {
  const [section, setSection] = useState<PetrolSection>("fuel-purchase");
  const [purchaseForm, setPurchaseForm] = useState({ date: today(), invoiceNo: `FP-${1000 + data.fuelPurchases.length + 1}`, fuelType: "petrol" as FuelType, liters: "", rate: "", supplierId: data.suppliers.find((item) => item.business === "petrol")?.id || "", paymentType: "cash" as "cash" | "credit", paidAmount: "" });
  const [readingForm, setReadingForm] = useState({ date: today(), machine: "Machine 1" as "Machine 1" | "Machine 2", fuelType: "petrol" as FuelType, openingReading: "", closingReading: "", saleRate: "", paymentType: "cash" as PaymentType, customerId: "", paidAmount: "", dueDate: dateOffset(5), remarks: "" });
  const tabs: Array<[PetrolSection, string]> = [["fuel-purchase", "Fuel Purchase"], ["tank-stock", "Tank Stock"], ["machine-reading", "Machine Reading"], ["customers", "Customers"], ["temporary-credit", "Temporary Credit"], ["cash", "Cash"], ["expenses", "Expenses"], ["salary", "Salary"], ["reports", "Reports"], ["daily-closing", "Daily Closing"], ["monthly-closing", "Monthly Closing"]];
  const addFuelPurchase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const total = toNum(purchaseForm.liters) * toNum(purchaseForm.rate);
    const paidAmount = purchaseForm.paymentType === "cash" ? total : Math.min(toNum(purchaseForm.paidAmount), total);
    const record: FuelPurchase = { id: uid(), date: purchaseForm.date, invoiceNo: purchaseForm.invoiceNo, fuelType: purchaseForm.fuelType, liters: toNum(purchaseForm.liters), rate: toNum(purchaseForm.rate), supplierId: purchaseForm.supplierId, paymentType: purchaseForm.paymentType, paidAmount };
    commit("Petrol Pump", "Add fuel purchase", `${titleCase(record.fuelType)} ${fmt(record.liters)} L`, (current) => {
      let next: ERPData = { ...current, fuelPurchases: [record, ...current.fuelPurchases] };
      if (paidAmount > 0) next = addCashEntry(next, { date: record.date, type: "paid", business: "petrol", category: "Fuel Purchase", reference: record.invoiceNo, description: `${titleCase(record.fuelType)} purchase`, amount: paidAmount });
      return next;
    });
    setPurchaseForm({ ...purchaseForm, invoiceNo: `FP-${1001 + data.fuelPurchases.length + 1}`, liters: "", rate: "", paidAmount: "" });
  };
  const addMachineReading = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const openingReading = toNum(readingForm.openingReading); const closingReading = toNum(readingForm.closingReading);
    if (closingReading < openingReading) { window.alert("Closing reading must be greater than or equal to opening reading."); return; }
    const sold = closingReading - openingReading;
    const total = sold * toNum(readingForm.saleRate);
    const customer = data.customers.find((item) => item.id === readingForm.customerId);
    const paidAmount = readingForm.paymentType === "cash" ? total : Math.min(toNum(readingForm.paidAmount), total);
    const record: MachineReading = { id: uid(), date: readingForm.date, machine: readingForm.machine, fuelType: readingForm.fuelType, openingReading, closingReading, saleRate: toNum(readingForm.saleRate), paymentType: readingForm.paymentType, customerId: readingForm.customerId, customerName: customer?.name || (readingForm.paymentType === "cash" ? "Walk-in Customers" : "Temporary Customer"), paidAmount, dueDate: readingForm.paymentType === "cash" ? "" : readingForm.dueDate, remarks: readingForm.remarks };
    const available = readingForm.fuelType === "petrol" ? metrics.petrolStock : metrics.dieselStock;
    if (sold > available) { window.alert(`Only ${fmt(available)} liters are available in the ${readingForm.fuelType} tank.`); return; }
    commit("Petrol Pump", "Add machine reading", `${record.machine}: ${fmt(sold)} L sold`, (current) => {
      let next: ERPData = { ...current, machineReadings: [record, ...current.machineReadings] };
      if (paidAmount > 0) next = addCashEntry(next, { date: record.date, type: "received", business: "petrol", category: "Fuel Sales", reference: `${record.machine}-${record.date}`, description: `${titleCase(record.fuelType)} sale`, amount: paidAmount });
      return next;
    });
    setReadingForm({ ...readingForm, openingReading: closingReading.toString(), closingReading: "", paidAmount: "", remarks: "" });
  };
  const saveClosing = (period: "daily" | "monthly") => {
    const date = period === "daily" ? today() : `${today().slice(0, 7)}-01`;
    const prefix = period === "daily" ? today() : today().slice(0, 7);
    const entries = data.cashEntries.filter((item) => item.business === "petrol" && item.date.startsWith(prefix));
    const received = entries.filter((item) => item.type === "received").reduce((sum, item) => sum + item.amount, 0);
    const paid = entries.filter((item) => item.type === "paid" || item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    const previous = data.closings.filter((item) => item.business === "petrol" && item.period === period).at(0)?.closingBalance || 0;
    const record: ClosingRecord = { id: uid(), date, period, business: "petrol", openingBalance: previous, received, paid, closingBalance: previous + received - paid, notes: `${titleCase(period)} petrol pump closing` };
    commit("Petrol Pump", `Save ${period} closing`, money(record.closingBalance), (current) => ({ ...current, closings: [record, ...current.closings] }));
    openPrint({ title: `Petrol Pump ${titleCase(period)} Closing`, subtitle: date, fields: [["Opening Balance", money(record.openingBalance)], ["Cash Received", money(record.received)], ["Cash Paid", money(record.paid)], ["Closing Balance", money(record.closingBalance)], ["Petrol Tank", `${fmt(metrics.petrolStock)} L`], ["Diesel Tank", `${fmt(metrics.dieselStock)} L`]], footer: "Fuel Sold = Closing Reading - Opening Reading" });
  };
  const temporaryRows = data.machineReadings.filter((item) => item.paymentType === "temporary");
  const cashRows = data.machineReadings.filter((item) => item.paymentType === "cash");
  const closingRows = data.closings.filter((item) => item.business === "petrol");
  return <div className="screen-stack"><InlineNotice>Automatic formula: <b>Fuel Sold = Closing Reading − Opening Reading.</b> Tank stock is calculated from opening stock + purchases − machine sales.</InlineNotice><ModuleTabs items={tabs} active={section} onChange={setSection} />
    {section === "fuel-purchase" ? <Panel title="Fuel Purchase"><form className="form-grid wide" onSubmit={addFuelPurchase}><input type="date" value={purchaseForm.date} onChange={(event) => setPurchaseForm({ ...purchaseForm, date: event.target.value })} /><input placeholder="Invoice no" value={purchaseForm.invoiceNo} onChange={(event) => setPurchaseForm({ ...purchaseForm, invoiceNo: event.target.value })} /><select value={purchaseForm.fuelType} onChange={(event) => setPurchaseForm({ ...purchaseForm, fuelType: event.target.value as FuelType })}><option value="petrol">Petrol</option><option value="diesel">Diesel</option></select><input type="number" min="0" placeholder="Liters" value={purchaseForm.liters} onChange={(event) => setPurchaseForm({ ...purchaseForm, liters: event.target.value })} required /><input type="number" min="0" step="0.01" placeholder="Purchase rate" value={purchaseForm.rate} onChange={(event) => setPurchaseForm({ ...purchaseForm, rate: event.target.value })} required /><select value={purchaseForm.supplierId} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplierId: event.target.value })}>{data.suppliers.filter((item) => item.business === "petrol").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={purchaseForm.paymentType} onChange={(event) => setPurchaseForm({ ...purchaseForm, paymentType: event.target.value as "cash" | "credit" })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{purchaseForm.paymentType === "credit" ? <input type="number" min="0" placeholder="Paid amount" value={purchaseForm.paidAmount} onChange={(event) => setPurchaseForm({ ...purchaseForm, paidAmount: event.target.value })} /> : null}<button>Add Fuel Purchase</button></form><DataTable rows={data.fuelPurchases} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "fuelType", label: "Fuel", render: (row) => titleCase(row.fuelType) }, { key: "liters", label: "Liters", value: (row) => row.liters, render: (row) => `${fmt(row.liters)} L` }, { key: "rate", label: "Rate", value: (row) => row.rate, render: (row) => money(row.rate) }, { key: "total", label: "Total", value: (row) => row.liters * row.rate, render: (row) => money(row.liters * row.rate) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }]} /></Panel> : null}
    {section === "tank-stock" ? <><div className="stats-grid compact"><StatCard label="Petrol Tank Stock" value={`${fmt(metrics.petrolStock)} L`} hint={`Reorder at ${fmt(data.settings.petrolReorderLevel)} L`} tone={metrics.petrolStock <= data.settings.petrolReorderLevel ? "warning" : "success"} /><StatCard label="Diesel Tank Stock" value={`${fmt(metrics.dieselStock)} L`} hint={`Reorder at ${fmt(data.settings.dieselReorderLevel)} L`} tone={metrics.dieselStock <= data.settings.dieselReorderLevel ? "warning" : "success"} /><StatCard label="Petrol Sold" value={`${fmt(data.machineReadings.filter((item) => item.fuelType === "petrol").reduce((sum, item) => sum + soldLiters(item), 0))} L`} /><StatCard label="Diesel Sold" value={`${fmt(data.machineReadings.filter((item) => item.fuelType === "diesel").reduce((sum, item) => sum + soldLiters(item), 0))} L`} /></div><Panel title="Tank Stock Movement"><DataTable rows={[{ id: "tank-petrol", fuel: "Petrol", opening: data.settings.openingPetrolLiters, purchased: data.fuelPurchases.filter((item) => item.fuelType === "petrol").reduce((sum, item) => sum + item.liters, 0), sold: data.machineReadings.filter((item) => item.fuelType === "petrol").reduce((sum, item) => sum + soldLiters(item), 0), closing: metrics.petrolStock }, { id: "tank-diesel", fuel: "Diesel", opening: data.settings.openingDieselLiters, purchased: data.fuelPurchases.filter((item) => item.fuelType === "diesel").reduce((sum, item) => sum + item.liters, 0), sold: data.machineReadings.filter((item) => item.fuelType === "diesel").reduce((sum, item) => sum + soldLiters(item), 0), closing: metrics.dieselStock }]} columns={[{ key: "fuel", label: "Fuel" }, { key: "opening", label: "Opening", value: (row) => row.opening, render: (row) => `${fmt(row.opening)} L` }, { key: "purchased", label: "Purchased", value: (row) => row.purchased, render: (row) => `${fmt(row.purchased)} L` }, { key: "sold", label: "Sold", value: (row) => row.sold, render: (row) => `${fmt(row.sold)} L` }, { key: "closing", label: "Closing", value: (row) => row.closing, render: (row) => `${fmt(row.closing)} L` }]} /></Panel></> : null}
    {section === "machine-reading" ? <Panel title="Machine Reading"><form className="form-grid wide" onSubmit={addMachineReading}><input type="date" value={readingForm.date} onChange={(event) => setReadingForm({ ...readingForm, date: event.target.value })} /><select value={readingForm.machine} onChange={(event) => setReadingForm({ ...readingForm, machine: event.target.value as "Machine 1" | "Machine 2" })}><option>Machine 1</option><option>Machine 2</option></select><select value={readingForm.fuelType} onChange={(event) => setReadingForm({ ...readingForm, fuelType: event.target.value as FuelType })}><option value="petrol">Petrol</option><option value="diesel">Diesel</option></select><input type="number" min="0" step="0.01" placeholder="Opening reading" value={readingForm.openingReading} onChange={(event) => setReadingForm({ ...readingForm, openingReading: event.target.value })} required /><input type="number" min="0" step="0.01" placeholder="Closing reading" value={readingForm.closingReading} onChange={(event) => setReadingForm({ ...readingForm, closingReading: event.target.value })} required /><input type="number" min="0" step="0.01" placeholder="Sale rate / L" value={readingForm.saleRate} onChange={(event) => setReadingForm({ ...readingForm, saleRate: event.target.value })} required /><select value={readingForm.paymentType} onChange={(event) => setReadingForm({ ...readingForm, paymentType: event.target.value as PaymentType })}><option value="cash">Cash</option><option value="credit">Regular Credit</option><option value="temporary">Temporary Credit</option></select>{readingForm.paymentType !== "cash" ? <><select value={readingForm.customerId} onChange={(event) => setReadingForm({ ...readingForm, customerId: event.target.value })}><option value="">Temporary / unnamed customer</option>{data.customers.filter((item) => item.business === "petrol").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="0" placeholder="Paid amount" value={readingForm.paidAmount} onChange={(event) => setReadingForm({ ...readingForm, paidAmount: event.target.value })} /><input type="date" value={readingForm.dueDate} onChange={(event) => setReadingForm({ ...readingForm, dueDate: event.target.value })} /></> : null}<input placeholder="Remarks" value={readingForm.remarks} onChange={(event) => setReadingForm({ ...readingForm, remarks: event.target.value })} /><button>Save Machine Reading</button></form><div className="formula-box"><span>Fuel Sold</span><strong>{fmt(Math.max(toNum(readingForm.closingReading) - toNum(readingForm.openingReading), 0))} L</strong><small>Closing Reading − Opening Reading</small></div><DataTable rows={data.machineReadings} columns={[{ key: "date", label: "Date" }, { key: "machine", label: "Machine" }, { key: "fuelType", label: "Fuel", render: (row) => titleCase(row.fuelType) }, { key: "openingReading", label: "Opening", value: (row) => row.openingReading, render: (row) => fmt(row.openingReading) }, { key: "closingReading", label: "Closing", value: (row) => row.closingReading, render: (row) => fmt(row.closingReading) }, { key: "sold", label: "Fuel Sold", value: soldLiters, render: (row) => `${fmt(soldLiters(row))} L` }, { key: "amount", label: "Amount", value: readingAmount, render: (row) => money(readingAmount(row)) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("machineReadings", row.id, "Petrol Pump", "reading")}>Delete</button> : <span className="muted-text">View only</span> }]} /></Panel> : null}
    {section === "customers" ? <ContactManager type="customer" business="petrol" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin} /> : null}
    {section === "temporary-credit" ? <Panel title="Temporary Credit"><DataTable rows={temporaryRows} columns={[{ key: "date", label: "Date" }, { key: "customerName", label: "Customer" }, { key: "machine", label: "Machine" }, { key: "fuelType", label: "Fuel", render: (row) => titleCase(row.fuelType) }, { key: "liters", label: "Liters", value: soldLiters, render: (row) => `${fmt(soldLiters(row))} L` }, { key: "total", label: "Total", value: readingAmount, render: (row) => money(readingAmount(row)) }, { key: "paidAmount", label: "Paid", value: (row) => row.paidAmount, render: (row) => money(row.paidAmount) }, { key: "due", label: "Due", value: (row) => readingAmount(row) - row.paidAmount, render: (row) => money(readingAmount(row) - row.paidAmount) }, { key: "dueDate", label: "Due Date" }]} /></Panel> : null}
    {section === "cash" ? <Panel title="Petrol Pump Cash Sales"><DataTable rows={cashRows} columns={[{ key: "date", label: "Date" }, { key: "machine", label: "Machine" }, { key: "fuelType", label: "Fuel", render: (row) => titleCase(row.fuelType) }, { key: "liters", label: "Liters", value: soldLiters, render: (row) => `${fmt(soldLiters(row))} L` }, { key: "amount", label: "Cash Amount", value: readingAmount, render: (row) => money(readingAmount(row)) }]} /></Panel> : null}
    {section === "expenses" ? <ExpenseManager business="petrol" data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} /> : null}
    {section === "salary" ? <BusinessSalaryView business="petrol" data={data} /> : null}
    {section === "reports" ? <div className="screen-stack"><SimpleBusinessReport business="petrol" data={data} openPrint={openPrint} /><Panel title="Fuel Report" actions={<button className="primary-btn" onClick={() => openPrint({ title: "Fuel Sales Report", subtitle: `Generated ${today()}`, columns: ["Date", "Machine", "Fuel", "Opening", "Closing", "Liters Sold", "Amount", "Payment"], rows: data.machineReadings.map((item) => [item.date, item.machine, titleCase(item.fuelType), fmt(item.openingReading), fmt(item.closingReading), `${fmt(soldLiters(item))} L`, money(readingAmount(item)), titleCase(item.paymentType)]), footer: `Petrol Stock: ${fmt(metrics.petrolStock)} L · Diesel Stock: ${fmt(metrics.dieselStock)} L` })}>Print Fuel Report</button>}><DataTable rows={data.machineReadings} columns={[{ key: "date", label: "Date" }, { key: "machine", label: "Machine" }, { key: "fuelType", label: "Fuel", render: (row) => titleCase(row.fuelType) }, { key: "sold", label: "Sold", value: soldLiters, render: (row) => `${fmt(soldLiters(row))} L` }, { key: "amount", label: "Amount", value: readingAmount, render: (row) => money(readingAmount(row)) }]} /></Panel></div> : null}
    {section === "daily-closing" || section === "monthly-closing" ? <Panel title={section === "daily-closing" ? "Daily Closing" : "Monthly Closing"} actions={<button className="primary-btn" onClick={() => saveClosing(section === "daily-closing" ? "daily" : "monthly")}>Save & Print Closing</button>}><DataTable rows={closingRows.filter((item) => item.period === (section === "daily-closing" ? "daily" : "monthly"))} columns={[{ key: "date", label: "Date / Month" }, { key: "openingBalance", label: "Opening", value: (row) => row.openingBalance, render: (row) => money(row.openingBalance) }, { key: "received", label: "Received", value: (row) => row.received, render: (row) => money(row.received) }, { key: "paid", label: "Paid", value: (row) => row.paid, render: (row) => money(row.paid) }, { key: "closingBalance", label: "Closing", value: (row) => row.closingBalance, render: (row) => money(row.closingBalance) }, { key: "notes", label: "Notes" }]} /></Panel> : null}
  </div>;
}

type StoreSection = "products" | "categories" | "suppliers" | "purchase" | "purchase-return" | "inventory" | "sales" | "cash" | "credit" | "customers" | "expenses" | "reports";
function StorePanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint }: { data: ERPData; commit: CommitFn; deleteRecord: DeleteFn; addCashEntry: CashAdder; isAdmin: boolean; openPrint: (document: PrintDocument) => void }) {
  const [section, setSection] = useState<StoreSection>("products");
  const [productForm, setProductForm] = useState({ name: "", sku: "", category: "Grocery", stock: "0", reorderLevel: "10", costRate: "", saleRate: "" });
  const [purchaseForm, setPurchaseForm] = useState({ date: today(), invoiceNo: `SP-${1000 + data.storePurchases.length + 1}`, supplierId: data.suppliers.find((item) => item.business === "store")?.id || "", productId: data.storeProducts[0]?.id || "", quantity: "", rate: "", paymentType: "cash" as "cash" | "credit", paidAmount: "" });
  const [returnForm, setReturnForm] = useState({ date: today(), returnNo: `SR-${1000 + data.purchaseReturns.length + 1}`, supplierId: data.suppliers.find((item) => item.business === "store")?.id || "", productId: data.storeProducts[0]?.id || "", quantity: "", rate: "", reason: "Damaged stock" });
  const [saleForm, setSaleForm] = useState({ date: today(), invoiceNo: `INV-S-${1000 + data.sales.filter((item) => item.business === "store").length + 1}`, customerId: data.customers.find((item) => item.business === "store")?.id || "", productId: data.storeProducts[0]?.id || "", quantity: "", rate: String(data.storeProducts[0]?.saleRate || ""), paymentType: "cash" as "cash" | "credit", paidAmount: "", dueDate: dateOffset(7) });
  const tabs: Array<[StoreSection, string]> = [["products", "Products"], ["categories", "Categories"], ["suppliers", "Suppliers"], ["purchase", "Purchase"], ["purchase-return", "Purchase Return"], ["inventory", "Inventory"], ["sales", "Sales"], ["cash", "Cash"], ["credit", "Credit"], ["customers", "Customers"], ["expenses", "Expenses"], ["reports", "Reports"]];
  const addProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const record: StoreProduct = { id: uid(), name: productForm.name, sku: productForm.sku, category: productForm.category, stock: toNum(productForm.stock), reorderLevel: toNum(productForm.reorderLevel), costRate: toNum(productForm.costRate), saleRate: toNum(productForm.saleRate) };
    commit("Super Store", "Add product", record.name, (current) => ({ ...current, storeProducts: [record, ...current.storeProducts] }));
    setProductForm({ name: "", sku: "", category: "Grocery", stock: "0", reorderLevel: "10", costRate: "", saleRate: "" });
  };
  const addPurchase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const total = toNum(purchaseForm.quantity) * toNum(purchaseForm.rate);
    const paidAmount = purchaseForm.paymentType === "cash" ? total : Math.min(toNum(purchaseForm.paidAmount), total);
    const record: StorePurchase = { id: uid(), date: purchaseForm.date, invoiceNo: purchaseForm.invoiceNo, supplierId: purchaseForm.supplierId, productId: purchaseForm.productId, quantity: toNum(purchaseForm.quantity), rate: toNum(purchaseForm.rate), paymentType: purchaseForm.paymentType, paidAmount };
    const product = data.storeProducts.find((item) => item.id === record.productId);
    commit("Super Store", "Add purchase", `${product?.name}: ${record.quantity}`, (current) => {
      let next: ERPData = { ...current, storePurchases: [record, ...current.storePurchases], storeProducts: current.storeProducts.map((item) => item.id === record.productId ? { ...item, stock: item.stock + record.quantity, costRate: record.rate } : item) };
      if (paidAmount > 0) next = addCashEntry(next, { date: record.date, type: "paid", business: "store", category: "Purchase", reference: record.invoiceNo, description: product?.name || "Store purchase", amount: paidAmount });
      return next;
    });
    setPurchaseForm({ ...purchaseForm, invoiceNo: `SP-${1001 + data.storePurchases.length + 1}`, quantity: "", rate: "", paidAmount: "" });
  };
  const addReturn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const product = data.storeProducts.find((item) => item.id === returnForm.productId);
    const quantity = toNum(returnForm.quantity);
    if (!product || quantity > product.stock) { window.alert("Return quantity cannot exceed available stock."); return; }
    const record: PurchaseReturn = { id: uid(), date: returnForm.date, returnNo: returnForm.returnNo, supplierId: returnForm.supplierId, productId: returnForm.productId, quantity, rate: toNum(returnForm.rate), reason: returnForm.reason };
    commit("Super Store", "Add purchase return", `${product.name}: ${quantity}`, (current) => ({ ...current, purchaseReturns: [record, ...current.purchaseReturns], storeProducts: current.storeProducts.map((item) => item.id === record.productId ? { ...item, stock: item.stock - quantity } : item) }));
    setReturnForm({ ...returnForm, returnNo: `SR-${1001 + data.purchaseReturns.length + 1}`, quantity: "", rate: "" });
  };
  const addSale = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const product = data.storeProducts.find((item) => item.id === saleForm.productId);
    const customer = data.customers.find((item) => item.id === saleForm.customerId);
    const quantity = toNum(saleForm.quantity);
    if (!product || quantity > product.stock) { window.alert(`Only ${product?.stock || 0} units are available.`); return; }
    const total = quantity * toNum(saleForm.rate);
    const paidAmount = saleForm.paymentType === "cash" ? total : Math.min(toNum(saleForm.paidAmount), total);
    const record: Sale = { id: uid(), date: saleForm.date, business: "store", invoiceNo: saleForm.invoiceNo, customerId: saleForm.customerId, customerName: customer?.name || "Walk-in Customer", productId: product.id, productName: product.name, quantity, unit: "pcs", rate: toNum(saleForm.rate), total, paidAmount, paymentType: saleForm.paymentType, dueDate: saleForm.paymentType === "cash" ? "" : saleForm.dueDate, remarks: "POS sale" };
    commit("Super Store", "Add sale", `${record.invoiceNo}: ${money(total)}`, (current) => {
      let next: ERPData = { ...current, sales: [record, ...current.sales], storeProducts: current.storeProducts.map((item) => item.id === product.id ? { ...item, stock: item.stock - quantity } : item) };
      if (paidAmount > 0) next = addCashEntry(next, { date: record.date, type: "received", business: "store", category: "Sales", reference: record.invoiceNo, description: `${record.customerName} - ${record.productName}`, amount: paidAmount });
      return next;
    });
    openPrint({ title: "Super Store Invoice", subtitle: record.invoiceNo, fields: [["Date", record.date], ["Customer", record.customerName], ["Product", record.productName], ["Quantity", `${record.quantity} pcs`], ["Rate", money(record.rate)], ["Total", money(record.total)], ["Paid", money(record.paidAmount)], ["Balance", money(record.total - record.paidAmount)]], footer: "Thank you for shopping with us." });
    setSaleForm({ ...saleForm, invoiceNo: `INV-S-${1001 + data.sales.filter((item) => item.business === "store").length + 1}`, quantity: "", paidAmount: "" });
  };
  const storeSales = data.sales.filter((item) => item.business === "store");
  const categories = Array.from(new Set(data.storeProducts.map((item) => item.category))).map((category) => ({ id: category, category, products: data.storeProducts.filter((item) => item.category === category).length, stock: data.storeProducts.filter((item) => item.category === category).reduce((sum, item) => sum + item.stock, 0) }));
  return <div className="screen-stack"><ModuleTabs items={tabs} active={section} onChange={setSection} />
    {section === "products" ? <Panel title="Products"><form className="form-grid wide" onSubmit={addProduct}><input placeholder="Product name" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} required /><input placeholder="SKU" value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} required /><input placeholder="Category" value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /><input type="number" min="0" placeholder="Opening stock" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} /><input type="number" min="0" placeholder="Reorder level" value={productForm.reorderLevel} onChange={(event) => setProductForm({ ...productForm, reorderLevel: event.target.value })} /><input type="number" min="0" placeholder="Cost rate" value={productForm.costRate} onChange={(event) => setProductForm({ ...productForm, costRate: event.target.value })} /><input type="number" min="0" placeholder="Sale rate" value={productForm.saleRate} onChange={(event) => setProductForm({ ...productForm, saleRate: event.target.value })} /><button>Add Product</button></form><DataTable rows={data.storeProducts} columns={[{ key: "sku", label: "SKU" }, { key: "name", label: "Product" }, { key: "category", label: "Category" }, { key: "stock", label: "Stock", value: (row) => row.stock }, { key: "costRate", label: "Cost", value: (row) => row.costRate, render: (row) => money(row.costRate) }, { key: "saleRate", label: "Sale", value: (row) => row.saleRate, render: (row) => money(row.saleRate) }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("storeProducts", row.id, "Super Store", "product")}>Delete</button> : <span className="muted-text">View only</span> }]} /></Panel> : null}
    {section === "categories" ? <Panel title="Categories"><DataTable rows={categories} columns={[{ key: "category", label: "Category" }, { key: "products", label: "Products", value: (row) => row.products }, { key: "stock", label: "Total Stock", value: (row) => row.stock }]} /></Panel> : null}
    {section === "suppliers" ? <ContactManager type="supplier" business="store" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin} /> : null}
    {section === "purchase" ? <Panel title="Purchase"><form className="form-grid wide" onSubmit={addPurchase}><input type="date" value={purchaseForm.date} onChange={(event) => setPurchaseForm({ ...purchaseForm, date: event.target.value })} /><input placeholder="Invoice no" value={purchaseForm.invoiceNo} onChange={(event) => setPurchaseForm({ ...purchaseForm, invoiceNo: event.target.value })} /><select value={purchaseForm.supplierId} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplierId: event.target.value })}>{data.suppliers.filter((item) => item.business === "store").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={purchaseForm.productId} onChange={(event) => setPurchaseForm({ ...purchaseForm, productId: event.target.value })}>{data.storeProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="1" placeholder="Quantity" value={purchaseForm.quantity} onChange={(event) => setPurchaseForm({ ...purchaseForm, quantity: event.target.value })} required /><input type="number" min="0" placeholder="Rate" value={purchaseForm.rate} onChange={(event) => setPurchaseForm({ ...purchaseForm, rate: event.target.value })} required /><select value={purchaseForm.paymentType} onChange={(event) => setPurchaseForm({ ...purchaseForm, paymentType: event.target.value as "cash" | "credit" })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{purchaseForm.paymentType === "credit" ? <input type="number" min="0" placeholder="Paid amount" value={purchaseForm.paidAmount} onChange={(event) => setPurchaseForm({ ...purchaseForm, paidAmount: event.target.value })} /> : null}<button>Add Purchase</button></form><DataTable rows={data.storePurchases} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "productId", label: "Product", value: (row) => data.storeProducts.find((item) => item.id === row.productId)?.name || "Unknown" }, { key: "quantity", label: "Qty", value: (row) => row.quantity }, { key: "rate", label: "Rate", value: (row) => row.rate, render: (row) => money(row.rate) }, { key: "total", label: "Total", value: (row) => row.quantity * row.rate, render: (row) => money(row.quantity * row.rate) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }]} /></Panel> : null}
    {section === "purchase-return" ? <Panel title="Purchase Return"><form className="form-grid wide" onSubmit={addReturn}><input type="date" value={returnForm.date} onChange={(event) => setReturnForm({ ...returnForm, date: event.target.value })} /><input placeholder="Return no" value={returnForm.returnNo} onChange={(event) => setReturnForm({ ...returnForm, returnNo: event.target.value })} /><select value={returnForm.supplierId} onChange={(event) => setReturnForm({ ...returnForm, supplierId: event.target.value })}>{data.suppliers.filter((item) => item.business === "store").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={returnForm.productId} onChange={(event) => setReturnForm({ ...returnForm, productId: event.target.value })}>{data.storeProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="1" placeholder="Quantity" value={returnForm.quantity} onChange={(event) => setReturnForm({ ...returnForm, quantity: event.target.value })} required /><input type="number" min="0" placeholder="Rate" value={returnForm.rate} onChange={(event) => setReturnForm({ ...returnForm, rate: event.target.value })} /><input placeholder="Reason" value={returnForm.reason} onChange={(event) => setReturnForm({ ...returnForm, reason: event.target.value })} /><button>Save Return</button></form><DataTable rows={data.purchaseReturns} columns={[{ key: "date", label: "Date" }, { key: "returnNo", label: "Return No" }, { key: "productId", label: "Product", value: (row) => data.storeProducts.find((item) => item.id === row.productId)?.name || "Unknown" }, { key: "quantity", label: "Quantity", value: (row) => row.quantity }, { key: "rate", label: "Rate", value: (row) => row.rate, render: (row) => money(row.rate) }, { key: "reason", label: "Reason" }]} /></Panel> : null}
    {section === "inventory" ? <Panel title="Inventory"><DataTable rows={data.storeProducts} columns={[{ key: "sku", label: "SKU" }, { key: "name", label: "Product" }, { key: "category", label: "Category" }, { key: "stock", label: "Stock", value: (row) => row.stock }, { key: "reorderLevel", label: "Reorder At", value: (row) => row.reorderLevel }, { key: "value", label: "Stock Value", value: (row) => row.stock * row.costRate, render: (row) => money(row.stock * row.costRate) }, { key: "status", label: "Status", value: (row) => row.stock <= row.reorderLevel ? "Low Stock" : "Available", render: (row) => <span className={`status-badge ${row.stock <= row.reorderLevel ? "danger" : "success"}`}>{row.stock <= row.reorderLevel ? "Low Stock" : "Available"}</span> }]} /></Panel> : null}
    {section === "sales" ? <Panel title="Sales"><form className="form-grid wide" onSubmit={addSale}><input type="date" value={saleForm.date} onChange={(event) => setSaleForm({ ...saleForm, date: event.target.value })} /><input placeholder="Invoice no" value={saleForm.invoiceNo} onChange={(event) => setSaleForm({ ...saleForm, invoiceNo: event.target.value })} /><select value={saleForm.customerId} onChange={(event) => setSaleForm({ ...saleForm, customerId: event.target.value })}>{data.customers.filter((item) => item.business === "store").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={saleForm.productId} onChange={(event) => { const product = data.storeProducts.find((item) => item.id === event.target.value); setSaleForm({ ...saleForm, productId: event.target.value, rate: String(product?.saleRate || "") }); }}>{data.storeProducts.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stock})</option>)}</select><input type="number" min="1" placeholder="Quantity" value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })} required /><input type="number" min="0" placeholder="Rate" value={saleForm.rate} onChange={(event) => setSaleForm({ ...saleForm, rate: event.target.value })} required /><select value={saleForm.paymentType} onChange={(event) => setSaleForm({ ...saleForm, paymentType: event.target.value as "cash" | "credit" })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{saleForm.paymentType === "credit" ? <><input type="number" min="0" placeholder="Paid amount" value={saleForm.paidAmount} onChange={(event) => setSaleForm({ ...saleForm, paidAmount: event.target.value })} /><input type="date" value={saleForm.dueDate} onChange={(event) => setSaleForm({ ...saleForm, dueDate: event.target.value })} /></> : null}<button>Save & Print Invoice</button></form><DataTable rows={storeSales} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Product" }, { key: "quantity", label: "Qty", value: (row) => row.quantity }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "paidAmount", label: "Paid", value: (row) => row.paidAmount, render: (row) => money(row.paidAmount) }, { key: "print", label: "Invoice", render: (row) => <button className="secondary-btn mini" onClick={() => openPrint({ title: "Super Store Invoice", subtitle: row.invoiceNo, fields: [["Date", row.date], ["Customer", row.customerName], ["Product", row.productName], ["Quantity", String(row.quantity)], ["Total", money(row.total)], ["Paid", money(row.paidAmount)], ["Balance", money(row.total - row.paidAmount)]] })}>Print</button> }]} /></Panel> : null}
    {section === "cash" || section === "credit" ? <Panel title={section === "cash" ? "Cash Sales" : "Credit Sales"}><DataTable rows={storeSales.filter((item) => item.paymentType === section)} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Product" }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "paidAmount", label: "Paid", value: (row) => row.paidAmount, render: (row) => money(row.paidAmount) }, { key: "due", label: "Due", value: (row) => row.total - row.paidAmount, render: (row) => money(row.total - row.paidAmount) }]} /></Panel> : null}
    {section === "customers" ? <ContactManager type="customer" business="store" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin} /> : null}
    {section === "expenses" ? <ExpenseManager business="store" data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} /> : null}
    {section === "reports" ? <SimpleBusinessReport business="store" data={data} openPrint={openPrint} /> : null}
  </div>;
}

type GasSection = "purchase" | "stock" | "sales" | "customers" | "expenses" | "reports";
function GasPanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint }: { data: ERPData; commit: CommitFn; deleteRecord: DeleteFn; addCashEntry: CashAdder; isAdmin: boolean; openPrint: (document: PrintDocument) => void }) {
  const [section, setSection] = useState<GasSection>("purchase");
  const [productForm, setProductForm] = useState({ name: "", unit: "cylinders", openingStock: "0", reorderLevel: "5", costRate: "", saleRate: "" });
  const [purchaseForm, setPurchaseForm] = useState({ date: today(), invoiceNo: `GP-${1000 + data.gasPurchases.length + 1}`, supplierId: data.suppliers.find((item) => item.business === "gas")?.id || "", productId: data.gasProducts[0]?.id || "", quantity: "", rate: "", paymentType: "cash" as "cash" | "credit", paidAmount: "" });
  const [saleForm, setSaleForm] = useState({ date: today(), invoiceNo: `INV-G-${1000 + data.sales.filter((item) => item.business === "gas").length + 1}`, customerId: data.customers.find((item) => item.business === "gas")?.id || "", productId: data.gasProducts[0]?.id || "", quantity: "", rate: String(data.gasProducts[0]?.saleRate || ""), paymentType: "cash" as "cash" | "credit", paidAmount: "", dueDate: dateOffset(7) });
  const tabs: Array<[GasSection, string]> = [["purchase", "Purchase"], ["stock", "Stock"], ["sales", "Sales"], ["customers", "Customers"], ["expenses", "Expenses"], ["reports", "Reports"]];
  const addProduct = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const record: GasProduct = { id: uid(), name: productForm.name, unit: productForm.unit, stock: toNum(productForm.openingStock), reorderLevel: toNum(productForm.reorderLevel), costRate: toNum(productForm.costRate), saleRate: toNum(productForm.saleRate) }; commit("Gas Management", "Add gas product", record.name, (current) => ({ ...current, gasProducts: [record, ...current.gasProducts] })); setProductForm({ name: "", unit: "cylinders", openingStock: "0", reorderLevel: "5", costRate: "", saleRate: "" }); };
  const addPurchase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const total = toNum(purchaseForm.quantity) * toNum(purchaseForm.rate); const paidAmount = purchaseForm.paymentType === "cash" ? total : Math.min(toNum(purchaseForm.paidAmount), total); const product = data.gasProducts.find((item) => item.id === purchaseForm.productId); const record: GasPurchase = { id: uid(), date: purchaseForm.date, invoiceNo: purchaseForm.invoiceNo, supplierId: purchaseForm.supplierId, productId: purchaseForm.productId, quantity: toNum(purchaseForm.quantity), rate: toNum(purchaseForm.rate), paymentType: purchaseForm.paymentType, paidAmount };
    commit("Gas Management", "Add purchase", `${product?.name}: ${record.quantity}`, (current) => { let next: ERPData = { ...current, gasPurchases: [record, ...current.gasPurchases], gasProducts: current.gasProducts.map((item) => item.id === record.productId ? { ...item, stock: item.stock + record.quantity, costRate: record.rate } : item) }; if (paidAmount > 0) next = addCashEntry(next, { date: record.date, type: "paid", business: "gas", category: "Gas Purchase", reference: record.invoiceNo, description: product?.name || "Gas purchase", amount: paidAmount }); return next; });
    setPurchaseForm({ ...purchaseForm, invoiceNo: `GP-${1001 + data.gasPurchases.length + 1}`, quantity: "", rate: "", paidAmount: "" });
  };
  const addSale = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const product = data.gasProducts.find((item) => item.id === saleForm.productId); const customer = data.customers.find((item) => item.id === saleForm.customerId); const quantity = toNum(saleForm.quantity); if (!product || quantity > product.stock) { window.alert(`Only ${product?.stock || 0} units are available.`); return; } const total = quantity * toNum(saleForm.rate); const paidAmount = saleForm.paymentType === "cash" ? total : Math.min(toNum(saleForm.paidAmount), total); const record: Sale = { id: uid(), date: saleForm.date, business: "gas", invoiceNo: saleForm.invoiceNo, customerId: saleForm.customerId, customerName: customer?.name || "Walk-in Customer", productId: product.id, productName: product.name, quantity, unit: product.unit, rate: toNum(saleForm.rate), total, paidAmount, paymentType: saleForm.paymentType, dueDate: saleForm.paymentType === "cash" ? "" : saleForm.dueDate, remarks: "" };
    commit("Gas Management", "Add sale", `${record.invoiceNo}: ${money(total)}`, (current) => { let next: ERPData = { ...current, sales: [record, ...current.sales], gasProducts: current.gasProducts.map((item) => item.id === product.id ? { ...item, stock: item.stock - quantity } : item) }; if (paidAmount > 0) next = addCashEntry(next, { date: record.date, type: "received", business: "gas", category: "Gas Sales", reference: record.invoiceNo, description: `${record.customerName} - ${record.productName}`, amount: paidAmount }); return next; });
    openPrint({ title: "Gas Sale Invoice", subtitle: record.invoiceNo, fields: [["Date", record.date], ["Customer", record.customerName], ["Product", record.productName], ["Quantity", `${record.quantity} ${record.unit}`], ["Rate", money(record.rate)], ["Total", money(record.total)], ["Paid", money(record.paidAmount)], ["Balance", money(record.total - record.paidAmount)]], footer: "PK Business ERP Suite - Gas Management" });
    setSaleForm({ ...saleForm, invoiceNo: `INV-G-${1001 + data.sales.filter((item) => item.business === "gas").length + 1}`, quantity: "", paidAmount: "" });
  };
  const gasSales = data.sales.filter((item) => item.business === "gas");
  return <div className="screen-stack"><ModuleTabs items={tabs} active={section} onChange={setSection} />
    {section === "purchase" ? <div className="screen-stack"><Panel title="Gas Products"><form className="form-grid wide" onSubmit={addProduct}><input placeholder="Product name" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} required /><input placeholder="Unit" value={productForm.unit} onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })} /><input type="number" min="0" placeholder="Opening stock" value={productForm.openingStock} onChange={(event) => setProductForm({ ...productForm, openingStock: event.target.value })} /><input type="number" min="0" placeholder="Reorder level" value={productForm.reorderLevel} onChange={(event) => setProductForm({ ...productForm, reorderLevel: event.target.value })} /><input type="number" min="0" placeholder="Cost rate" value={productForm.costRate} onChange={(event) => setProductForm({ ...productForm, costRate: event.target.value })} /><input type="number" min="0" placeholder="Sale rate" value={productForm.saleRate} onChange={(event) => setProductForm({ ...productForm, saleRate: event.target.value })} /><button>Add Product</button></form></Panel><Panel title="Gas Purchase"><form className="form-grid wide" onSubmit={addPurchase}><input type="date" value={purchaseForm.date} onChange={(event) => setPurchaseForm({ ...purchaseForm, date: event.target.value })} /><input placeholder="Invoice no" value={purchaseForm.invoiceNo} onChange={(event) => setPurchaseForm({ ...purchaseForm, invoiceNo: event.target.value })} /><select value={purchaseForm.supplierId} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplierId: event.target.value })}>{data.suppliers.filter((item) => item.business === "gas").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={purchaseForm.productId} onChange={(event) => setPurchaseForm({ ...purchaseForm, productId: event.target.value })}>{data.gasProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="1" placeholder="Quantity" value={purchaseForm.quantity} onChange={(event) => setPurchaseForm({ ...purchaseForm, quantity: event.target.value })} required /><input type="number" min="0" placeholder="Rate" value={purchaseForm.rate} onChange={(event) => setPurchaseForm({ ...purchaseForm, rate: event.target.value })} required /><select value={purchaseForm.paymentType} onChange={(event) => setPurchaseForm({ ...purchaseForm, paymentType: event.target.value as "cash" | "credit" })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{purchaseForm.paymentType === "credit" ? <input type="number" min="0" placeholder="Paid amount" value={purchaseForm.paidAmount} onChange={(event) => setPurchaseForm({ ...purchaseForm, paidAmount: event.target.value })} /> : null}<button>Add Purchase</button></form><DataTable rows={data.gasPurchases} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "productId", label: "Product", value: (row) => data.gasProducts.find((item) => item.id === row.productId)?.name || "Unknown" }, { key: "quantity", label: "Quantity", value: (row) => row.quantity }, { key: "rate", label: "Rate", value: (row) => row.rate, render: (row) => money(row.rate) }, { key: "total", label: "Total", value: (row) => row.quantity * row.rate, render: (row) => money(row.quantity * row.rate) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }]} /></Panel></div> : null}
    {section === "stock" ? <Panel title="Gas Stock"><DataTable rows={data.gasProducts} columns={[{ key: "name", label: "Product" }, { key: "unit", label: "Unit" }, { key: "stock", label: "Stock", value: (row) => row.stock }, { key: "reorderLevel", label: "Reorder At", value: (row) => row.reorderLevel }, { key: "costRate", label: "Cost", value: (row) => row.costRate, render: (row) => money(row.costRate) }, { key: "saleRate", label: "Sale Rate", value: (row) => row.saleRate, render: (row) => money(row.saleRate) }, { key: "value", label: "Stock Value", value: (row) => row.stock * row.costRate, render: (row) => money(row.stock * row.costRate) }, { key: "status", label: "Status", value: (row) => row.stock <= row.reorderLevel ? "Low Stock" : "Available", render: (row) => <span className={`status-badge ${row.stock <= row.reorderLevel ? "danger" : "success"}`}>{row.stock <= row.reorderLevel ? "Low Stock" : "Available"}</span> }]} /></Panel> : null}
    {section === "sales" ? <Panel title="Gas Sales"><form className="form-grid wide" onSubmit={addSale}><input type="date" value={saleForm.date} onChange={(event) => setSaleForm({ ...saleForm, date: event.target.value })} /><input placeholder="Invoice no" value={saleForm.invoiceNo} onChange={(event) => setSaleForm({ ...saleForm, invoiceNo: event.target.value })} /><select value={saleForm.customerId} onChange={(event) => setSaleForm({ ...saleForm, customerId: event.target.value })}>{data.customers.filter((item) => item.business === "gas").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={saleForm.productId} onChange={(event) => { const product = data.gasProducts.find((item) => item.id === event.target.value); setSaleForm({ ...saleForm, productId: event.target.value, rate: String(product?.saleRate || "") }); }}>{data.gasProducts.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stock})</option>)}</select><input type="number" min="1" placeholder="Quantity" value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })} required /><input type="number" min="0" placeholder="Rate" value={saleForm.rate} onChange={(event) => setSaleForm({ ...saleForm, rate: event.target.value })} required /><select value={saleForm.paymentType} onChange={(event) => setSaleForm({ ...saleForm, paymentType: event.target.value as "cash" | "credit" })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{saleForm.paymentType === "credit" ? <><input type="number" min="0" placeholder="Paid amount" value={saleForm.paidAmount} onChange={(event) => setSaleForm({ ...saleForm, paidAmount: event.target.value })} /><input type="date" value={saleForm.dueDate} onChange={(event) => setSaleForm({ ...saleForm, dueDate: event.target.value })} /></> : null}<button>Save & Print Invoice</button></form><DataTable rows={gasSales} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Product" }, { key: "quantity", label: "Qty", value: (row) => row.quantity }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "due", label: "Due", value: (row) => row.total - row.paidAmount, render: (row) => money(row.total - row.paidAmount) }, { key: "print", label: "Invoice", render: (row) => <button className="secondary-btn mini" onClick={() => openPrint({ title: "Gas Sale Invoice", subtitle: row.invoiceNo, fields: [["Date", row.date], ["Customer", row.customerName], ["Product", row.productName], ["Quantity", `${row.quantity} ${row.unit}`], ["Total", money(row.total)], ["Paid", money(row.paidAmount)], ["Balance", money(row.total - row.paidAmount)]] })}>Print</button> }]} /></Panel> : null}
    {section === "customers" ? <ContactManager type="customer" business="gas" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin} /> : null}
    {section === "expenses" ? <ExpenseManager business="gas" data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} /> : null}
    {section === "reports" ? <SimpleBusinessReport business="gas" data={data} openPrint={openPrint} /> : null}
  </div>;
}

type CashSection = "entries" | "daily" | "monthly";
function CashBookPanel({ data, commit, deleteRecord, metrics, openPrint }: { data: ERPData; commit: CommitFn; deleteRecord: DeleteFn; metrics: ReturnType<typeof calculateMetrics>; openPrint: (document: PrintDocument) => void }) {
  const [section, setSection] = useState<CashSection>("entries");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [form, setForm] = useState({ date: today(), type: "received" as CashEntryType, business: "common" as BusinessKey, category: "General", reference: "", description: "", amount: "" });
  const tabs: Array<[CashSection, string]> = [["entries", "Cash Book"], ["daily", "Daily Closing"], ["monthly", "Monthly Closing"]];
  const addEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const record: CashEntry = { id: uid(), date: form.date, type: form.type, business: form.business, category: form.category, reference: form.reference || `CB-${Date.now().toString().slice(-6)}`, description: form.description, amount: toNum(form.amount) };
    commit("Cash Book", "Add cash entry", `${titleCase(record.type)} ${money(record.amount)}`, (current) => ({ ...current, cashEntries: [record, ...current.cashEntries] }));
    setForm({ ...form, reference: "", description: "", amount: "" });
  };
  const saveClosing = (period: "daily" | "monthly") => {
    const date = period === "daily" ? today() : `${today().slice(0, 7)}-01`; const prefix = period === "daily" ? today() : today().slice(0, 7);
    const entries = data.cashEntries.filter((item) => item.date.startsWith(prefix) && (businessFilter === "all" || item.business === businessFilter));
    const received = entries.filter((item) => item.type === "received" || item.type === "opening").reduce((sum, item) => sum + item.amount, 0);
    const paid = entries.filter((item) => item.type === "paid" || item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    const previous = data.closings.find((item) => item.period === period && item.business === (businessFilter as BusinessKey | "all"))?.closingBalance || (businessFilter === "all" ? data.settings.openingCashBalance : 0);
    const record: ClosingRecord = { id: uid(), date, period, business: businessFilter as BusinessKey | "all", openingBalance: previous, received, paid, closingBalance: previous + received - paid, notes: `${businessFilter === "all" ? "Consolidated" : businessLabel(businessFilter as BusinessKey)} ${period} closing` };
    commit("Cash Book", `Save ${period} closing`, money(record.closingBalance), (current) => ({ ...current, closings: [record, ...current.closings] }));
    openPrint({ title: `${titleCase(period)} Cash Closing`, subtitle: record.date, fields: [["Business", businessLabel(record.business)], ["Opening Balance", money(record.openingBalance)], ["Cash Received", money(record.received)], ["Cash Paid", money(record.paid)], ["Closing Balance", money(record.closingBalance)]], footer: "PK Business ERP Suite Cash Book" });
  };
  const rows = data.cashEntries.filter((item) => businessFilter === "all" || item.business === businessFilter);
  const dailyRows = data.closings.filter((item) => item.period === "daily"); const monthlyRows = data.closings.filter((item) => item.period === "monthly");
  return <div className="screen-stack"><div className="stats-grid compact"><StatCard label="Opening Balance" value={money(data.settings.openingCashBalance)} /><StatCard label="Cash Received" value={money(data.cashEntries.filter((item) => item.type === "received").reduce((sum, item) => sum + item.amount, 0))} /><StatCard label="Cash Paid" value={money(data.cashEntries.filter((item) => item.type === "paid" || item.type === "expense").reduce((sum, item) => sum + item.amount, 0))} /><StatCard label="Closing Balance" value={money(metrics.cashBalance)} tone="success" /></div><ModuleTabs items={tabs} active={section} onChange={setSection} />
    {section === "entries" ? <Panel title="Cash Book Entries" actions={<button className="secondary-btn" onClick={() => openPrint({ title: "Cash Book Report", subtitle: `Generated ${today()}`, columns: ["Date", "Business", "Type", "Category", "Reference", "Description", "Amount"], rows: rows.map((item) => [item.date, businessLabel(item.business), titleCase(item.type), item.category, item.reference, item.description, money(item.amount)]), footer: `Closing Balance: ${money(metrics.cashBalance)}` })}>Print Cash Book</button>}><form className="form-grid wide" onSubmit={addEntry}><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as CashEntryType })}><option value="received">Cash Received</option><option value="paid">Cash Paid</option><option value="expense">Expense</option><option value="opening">Opening Balance</option></select><select value={form.business} onChange={(event) => setForm({ ...form, business: event.target.value as BusinessKey })}><option value="feed">Feed Unit</option><option value="chakki">Chakki</option><option value="petrol">Petrol Pump</option><option value="store">Super Store</option><option value="gas">Gas Management</option><option value="common">Common</option></select><input placeholder="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /><input placeholder="Reference" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /><input placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /><input type="number" min="0" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /><button>Add Entry</button></form><DataTable rows={rows} filterLabel="Business" filterValue={businessFilter} filterOptions={["all", "feed", "chakki", "petrol", "store", "gas", "common"]} onFilterChange={setBusinessFilter} columns={[{ key: "date", label: "Date" }, { key: "business", label: "Business", render: (row) => businessLabel(row.business) }, { key: "type", label: "Type", render: (row) => titleCase(row.type) }, { key: "category", label: "Category" }, { key: "reference", label: "Reference" }, { key: "description", label: "Description" }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "actions", label: "Actions", render: (row) => <button className="text-danger" onClick={() => deleteRecord("cashEntries", row.id, "Cash Book", "entry")}>Delete</button> }]} /></Panel> : null}
    {section === "daily" || section === "monthly" ? <Panel title={section === "daily" ? "Daily Closing" : "Monthly Closing"} actions={<div className="panel-actions"><select className="date-filter" value={businessFilter} onChange={(event) => setBusinessFilter(event.target.value)}><option value="all">All Businesses</option><option value="feed">Feed Unit</option><option value="chakki">Chakki</option><option value="petrol">Petrol Pump</option><option value="store">Super Store</option><option value="gas">Gas Management</option></select><button className="primary-btn" onClick={() => saveClosing(section === "daily" ? "daily" : "monthly")}>Save & Print Closing</button></div>}><DataTable rows={section === "daily" ? dailyRows : monthlyRows} columns={[{ key: "date", label: "Date / Month" }, { key: "business", label: "Business", render: (row) => businessLabel(row.business) }, { key: "openingBalance", label: "Opening", value: (row) => row.openingBalance, render: (row) => money(row.openingBalance) }, { key: "received", label: "Received", value: (row) => row.received, render: (row) => money(row.received) }, { key: "paid", label: "Paid", value: (row) => row.paid, render: (row) => money(row.paid) }, { key: "closingBalance", label: "Closing", value: (row) => row.closingBalance, render: (row) => money(row.closingBalance) }, { key: "notes", label: "Notes" }]} /></Panel> : null}
  </div>;
}

type StaffSection = "staff" | "salary" | "salary-history";
function StaffPanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint }: { data: ERPData; commit: CommitFn; deleteRecord: DeleteFn; addCashEntry: CashAdder; isAdmin: boolean; openPrint: (document: PrintDocument) => void }) {
  const [section, setSection] = useState<StaffSection>("staff");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [staffForm, setStaffForm] = useState({ business: "feed" as BusinessKey, name: "", roleTitle: "Staff", phone: "", monthlySalary: "", joiningDate: today(), status: "active" as "active" | "inactive" });
  const [salaryForm, setSalaryForm] = useState({ date: today(), staffId: data.staff[0]?.id || "", month: today().slice(0, 7), amount: String(data.staff[0]?.monthlySalary || ""), status: "paid" as "paid" | "pending", notes: "" });
  const tabs: Array<[StaffSection, string]> = [["staff", "Staff"], ["salary", "Salary"], ["salary-history", "Salary History"]];
  const addStaff = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const record: StaffMember = { id: uid(), business: staffForm.business, name: staffForm.name, roleTitle: staffForm.roleTitle, phone: staffForm.phone, monthlySalary: toNum(staffForm.monthlySalary), joiningDate: staffForm.joiningDate, status: staffForm.status };
    commit("Staff", "Add staff member", record.name, (current) => ({ ...current, staff: [record, ...current.staff] }));
    setStaffForm({ business: "feed", name: "", roleTitle: "Staff", phone: "", monthlySalary: "", joiningDate: today(), status: "active" });
  };
  const paySalary = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const member = data.staff.find((item) => item.id === salaryForm.staffId); if (!member) return; const record: SalaryPayment = { id: uid(), date: salaryForm.date, staffId: salaryForm.staffId, month: salaryForm.month, amount: toNum(salaryForm.amount), status: salaryForm.status, notes: salaryForm.notes };
    commit("Staff", `${record.status === "paid" ? "Pay" : "Record pending"} salary`, `${member.name}: ${money(record.amount)}`, (current) => { let next: ERPData = { ...current, salaryPayments: [record, ...current.salaryPayments] }; if (record.status === "paid") next = addCashEntry(next, { date: record.date, type: "paid", business: member.business, category: "Salary", reference: record.id, description: `${member.name} salary ${record.month}`, amount: record.amount }); return next; });
    openPrint({ title: "Salary Receipt", subtitle: record.month, fields: [["Date", record.date], ["Employee", member.name], ["Business", businessLabel(member.business)], ["Role", member.roleTitle], ["Salary Month", record.month], ["Amount", money(record.amount)], ["Status", titleCase(record.status)], ["Notes", record.notes || "—"]], footer: "PK Business ERP Suite" });
    setSalaryForm({ ...salaryForm, amount: String(member.monthlySalary), notes: "" });
  };
  const staffRows = data.staff.filter((item) => businessFilter === "all" || item.business === businessFilter);
  return <div className="screen-stack"><ModuleTabs items={tabs} active={section} onChange={setSection} />
    {section === "staff" ? <Panel title="Staff Management"><form className="form-grid wide" onSubmit={addStaff}><select value={staffForm.business} onChange={(event) => setStaffForm({ ...staffForm, business: event.target.value as BusinessKey })}><option value="feed">Feed Unit</option><option value="chakki">Chakki</option><option value="petrol">Petrol Pump</option><option value="store">Super Store</option><option value="gas">Gas Management</option><option value="common">Common</option></select><input placeholder="Staff name" value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} required /><input placeholder="Role / designation" value={staffForm.roleTitle} onChange={(event) => setStaffForm({ ...staffForm, roleTitle: event.target.value })} /><input placeholder="Phone" value={staffForm.phone} onChange={(event) => setStaffForm({ ...staffForm, phone: event.target.value })} /><input type="number" min="0" placeholder="Monthly salary" value={staffForm.monthlySalary} onChange={(event) => setStaffForm({ ...staffForm, monthlySalary: event.target.value })} required /><input type="date" value={staffForm.joiningDate} onChange={(event) => setStaffForm({ ...staffForm, joiningDate: event.target.value })} /><select value={staffForm.status} onChange={(event) => setStaffForm({ ...staffForm, status: event.target.value as "active" | "inactive" })}><option value="active">Active</option><option value="inactive">Inactive</option></select><button>Add Staff</button></form><DataTable rows={staffRows} filterLabel="Business" filterValue={businessFilter} filterOptions={["all", "feed", "chakki", "petrol", "store", "gas", "common"]} onFilterChange={setBusinessFilter} columns={[{ key: "business", label: "Business", render: (row) => businessLabel(row.business) }, { key: "name", label: "Name" }, { key: "roleTitle", label: "Role" }, { key: "phone", label: "Phone" }, { key: "monthlySalary", label: "Salary", value: (row) => row.monthlySalary, render: (row) => money(row.monthlySalary) }, { key: "joiningDate", label: "Joining" }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("staff", row.id, "Staff", "staff member")}>Delete</button> : <span className="muted-text">View only</span> }]} /></Panel> : null}
    {section === "salary" ? <Panel title="Salary"><form className="form-grid wide" onSubmit={paySalary}><input type="date" value={salaryForm.date} onChange={(event) => setSalaryForm({ ...salaryForm, date: event.target.value })} /><select value={salaryForm.staffId} onChange={(event) => { const member = data.staff.find((item) => item.id === event.target.value); setSalaryForm({ ...salaryForm, staffId: event.target.value, amount: String(member?.monthlySalary || "") }); }}>{data.staff.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {businessLabel(item.business)}</option>)}</select><input type="month" value={salaryForm.month} onChange={(event) => setSalaryForm({ ...salaryForm, month: event.target.value })} /><input type="number" min="0" placeholder="Amount" value={salaryForm.amount} onChange={(event) => setSalaryForm({ ...salaryForm, amount: event.target.value })} required /><select value={salaryForm.status} onChange={(event) => setSalaryForm({ ...salaryForm, status: event.target.value as "paid" | "pending" })}><option value="paid">Paid</option><option value="pending">Pending</option></select><input placeholder="Notes" value={salaryForm.notes} onChange={(event) => setSalaryForm({ ...salaryForm, notes: event.target.value })} /><button>Save & Print Salary</button></form><div className="stats-grid compact"><StatCard label="Active Monthly Payroll" value={money(data.staff.filter((item) => item.status === "active").reduce((sum, item) => sum + item.monthlySalary, 0))} /><StatCard label="Paid This Month" value={money(data.salaryPayments.filter((item) => item.month === today().slice(0, 7) && item.status === "paid").reduce((sum, item) => sum + item.amount, 0))} /><StatCard label="Pending Entries" value={fmt(data.salaryPayments.filter((item) => item.status === "pending").length)} /><StatCard label="Active Staff" value={fmt(data.staff.filter((item) => item.status === "active").length)} /></div></Panel> : null}
    {section === "salary-history" ? <Panel title="Salary History" actions={<button className="secondary-btn" onClick={() => openPrint({ title: "Salary Report", subtitle: `Generated ${today()}`, columns: ["Date", "Month", "Employee", "Business", "Amount", "Status"], rows: data.salaryPayments.map((item) => { const member = data.staff.find((staff) => staff.id === item.staffId); return [item.date, item.month, member?.name || "Unknown", member ? businessLabel(member.business) : "—", money(item.amount), titleCase(item.status)]; }), footer: `Total Paid: ${money(data.salaryPayments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0))}` })}>Print Salary Report</button>}><DataTable rows={data.salaryPayments} columns={[{ key: "date", label: "Date" }, { key: "month", label: "Month" }, { key: "staffId", label: "Employee", value: (row) => data.staff.find((item) => item.id === row.staffId)?.name || "Unknown" }, { key: "business", label: "Business", value: (row) => { const member = data.staff.find((item) => item.id === row.staffId); return member ? businessLabel(member.business) : "—"; } }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }, { key: "notes", label: "Notes" }]} /></Panel> : null}
  </div>;
}

type ReportType = "sales" | "expenses" | "profit" | "inventory" | "customer-ledger" | "supplier-ledger" | "cash-book";
function ReportsPanel({ data, metrics, openPrint }: { data: ERPData; metrics: ReturnType<typeof calculateMetrics>; openPrint: (document: PrintDocument) => void }) {
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [business, setBusiness] = useState("all");
  const [selectedDate, setSelectedDate] = useState(today());
  const matchPeriod = (date: string) => period === "daily" ? date === selectedDate : period === "monthly" ? date.slice(0, 7) === selectedDate.slice(0, 7) : date.slice(0, 4) === selectedDate.slice(0, 4);
  const matchBusiness = (value: BusinessKey) => business === "all" || value === business;
  const salesRows = [
    ...data.sales.filter((item) => matchPeriod(item.date) && matchBusiness(item.business)).map((item) => ({ id: item.id, date: item.date, business: businessLabel(item.business), reference: item.invoiceNo, party: item.customerName, detail: item.productName, total: item.total, paid: item.paidAmount, due: item.total - item.paidAmount })),
    ...data.grindingJobs.filter((item) => matchPeriod(item.date) && matchBusiness("chakki")).map((item) => ({ id: item.id, date: item.date, business: "Chakki", reference: item.receiptNo, party: item.customerName, detail: "Grinding Service", total: item.charges, paid: item.paidAmount, due: item.charges - item.paidAmount })),
    ...data.machineReadings.filter((item) => matchPeriod(item.date) && matchBusiness("petrol")).map((item) => ({ id: item.id, date: item.date, business: "Petrol Pump", reference: `${item.machine}-${item.date}`, party: item.customerName, detail: `${titleCase(item.fuelType)} ${fmt(soldLiters(item))} L`, total: readingAmount(item), paid: item.paidAmount, due: readingAmount(item) - item.paidAmount })),
  ];
  const expenseRows = data.expenses.filter((item) => matchPeriod(item.date) && matchBusiness(item.business));
  const cashRows = data.cashEntries.filter((item) => matchPeriod(item.date) && (business === "all" || item.business === business));
  const customerLedger = data.customers.filter((item) => business === "all" || item.business === business).map((customer) => { const regular = data.sales.filter((sale) => sale.customerId === customer.id).reduce((sum, sale) => sum + sale.total - sale.paidAmount, 0); const pump = data.machineReadings.filter((reading) => reading.customerId === customer.id).reduce((sum, reading) => sum + readingAmount(reading) - reading.paidAmount, 0); return { id: customer.id, business: businessLabel(customer.business), name: customer.name, phone: customer.phone, opening: customer.openingBalance, salesDue: regular + pump, balance: customer.openingBalance + regular + pump, creditLimit: customer.creditLimit }; });
  const supplierLedger = data.suppliers.filter((item) => business === "all" || item.business === business).map((supplier) => { const feed = data.rawMaterialPurchases.filter((item) => item.supplierId === supplier.id).reduce((sum, item) => sum + item.quantity * item.rate - item.paidAmount, 0); const fuel = data.fuelPurchases.filter((item) => item.supplierId === supplier.id).reduce((sum, item) => sum + item.liters * item.rate - item.paidAmount, 0); const store = data.storePurchases.filter((item) => item.supplierId === supplier.id).reduce((sum, item) => sum + item.quantity * item.rate - item.paidAmount, 0); const gas = data.gasPurchases.filter((item) => item.supplierId === supplier.id).reduce((sum, item) => sum + item.quantity * item.rate - item.paidAmount, 0); return { id: supplier.id, business: businessLabel(supplier.business), name: supplier.name, phone: supplier.phone, opening: supplier.openingBalance, purchasesDue: feed + fuel + store + gas, balance: supplier.openingBalance + feed + fuel + store + gas }; });
  const inventoryRows = [
    ...data.rawMaterials.map((item) => ({ id: `rm-${item.id}`, business: "Feed Unit", item: item.name, quantity: `${fmt(item.stock)} ${item.unit}`, value: item.stock * item.averageRate, status: item.stock <= item.reorderLevel ? "Low Stock" : "Available" })),
    ...data.bagInventory.map((item) => ({ id: `bag-${item.id}`, business: "Feed Unit", item: `${item.productName} ${item.bagSize} KG`, quantity: `${item.quantity} bags`, value: item.quantity * item.costRate, status: item.quantity <= item.reorderLevel ? "Low Stock" : "Available" })),
    ...data.flourProducts.map((item) => ({ id: `flour-${item.id}`, business: "Chakki", item: item.name, quantity: `${item.stock} bags`, value: item.stock * item.costRate, status: item.stock <= item.reorderLevel ? "Low Stock" : "Available" })),
    ...data.storeProducts.map((item) => ({ id: `store-${item.id}`, business: "Super Store", item: item.name, quantity: `${item.stock} pcs`, value: item.stock * item.costRate, status: item.stock <= item.reorderLevel ? "Low Stock" : "Available" })),
    ...data.gasProducts.map((item) => ({ id: `gas-${item.id}`, business: "Gas Management", item: item.name, quantity: `${item.stock} ${item.unit}`, value: item.stock * item.costRate, status: item.stock <= item.reorderLevel ? "Low Stock" : "Available" })),
    { id: "fuel-petrol", business: "Petrol Pump", item: "Petrol Tank", quantity: `${fmt(metrics.petrolStock)} L`, value: metrics.petrolStock * 271.5, status: metrics.petrolStock <= data.settings.petrolReorderLevel ? "Low Stock" : "Available" },
    { id: "fuel-diesel", business: "Petrol Pump", item: "Diesel Tank", quantity: `${fmt(metrics.dieselStock)} L`, value: metrics.dieselStock * 279.2, status: metrics.dieselStock <= data.settings.dieselReorderLevel ? "Low Stock" : "Available" },
  ].filter((item) => business === "all" || item.business === businessLabel(business as BusinessKey));
  const periodLabel = period === "daily" ? selectedDate : period === "monthly" ? selectedDate.slice(0, 7) : selectedDate.slice(0, 4);
  const printReport = () => {
    if (reportType === "sales") openPrint({ title: `${titleCase(period)} Sales Report`, subtitle: periodLabel, columns: ["Date", "Business", "Reference", "Customer", "Detail", "Total", "Paid", "Due"], rows: salesRows.map((item) => [item.date, item.business, item.reference, item.party, item.detail, money(item.total), money(item.paid), money(item.due)]), footer: `Sales: ${money(salesRows.reduce((sum, item) => sum + item.total, 0))} · Due: ${money(salesRows.reduce((sum, item) => sum + item.due, 0))}` });
    else if (reportType === "expenses") openPrint({ title: `${titleCase(period)} Expense Report`, subtitle: periodLabel, columns: ["Date", "Business", "Title", "Category", "Amount", "Payment"], rows: expenseRows.map((item) => [item.date, businessLabel(item.business), item.title, item.category, money(item.amount), titleCase(item.paymentType)]), footer: `Expenses: ${money(expenseRows.reduce((sum, item) => sum + item.amount, 0))}` });
    else if (reportType === "profit") openPrint({ title: `${titleCase(period)} Profit Report`, subtitle: periodLabel, fields: [["Sales", money(salesRows.reduce((sum, item) => sum + item.total, 0))], ["Expenses", money(expenseRows.reduce((sum, item) => sum + item.amount, 0))], ["Estimated Profit", money(salesRows.reduce((sum, item) => sum + item.total, 0) - expenseRows.reduce((sum, item) => sum + item.amount, 0))]], footer: "Demo profit excludes detailed accounting adjustments." });
    else if (reportType === "inventory") openPrint({ title: "Inventory Report", subtitle: periodLabel, columns: ["Business", "Item", "Quantity", "Value", "Status"], rows: inventoryRows.map((item) => [item.business, item.item, item.quantity, money(item.value), item.status]), footer: `Inventory Value: ${money(inventoryRows.reduce((sum, item) => sum + item.value, 0))}` });
    else if (reportType === "customer-ledger") openPrint({ title: "Customer Ledger", subtitle: periodLabel, columns: ["Business", "Customer", "Phone", "Opening", "Current Due", "Balance", "Credit Limit"], rows: customerLedger.map((item) => [item.business, item.name, item.phone, money(item.opening), money(item.salesDue), money(item.balance), money(item.creditLimit)]) });
    else if (reportType === "supplier-ledger") openPrint({ title: "Supplier Ledger", subtitle: periodLabel, columns: ["Business", "Supplier", "Phone", "Opening", "Purchase Due", "Balance"], rows: supplierLedger.map((item) => [item.business, item.name, item.phone, money(item.opening), money(item.purchasesDue), money(item.balance)]) });
    else openPrint({ title: "Cash Book Report", subtitle: periodLabel, columns: ["Date", "Business", "Type", "Category", "Reference", "Description", "Amount"], rows: cashRows.map((item) => [item.date, businessLabel(item.business), titleCase(item.type), item.category, item.reference, item.description, money(item.amount)]), footer: `Closing Balance: ${money(metrics.cashBalance)}` });
  };
  const reportTabs: Array<[ReportType, string]> = [["sales", "Sales"], ["expenses", "Expenses"], ["profit", "Profit"], ["inventory", "Inventory"], ["customer-ledger", "Customer Ledger"], ["supplier-ledger", "Supplier Ledger"], ["cash-book", "Cash Book"]];
  return <div className="screen-stack"><Panel title="Report Filters" actions={<button className="primary-btn" onClick={printReport}>Print Preview</button>}><div className="report-filters"><label>Period<select value={period} onChange={(event) => setPeriod(event.target.value as "daily" | "monthly" | "yearly")}><option value="daily">Daily</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label><label>Date<input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><label>Business<select value={business} onChange={(event) => setBusiness(event.target.value)}><option value="all">All Businesses</option><option value="feed">Feed Unit</option><option value="chakki">Chakki</option><option value="petrol">Petrol Pump</option><option value="store">Super Store</option><option value="gas">Gas Management</option></select></label></div></Panel><ModuleTabs items={reportTabs} active={reportType} onChange={setReportType} />
    {reportType === "sales" ? <Panel title="Sales Report"><DataTable rows={salesRows} columns={[{ key: "date", label: "Date" }, { key: "business", label: "Business" }, { key: "reference", label: "Reference" }, { key: "party", label: "Customer" }, { key: "detail", label: "Detail" }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "paid", label: "Paid", value: (row) => row.paid, render: (row) => money(row.paid) }, { key: "due", label: "Due", value: (row) => row.due, render: (row) => money(row.due) }]} /></Panel> : null}
    {reportType === "expenses" ? <Panel title="Expense Report"><DataTable rows={expenseRows} columns={[{ key: "date", label: "Date" }, { key: "business", label: "Business", render: (row) => businessLabel(row.business) }, { key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }]} /></Panel> : null}
    {reportType === "profit" ? <div className="stats-grid compact"><StatCard label="Sales" value={money(salesRows.reduce((sum, item) => sum + item.total, 0))} /><StatCard label="Expenses" value={money(expenseRows.reduce((sum, item) => sum + item.amount, 0))} /><StatCard label="Estimated Profit" value={money(salesRows.reduce((sum, item) => sum + item.total, 0) - expenseRows.reduce((sum, item) => sum + item.amount, 0))} tone="success" /><StatCard label="Outstanding" value={money(salesRows.reduce((sum, item) => sum + item.due, 0))} tone="warning" /></div> : null}
    {reportType === "inventory" ? <Panel title="Inventory Report"><DataTable rows={inventoryRows} columns={[{ key: "business", label: "Business" }, { key: "item", label: "Item" }, { key: "quantity", label: "Quantity" }, { key: "value", label: "Value", value: (row) => row.value, render: (row) => money(row.value) }, { key: "status", label: "Status", render: (row) => <span className={`status-badge ${row.status === "Low Stock" ? "danger" : "success"}`}>{row.status}</span> }]} /></Panel> : null}
    {reportType === "customer-ledger" ? <Panel title="Customer Ledger"><DataTable rows={customerLedger} columns={[{ key: "business", label: "Business" }, { key: "name", label: "Customer" }, { key: "phone", label: "Phone" }, { key: "opening", label: "Opening", value: (row) => row.opening, render: (row) => money(row.opening) }, { key: "salesDue", label: "Current Due", value: (row) => row.salesDue, render: (row) => money(row.salesDue) }, { key: "balance", label: "Balance", value: (row) => row.balance, render: (row) => money(row.balance) }, { key: "creditLimit", label: "Credit Limit", value: (row) => row.creditLimit, render: (row) => money(row.creditLimit) }]} /></Panel> : null}
    {reportType === "supplier-ledger" ? <Panel title="Supplier Ledger"><DataTable rows={supplierLedger} columns={[{ key: "business", label: "Business" }, { key: "name", label: "Supplier" }, { key: "phone", label: "Phone" }, { key: "opening", label: "Opening", value: (row) => row.opening, render: (row) => money(row.opening) }, { key: "purchasesDue", label: "Purchase Due", value: (row) => row.purchasesDue, render: (row) => money(row.purchasesDue) }, { key: "balance", label: "Balance", value: (row) => row.balance, render: (row) => money(row.balance) }]} /></Panel> : null}
    {reportType === "cash-book" ? <Panel title="Cash Book Report"><DataTable rows={cashRows} columns={[{ key: "date", label: "Date" }, { key: "business", label: "Business", render: (row) => businessLabel(row.business) }, { key: "type", label: "Type", render: (row) => titleCase(row.type) }, { key: "category", label: "Category" }, { key: "reference", label: "Reference" }, { key: "description", label: "Description" }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }]} /></Panel> : null}
  </div>;
}

type SettingsSection = "activity" | "notifications" | "backup" | "restore" | "settings" | "users" | "roles" | "permissions";
function SettingsPanel({ data, setData, commit, deleteRecord, isAdmin }: { data: ERPData; setData: Dispatch<SetStateAction<ERPData>>; commit: CommitFn; deleteRecord: DeleteFn; isAdmin: boolean }) {
  const [section, setSection] = useState<SettingsSection>("activity");
  const [settingsForm, setSettingsForm] = useState({ businessName: data.settings.businessName, openingCashBalance: String(data.settings.openingCashBalance), openingPetrolLiters: String(data.settings.openingPetrolLiters), openingDieselLiters: String(data.settings.openingDieselLiters), petrolReorderLevel: String(data.settings.petrolReorderLevel), dieselReorderLevel: String(data.settings.dieselReorderLevel) });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "staff" as Role, status: "active" as "active" | "inactive" });
  const [roleForm, setRoleForm] = useState({ name: "", permissions: ["dashboard.view", "records.create"] });
  const restoreRef = useRef<HTMLInputElement>(null);
  const tabs: Array<[SettingsSection, string]> = [["activity", "Activity Logs"], ["notifications", "Notifications"], ["backup", "Backup"], ["restore", "Restore"], ["settings", "Settings"], ["users", "Users"], ["roles", "Roles"], ["permissions", "Permissions"]];
  const metrics = calculateMetrics(data);
  const currentMonth = today().slice(0, 7);
  const notifications = [
    ...metrics.lowStockItems.map((item) => ({ id: item.id, category: "Low Stock", title: item.item, detail: `${item.business}: ${item.stock} available; reorder at ${item.reorder}.`, priority: "High" })),
    ...(metrics.outstandingCredit > 0 ? [{ id: "credit", category: "Credit Due", title: "Outstanding customer credit", detail: `${money(metrics.outstandingCredit)} is currently outstanding.`, priority: "High" }] : []),
    ...(data.staff.some((member) => member.status === "active" && !data.salaryPayments.some((payment) => payment.staffId === member.id && payment.month === currentMonth && payment.status === "paid")) ? [{ id: "salary", category: "Salary Due", title: "Monthly salary pending", detail: "At least one active staff member has no paid salary entry for this month.", priority: "Medium" }] : []),
    ...(!data.closings.some((item) => item.period === "monthly" && item.date.startsWith(currentMonth)) ? [{ id: "closing", category: "Closing Reminder", title: "Monthly closing pending", detail: "Save the current month closing from Cash Book or Petrol Pump.", priority: "Medium" }] : []),
    ...(Math.floor((Date.now() - new Date(data.settings.lastBackupAt).getTime()) / 86400000) >= 7 ? [{ id: "backup", category: "Backup Reminder", title: "Create a fresh backup", detail: `Last backup: ${data.settings.lastBackupAt}.`, priority: "Medium" }] : []),
  ];
  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!isAdmin) return;
    commit("Settings", "Update system settings", settingsForm.businessName, (current) => ({ ...current, settings: { ...current.settings, businessName: settingsForm.businessName || "PK Business ERP Suite", openingCashBalance: toNum(settingsForm.openingCashBalance), openingPetrolLiters: toNum(settingsForm.openingPetrolLiters), openingDieselLiters: toNum(settingsForm.openingDieselLiters), petrolReorderLevel: toNum(settingsForm.petrolReorderLevel), dieselReorderLevel: toNum(settingsForm.dieselReorderLevel) } }));
  };
  const addUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!isAdmin) return; if (data.users.some((item) => item.email.toLowerCase() === userForm.email.toLowerCase())) { window.alert("A user with this email already exists."); return; }
    const record: UserAccount = { id: uid(), ...userForm }; commit("Users", "Add user", record.email, (current) => ({ ...current, users: [record, ...current.users] })); setUserForm({ name: "", email: "", password: "", role: "staff", status: "active" });
  };
  const addRole = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!isAdmin) return; const record: RoleDefinition = { id: uid(), name: roleForm.name, permissions: roleForm.permissions }; commit("Roles", "Add role", record.name, (current) => ({ ...current, roles: [record, ...current.roles] })); setRoleForm({ name: "", permissions: ["dashboard.view", "records.create"] }); };
  const backup = () => {
    const backupData = { application: "PK Business ERP Suite", version: data.settings.version, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `pk-business-erp-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
    commit("Backup", "Create backup", today(), (current) => ({ ...current, settings: { ...current.settings, lastBackupAt: today() } }));
  };
  const restore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file || !isAdmin) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)) as { data?: ERPData } | ERPData; const restored = "data" in parsed && parsed.data ? parsed.data : parsed as ERPData; if (!restored.settings || !restored.sales || !restored.cashEntries) throw new Error("Invalid backup"); setData({ ...restored, auditLogs: [{ id: uid(), dateTime: new Date().toLocaleString(), user: "Admin Demo", area: "Restore", action: "Restore backup", detail: file.name }, ...restored.auditLogs] }); window.alert("Backup restored successfully."); } catch { window.alert("The selected file is not a valid PK Business ERP backup."); } }; reader.readAsText(file); event.target.value = "";
  };
  const resetDemo = () => { if (!isAdmin) return; if (window.confirm("Reset all LocalStorage demo data to the original Version 2 sample data?")) { setData({ ...seedData, auditLogs: [{ id: uid(), dateTime: new Date().toLocaleString(), user: "Admin Demo", area: "System", action: "Reset demo data", detail: "Version 2 seed data restored" }] }); } };
  return <div className="screen-stack"><ModuleTabs items={tabs} active={section} onChange={setSection} />
    {section === "activity" ? <Panel title="Activity Logs"><DataTable rows={data.auditLogs} columns={[{ key: "dateTime", label: "Date & Time" }, { key: "user", label: "User" }, { key: "area", label: "Area" }, { key: "action", label: "Action" }, { key: "detail", label: "Detail" }]} /></Panel> : null}
    {section === "notifications" ? <Panel title="Notifications"><DataTable rows={notifications} columns={[{ key: "category", label: "Category" }, { key: "title", label: "Notification" }, { key: "detail", label: "Detail" }, { key: "priority", label: "Priority", render: (row) => <span className={`status-badge ${row.priority === "High" ? "danger" : "warning"}`}>{row.priority}</span> }]} empty="No active notifications." /></Panel> : null}
    {section === "backup" ? <Panel title="Backup"><div className="backup-card"><div><strong>Download complete LocalStorage backup</strong><span>Includes all business records, settings, users, activity logs, reports and inventory data.</span><small>Last backup: {data.settings.lastBackupAt}</small></div><button className="primary-btn" onClick={backup} disabled={!isAdmin}>Download Backup</button></div>{!isAdmin ? <p className="locked">Backup management is available to administrators only.</p> : null}</Panel> : null}
    {section === "restore" ? <Panel title="Restore"><div className="backup-card"><div><strong>Restore a Version 2 JSON backup</strong><span>This replaces the current browser data with the selected backup.</span></div><button className="primary-btn" onClick={() => restoreRef.current?.click()} disabled={!isAdmin}>Select Backup File</button><input ref={restoreRef} className="hidden-input" type="file" accept="application/json,.json" onChange={restore} /></div><InlineNotice tone="warning">Restore affects this browser only because this project is a LocalStorage demo.</InlineNotice></Panel> : null}
    {section === "settings" ? <Panel title="Business & Opening Settings"><form className="form-grid wide" onSubmit={saveSettings}><input placeholder="Business name" value={settingsForm.businessName} onChange={(event) => setSettingsForm({ ...settingsForm, businessName: event.target.value })} /><input type="number" min="0" placeholder="Opening cash" value={settingsForm.openingCashBalance} onChange={(event) => setSettingsForm({ ...settingsForm, openingCashBalance: event.target.value })} /><input type="number" min="0" placeholder="Opening petrol L" value={settingsForm.openingPetrolLiters} onChange={(event) => setSettingsForm({ ...settingsForm, openingPetrolLiters: event.target.value })} /><input type="number" min="0" placeholder="Opening diesel L" value={settingsForm.openingDieselLiters} onChange={(event) => setSettingsForm({ ...settingsForm, openingDieselLiters: event.target.value })} /><input type="number" min="0" placeholder="Petrol reorder L" value={settingsForm.petrolReorderLevel} onChange={(event) => setSettingsForm({ ...settingsForm, petrolReorderLevel: event.target.value })} /><input type="number" min="0" placeholder="Diesel reorder L" value={settingsForm.dieselReorderLevel} onChange={(event) => setSettingsForm({ ...settingsForm, dieselReorderLevel: event.target.value })} /><button disabled={!isAdmin}>Save Settings</button></form>{!isAdmin ? <p className="locked">System settings are locked for staff users.</p> : null}<button className="danger-btn" onClick={resetDemo} disabled={!isAdmin}>Reset Demo Data</button></Panel> : null}
    {section === "users" ? <Panel title="Users"><form className="form-grid wide" onSubmit={addUser}><input placeholder="Full name" value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} required /><input type="email" placeholder="Email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} required /><input type="text" placeholder="Password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} required /><select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value as Role })}><option value="admin">Admin</option><option value="staff">Staff</option></select><select value={userForm.status} onChange={(event) => setUserForm({ ...userForm, status: event.target.value as "active" | "inactive" })}><option value="active">Active</option><option value="inactive">Inactive</option></select><button disabled={!isAdmin}>Add User</button></form><DataTable rows={data.users} columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role", render: (row) => titleCase(row.role) }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }, { key: "actions", label: "Actions", render: (row) => isAdmin && !["admin@demo.com", "staff@demo.com"].includes(row.email) ? <button className="text-danger" onClick={() => deleteRecord("users", row.id, "Users", "user")}>Delete</button> : <span className="muted-text">Protected</span> }]} /></Panel> : null}
    {section === "roles" ? <Panel title="Roles"><form className="form-grid wide" onSubmit={addRole}><input placeholder="Role name" value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} required /><label className="checkbox-field"><input type="checkbox" checked={roleForm.permissions.includes("dashboard.view")} onChange={(event) => setRoleForm({ ...roleForm, permissions: event.target.checked ? [...roleForm.permissions, "dashboard.view"] : roleForm.permissions.filter((item) => item !== "dashboard.view") })} /> Dashboard</label><label className="checkbox-field"><input type="checkbox" checked={roleForm.permissions.includes("records.create")} onChange={(event) => setRoleForm({ ...roleForm, permissions: event.target.checked ? [...roleForm.permissions, "records.create"] : roleForm.permissions.filter((item) => item !== "records.create") })} /> Create Records</label><label className="checkbox-field"><input type="checkbox" checked={roleForm.permissions.includes("reports.print")} onChange={(event) => setRoleForm({ ...roleForm, permissions: event.target.checked ? [...roleForm.permissions, "reports.print"] : roleForm.permissions.filter((item) => item !== "reports.print") })} /> Print Reports</label><button disabled={!isAdmin}>Add Role</button></form><DataTable rows={data.roles} columns={[{ key: "name", label: "Role" }, { key: "permissions", label: "Permissions", value: (row) => row.permissions.join(" "), render: (row) => row.permissions.join(", ") }, { key: "actions", label: "Actions", render: (row) => isAdmin && !["Administrator", "Staff"].includes(row.name) ? <button className="text-danger" onClick={() => deleteRecord("roles", row.id, "Roles", "role")}>Delete</button> : <span className="muted-text">Protected</span> }]} /></Panel> : null}
    {section === "permissions" ? <Panel title="Permissions"><div className="permission-grid">{data.roles.map((role) => <div key={role.id}><strong>{role.name}</strong>{["dashboard.view", "records.create", "records.edit", "records.delete", "reports.view", "reports.print", "settings.manage", "users.manage", "backup.manage"].map((permission) => <span key={permission} className={role.permissions.includes(permission) ? "allowed" : "denied"}>{role.permissions.includes(permission) ? "✓" : "—"} {permission}</span>)}</div>)}</div></Panel> : null}
  </div>;
}

function PrintPreview({ document, onClose }: { document: PrintDocument; onClose: () => void }) {
  return <div className="print-overlay"><div className="print-modal"><div className="print-actions no-print"><button className="secondary-btn" onClick={onClose}>Close</button><button className="primary-btn" onClick={() => window.print()}>Print</button></div><article className="print-preview"><header><div className="brand-mark small">PK</div><div><h1>{document.title}</h1><p>{document.subtitle}</p></div></header>{document.fields ? <div className="print-fields">{document.fields.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> : null}{document.columns && document.rows ? <div className="table-wrap"><table><thead><tr>{document.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{document.rows.length ? document.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={document.columns.length} className="empty-row">No records for this report.</td></tr>}</tbody></table></div> : null}<footer>{document.footer || "Generated by PK Business ERP Suite Version 2.0"}</footer></article></div></div>;
}


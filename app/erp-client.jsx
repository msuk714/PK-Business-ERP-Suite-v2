"use client";
import { useEffect, useMemo, useRef, useState } from "react";
const today = () => new Date().toISOString().slice(0, 10);
const dateOffset = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
};
const monthOffset = (months, day = 10) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    date.setDate(day);
    return date.toISOString().slice(0, 10);
};
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const toNum = (value) => Number(value) || 0;
const fmt = (value) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(value || 0);
const money = (value) => `Rs ${fmt(value)}`;
const titleCase = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ") : "—";
const soldLiters = (item) => {
    if (item.rollover) {
        const maximum = item.meterMaximum || 999999;
        return Math.max((maximum - item.openingReading) + item.closingReading, 0);
    }
    return Math.max(item.closingReading - item.openingReading, 0);
};
const readingAmount = (item) => soldLiters(item) * item.saleRate;
const monthKey = (date) => date.slice(0, 7);
const businessLabel = (value) => ({ feed: "Feed Unit", chakki: "Chakki", petrol: "Petrol Pump", store: "Super Store", gas: "Gas Management", common: "Common", all: "All Businesses" }[value]);
const rolePermissions = {
    admin: ["dashboard.view", "records.create", "records.edit", "records.delete", "reports.view", "reports.print", "closings.manage", "locked.edit", "settings.manage", "users.manage", "backup.manage"],
    manager: ["dashboard.view", "records.create", "records.edit", "reports.view", "reports.print", "closings.manage"],
    operator: ["dashboard.view", "records.create", "records.edit", "reports.view", "reports.print"],
    staff: ["dashboard.view", "records.create", "records.edit", "reports.print"],
    viewer: ["dashboard.view", "reports.view", "reports.print"],
};
const hasPermission = (role, permission) => Boolean(role && rolePermissions[role].includes(permission));
const canAccessBusiness = (session, business) => Boolean(session && (session.role === "admin" || session.businessAccess.includes(business) || business === "common"));
const isTransactionLocked = (data, date, business) => data.closings.some((item) => item.status !== "reopened" &&
    (item.business === "all" || item.business === business) &&
    ((item.period === "daily" && item.date === date) || (item.period === "monthly" && item.date.slice(0, 7) === date.slice(0, 7))));
const isFutureDate = (date) => Boolean(date && date > today());
const amountPaidForSale = (sale) => Math.min(sale.paidAmount, sale.total);
const purchaseAmountByBusiness = (data, business) => {
    if (business === "feed")
        return data.rawMaterialPurchases.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    if (business === "petrol")
        return data.fuelPurchases.reduce((sum, item) => sum + item.liters * item.rate, 0);
    if (business === "store")
        return data.storePurchases.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    if (business === "gas")
        return data.gasPurchases.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    return 0;
};
const supplierOutstanding = (data, supplierId) => {
    const supplier = data.suppliers.find((item) => item.id === supplierId);
    if (!supplier)
        return 0;
    const feed = data.rawMaterialPurchases.filter((item) => item.supplierId === supplierId).reduce((sum, item) => sum + Math.max(item.quantity * item.rate - item.paidAmount, 0), 0);
    const petrol = data.fuelPurchases.filter((item) => item.supplierId === supplierId).reduce((sum, item) => sum + Math.max(item.liters * item.rate - item.paidAmount, 0), 0);
    const store = data.storePurchases.filter((item) => item.supplierId === supplierId).reduce((sum, item) => sum + Math.max(item.quantity * item.rate - item.paidAmount, 0), 0);
    const gas = data.gasPurchases.filter((item) => item.supplierId === supplierId).reduce((sum, item) => sum + Math.max(item.quantity * item.rate - item.paidAmount, 0), 0);
    const returns = data.purchaseReturns.filter((item) => item.supplierId === supplierId).reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const payments = data.supplierPayments.filter((item) => item.supplierId === supplierId).reduce((sum, item) => sum + item.amount, 0);
    return Math.max(supplier.openingBalance + feed + petrol + store + gas - returns - payments, 0);
};
const customerOutstanding = (data, customerId) => {
    const customer = data.customers.find((item) => item.id === customerId);
    if (!customer)
        return 0;
    const standardSales = data.sales.filter((item) => item.customerId === customerId).reduce((sum, item) => sum + Math.max(item.total - amountPaidForSale(item), 0), 0);
    const fuelSales = data.machineReadings.filter((item) => item.customerId === customerId).reduce((sum, item) => sum + Math.max(readingAmount(item) - item.paidAmount, 0), 0);
    const grinding = data.grindingJobs.filter((item) => (customer.phone && item.phone === customer.phone) || item.customerName.toLowerCase() === customer.name.toLowerCase()).reduce((sum, item) => sum + Math.max(item.charges - item.paidAmount, 0), 0);
    const recoveries = data.creditPayments.filter((item) => item.customerId === customerId).reduce((sum, item) => sum + item.amount, 0);
    return Math.max(customer.openingBalance + standardSales + fuelSales + grinding - recoveries, 0);
};
const saleCost = (data, item) => {
    if (item.costRate !== undefined)
        return item.costRate * item.quantity;
    if (item.business === "feed")
        return (data.bagInventory.find((product) => product.id === item.productId)?.costRate || 0) * item.quantity;
    if (item.business === "chakki")
        return (data.flourProducts.find((product) => product.id === item.productId)?.costRate || 0) * item.quantity;
    if (item.business === "store")
        return (data.storeProducts.find((product) => product.id === item.productId)?.costRate || 0) * item.quantity;
    if (item.business === "gas")
        return (data.gasProducts.find((product) => product.id === item.productId)?.costRate || 0) * item.quantity;
    return 0;
};
const latestFuelCost = (data, fuelType) => {
    const purchases = data.fuelPurchases.filter((item) => item.fuelType === fuelType);
    const liters = purchases.reduce((sum, item) => sum + item.liters, 0);
    return liters ? purchases.reduce((sum, item) => sum + item.liters * item.rate, 0) / liters : 0;
};
const inventoryValueForBusiness = (data, business, petrolStock = 0, dieselStock = 0) => {
    if (business === "feed")
        return data.rawMaterials.reduce((sum, item) => sum + item.stock * item.averageRate, 0) + data.bagInventory.reduce((sum, item) => sum + item.quantity * item.costRate, 0);
    if (business === "chakki")
        return data.flourProducts.reduce((sum, item) => sum + item.stock * item.costRate, 0);
    if (business === "petrol")
        return petrolStock * latestFuelCost(data, "petrol") + dieselStock * latestFuelCost(data, "diesel");
    if (business === "store")
        return data.storeProducts.reduce((sum, item) => sum + item.stock * item.costRate, 0);
    if (business === "gas")
        return data.gasProducts.reduce((sum, item) => sum + item.stock * item.costRate, 0);
    return 0;
};
const transactionDateIsAllowed = (date) => {
    if (!date) {
        window.alert("Date is required.");
        return false;
    }
    if (isFutureDate(date)) {
        window.alert("Future transaction dates are not allowed.");
        return false;
    }
    return true;
};
const positiveAmount = (value, label) => {
    if (!(value > 0)) {
        window.alert(`${label} must be greater than zero.`);
        return false;
    }
    return true;
};
const downloadTextFile = (filename, content, mime = "text/plain;charset=utf-8") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
};
const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const downloadCsv = (filename, columns, rows) => downloadTextFile(filename, [columns, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n"), "text/csv;charset=utf-8");
const seedData = {
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
    supplierPayments: [
        { id: "supplier-pay-1", date: dateOffset(-1), supplierId: "sup-store-1", business: "store", amount: 15000, paymentMethod: "cash", reference: "SPAY-1001", notes: "Part payment" },
    ],
    creditPayments: [
        { id: "credit-pay-1", date: today(), customerId: "cust-feed-1", business: "feed", amount: 10000, paymentMethod: "cash", reference: "CR-1001", notes: "Old balance recovery" },
    ],
    profitDistributions: [],
    fuelRates: [
        { id: "rate-1", date: dateOffset(-30), fuelType: "petrol", rate: 281.5, notes: "Previous rate" },
        { id: "rate-2", date: today(), fuelType: "petrol", rate: 284.5, notes: "Current rate" },
        { id: "rate-3", date: today(), fuelType: "diesel", rate: 291.8, notes: "Current rate" },
    ],
    activityLogs: [
        { id: "activity-1", dateTime: new Date().toLocaleString(), user: "System", area: "Dashboard", action: "Demo loaded", detail: "BRD-aligned realistic data initialized" },
    ],
    auditLogs: [
        { id: "log-1", dateTime: new Date().toLocaleString(), user: "System", area: "Dashboard", action: "Version 2.0 demo loaded", detail: "Realistic demo data initialized", sensitive: true },
    ],
    users: [
        { id: "user-1", name: "Admin Demo", email: "admin@demo.com", password: "admin123", role: "admin", status: "active", businessAccess: ["feed", "chakki", "petrol", "store", "gas", "common"] },
        { id: "user-2", name: "Manager Demo", email: "manager@demo.com", password: "manager123", role: "manager", status: "active", businessAccess: ["feed", "chakki", "petrol"] },
        { id: "user-3", name: "Operator Demo", email: "operator@demo.com", password: "operator123", role: "operator", status: "active", businessAccess: ["petrol", "store"] },
        { id: "user-4", name: "Staff Demo", email: "staff@demo.com", password: "staff123", role: "staff", status: "active", businessAccess: ["chakki", "store"] },
        { id: "user-5", name: "Viewer Demo", email: "viewer@demo.com", password: "viewer123", role: "viewer", status: "active", businessAccess: ["feed", "chakki", "petrol", "store", "gas", "common"] },
    ],
    roles: [
        { id: "role-1", name: "Administrator", roleKey: "admin", permissions: rolePermissions.admin },
        { id: "role-2", name: "Manager", roleKey: "manager", permissions: rolePermissions.manager },
        { id: "role-3", name: "Operator", roleKey: "operator", permissions: rolePermissions.operator },
        { id: "role-4", name: "Staff", roleKey: "staff", permissions: rolePermissions.staff },
        { id: "role-5", name: "Viewer", roleKey: "viewer", permissions: rolePermissions.viewer },
    ],
    settings: {
        businessName: "PK Business ERP Suite",
        version: "2.0 BRD Demo",
        openingCashBalance: 500000,
        openingPetrolLiters: 3000,
        openingDieselLiters: 2500,
        petrolReorderLevel: 1800,
        dieselReorderLevel: 1500,
        lastBackupAt: dateOffset(-9),
        darkMode: false,
        sessionTimeoutMinutes: 30,
        meterMaximum: 999999,
    },
};
function normalizeData(raw) {
    const source = raw || {};
    const legacyUsers = (source.users || seedData.users).map((user) => ({
        ...user,
        role: (["admin", "manager", "operator", "staff", "viewer"].includes(String(user.role)) ? user.role : "staff"),
        businessAccess: (user.businessAccess?.length ? user.businessAccess : user.role === "admin"
            ? ["feed", "chakki", "petrol", "store", "gas", "common"]
            : ["feed", "chakki", "petrol", "store", "gas"]),
    }));
    return {
        ...seedData,
        ...source,
        partners: source.partners || seedData.partners,
        investments: source.investments || seedData.investments,
        suppliers: source.suppliers || seedData.suppliers,
        customers: source.customers || seedData.customers,
        rawMaterials: source.rawMaterials || seedData.rawMaterials,
        rawMaterialPurchases: source.rawMaterialPurchases || seedData.rawMaterialPurchases,
        feedFormulas: source.feedFormulas || seedData.feedFormulas,
        productionBatches: (source.productionBatches || seedData.productionBatches).map((batch) => ({
            ...batch,
            manufacturingDate: batch.manufacturingDate || batch.date,
            status: batch.status || "completed",
            consumption: batch.consumption || [],
        })),
        finishedGoods: source.finishedGoods || seedData.finishedGoods,
        bagInventory: source.bagInventory || seedData.bagInventory,
        sales: source.sales || seedData.sales,
        expenses: source.expenses || seedData.expenses,
        staff: source.staff || seedData.staff,
        salaryPayments: source.salaryPayments || seedData.salaryPayments,
        grindingJobs: source.grindingJobs || seedData.grindingJobs,
        flourProducts: source.flourProducts || seedData.flourProducts,
        flourProduction: source.flourProduction || seedData.flourProduction,
        fuelPurchases: source.fuelPurchases || seedData.fuelPurchases,
        machineReadings: source.machineReadings || seedData.machineReadings,
        storeProducts: source.storeProducts || seedData.storeProducts,
        storePurchases: source.storePurchases || seedData.storePurchases,
        purchaseReturns: source.purchaseReturns || seedData.purchaseReturns,
        gasProducts: source.gasProducts || seedData.gasProducts,
        gasPurchases: source.gasPurchases || seedData.gasPurchases,
        cashEntries: source.cashEntries || seedData.cashEntries,
        closings: source.closings || [],
        supplierPayments: source.supplierPayments || [],
        creditPayments: source.creditPayments || [],
        profitDistributions: source.profitDistributions || [],
        fuelRates: source.fuelRates || seedData.fuelRates,
        activityLogs: source.activityLogs || source.auditLogs || seedData.activityLogs,
        auditLogs: source.auditLogs || seedData.auditLogs,
        users: legacyUsers,
        roles: source.roles?.length ? source.roles.map((role) => ({
            ...role,
            permissions: role.permissions.filter((permission) => ["dashboard.view", "records.create", "records.edit", "records.delete", "reports.view", "reports.print", "closings.manage", "locked.edit", "settings.manage", "users.manage", "backup.manage"].includes(permission)),
        })) : seedData.roles,
        settings: {
            ...seedData.settings,
            ...(source.settings || {}),
            darkMode: source.settings?.darkMode ?? false,
            sessionTimeoutMinutes: source.settings?.sessionTimeoutMinutes || 30,
            meterMaximum: source.settings?.meterMaximum || 999999,
        },
    };
}
function useLocalStore(key, initialValue) {
    const [mounted, setMounted] = useState(false);
    const [value, setValue] = useState(initialValue);
    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(key);
            if (stored)
                setValue(JSON.parse(stored));
        }
        catch {
            setValue(initialValue);
        }
        finally {
            setMounted(true);
        }
    }, [key]);
    useEffect(() => {
        if (mounted)
            window.localStorage.setItem(key, JSON.stringify(value));
    }, [key, value, mounted]);
    return [value, setValue];
}
function migrateLegacyData() {
    if (typeof window === "undefined")
        return seedData;
    try {
        const current = window.localStorage.getItem("pk-erp-v2-data");
        if (current)
            return normalizeData(JSON.parse(current));
        const legacyPartners = JSON.parse(window.localStorage.getItem("fp-partners") || "[]");
        const legacyIngredients = JSON.parse(window.localStorage.getItem("fp-ingredients") || "[]");
        const legacyProduction = JSON.parse(window.localStorage.getItem("fp-feed-production") || "[]");
        const legacyFeedSales = JSON.parse(window.localStorage.getItem("fp-feed-sales") || "[]");
        const legacyFeedExpenses = JSON.parse(window.localStorage.getItem("fp-feed-expenses") || "[]");
        const legacyFuelPurchases = JSON.parse(window.localStorage.getItem("fp-fuel-purchases") || "[]");
        const legacyMachineReadings = JSON.parse(window.localStorage.getItem("fp-machine-readings") || "[]");
        const legacyFuelExpenses = JSON.parse(window.localStorage.getItem("fp-fuel-expenses") || "[]");
        const legacyStaff = JSON.parse(window.localStorage.getItem("fp-staff") || "[]");
        const legacyAudit = JSON.parse(window.localStorage.getItem("fp-audit") || "[]");
        const legacySettings = JSON.parse(window.localStorage.getItem("fp-settings") || "null");
        const hasLegacyData = [legacyPartners, legacyIngredients, legacyProduction, legacyFeedSales, legacyFeedExpenses, legacyFuelPurchases, legacyMachineReadings, legacyFuelExpenses, legacyStaff, legacyAudit].some((items) => items.length > 0) || Boolean(legacySettings);
        if (!hasLegacyData)
            return seedData;
        const migratedPartners = legacyPartners.length
            ? legacyPartners.map((item, index) => ({ id: item.id, name: item.name, phone: "", sharePercent: legacyPartners.length === 1 ? 100 : index === 0 ? 60 : Math.max(40 / (legacyPartners.length - 1), 1), status: "active" }))
            : seedData.partners;
        const migratedInvestments = legacyPartners.length
            ? legacyPartners.map((item) => ({ id: `legacy-${item.id}`, date: item.date, partnerId: item.id, type: "investment", amount: item.amount, notes: item.notes || "Imported from Version 1" }))
            : seedData.investments;
        const materialNames = Array.from(new Set(legacyIngredients.map((item) => item.ingredient.trim()).filter(Boolean)));
        const migratedMaterials = materialNames.map((name, index) => {
            const purchases = legacyIngredients.filter((item) => item.ingredient.trim() === name);
            const stock = purchases.reduce((sum, item) => sum + item.quantity, 0);
            const totalValue = purchases.reduce((sum, item) => sum + item.quantity * item.rate, 0);
            return { id: `legacy-rm-${index + 1}`, name, unit: purchases[0]?.unit || "kg", stock, reorderLevel: Math.max(stock * 0.2, 1), averageRate: stock ? totalValue / stock : 0 };
        });
        const materialIdByName = new Map(migratedMaterials.map((item) => [item.name, item.id]));
        const migratedPurchases = legacyIngredients.map((item, index) => ({ id: item.id, date: item.date, supplierId: "sup-feed-1", materialId: materialIdByName.get(item.ingredient.trim()) || `legacy-rm-${index + 1}`, quantity: item.quantity, rate: item.rate, paymentType: item.paymentType, paidAmount: item.paymentType === "cash" ? item.quantity * item.rate : 0, invoiceNo: `V1-PUR-${String(index + 1).padStart(4, "0")}` }));
        const migratedProduction = legacyProduction.map((item, index) => ({ id: item.id, date: item.date, batchNo: item.batchName || `V1-BATCH-${index + 1}`, formulaId: "formula-1", outputKg: item.producedKg, bagSize: 40, bagsProduced: Math.floor(item.producedKg / 40), productionCost: 0, notes: item.notes || "Imported from Version 1" }));
        const migratedFeedSales = legacyFeedSales.map((item, index) => ({ id: item.id, date: item.date, business: "feed", invoiceNo: `V1-INV-F-${String(index + 1).padStart(4, "0")}`, customerId: "", customerName: item.customerName, productId: "", productName: "Feed Sale (Version 1)", quantity: item.quantityKg, unit: "kg", rate: item.rate, total: item.quantityKg * item.rate, paidAmount: item.paidAmount, paymentType: item.paymentType, dueDate: item.dueDate || "", remarks: [item.phone, item.address].filter(Boolean).join(" · ") }));
        const migratedFuelPurchases = legacyFuelPurchases.map((item, index) => ({ id: item.id, date: item.date, invoiceNo: `V1-FP-${String(index + 1).padStart(4, "0")}`, fuelType: item.fuelType, liters: item.liters, rate: item.rate, supplierId: "sup-petrol-1", paymentType: item.paymentType, paidAmount: item.paymentType === "cash" ? item.liters * item.rate : 0 }));
        const migratedMachineReadings = legacyMachineReadings.map((item) => ({ id: item.id, date: item.date, machine: item.machine.toLowerCase().includes("2") || item.side === "right" ? "Machine 2" : "Machine 1", fuelType: item.fuelType, openingReading: item.firstReading, closingReading: item.secondReading, saleRate: item.saleRate, paymentType: item.paymentType, customerId: "", customerName: item.customerName || (item.paymentType === "cash" ? "Walk-in Customers" : "Version 1 Customer"), paidAmount: item.paymentType === "cash" ? Math.max(item.secondReading - item.firstReading, 0) * item.saleRate : 0, dueDate: item.dueDate || "", remarks: `Imported ${item.side} side reading from Version 1` }));
        const migratedExpenses = [
            ...legacyFeedExpenses.map((item) => ({ id: item.id, date: item.date, business: "feed", title: item.title, category: item.category, amount: item.amount, paymentType: "cash", notes: item.notes || "Imported from Version 1" })),
            ...legacyFuelExpenses.map((item) => ({ id: item.id, date: item.date, business: "petrol", title: item.title, category: item.category, amount: item.amount, paymentType: "cash", notes: item.notes || "Imported from Version 1" })),
        ];
        const migratedStaff = legacyStaff.length
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
    }
    catch {
        return seedData;
    }
}
function useERPStore() {
    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState(seedData);
    useEffect(() => {
        setData(migrateLegacyData());
        setMounted(true);
    }, []);
    useEffect(() => {
        if (mounted)
            window.localStorage.setItem("pk-erp-v2-data", JSON.stringify(data));
    }, [data, mounted]);
    return [data, setData, mounted];
}
function StatCard({ label, value, hint, tone }) {
    return <div className={`stat-card ${tone ? `tone-${tone}` : ""}`}><p>{label}</p><strong>{value}</strong>{hint ? <span>{hint}</span> : null}</div>;
}
function Panel({ title, children, actions, className = "" }) {
    return <section className={`panel ${className}`}><div className="panel-head"><h2>{title}</h2>{actions ? <div className="panel-actions">{actions}</div> : null}</div>{children}</section>;
}
function ModuleTabs({ items, active, onChange }) {
    return <div className="module-tabs no-print">{items.map(([key, label]) => <button key={key} className={active === key ? "active" : ""} onClick={() => onChange(key)}>{label}</button>)}</div>;
}
function DataTable({ rows, columns, empty = "No record added yet.", filterLabel, filterValue, filterOptions, onFilterChange }) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState(columns[0]?.key || "");
    const [sortDirection, setSortDirection] = useState("desc");
    const visibleRows = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = !query ? rows : rows.filter((row) => columns.some((column) => String(column.value ? column.value(row) : row[column.key] ?? "").toLowerCase().includes(query)));
        return [...filtered].sort((a, b) => {
            const column = columns.find((item) => item.key === sortKey);
            const av = column?.value ? column.value(a) : a[sortKey];
            const bv = column?.value ? column.value(b) : b[sortKey];
            const result = typeof av === "number" && typeof bv === "number" ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
            return sortDirection === "asc" ? result : -result;
        });
    }, [rows, columns, search, sortKey, sortDirection]);
    const changeSort = (key) => {
        if (sortKey === key)
            setSortDirection((prev) => prev === "asc" ? "desc" : "asc");
        else {
            setSortKey(key);
            setSortDirection("asc");
        }
    };
    return <>
    <div className="table-tools no-print">
      <input className="table-search" placeholder="Search records..." value={search} onChange={(event) => setSearch(event.target.value)}/>
      {filterOptions && onFilterChange ? <label className="filter-control"><span>{filterLabel || "Filter"}</span><select value={filterValue} onChange={(event) => onFilterChange(event.target.value)}>{filterOptions.map((item) => <option key={item} value={item}>{item === "all" ? "All" : titleCase(item)}</option>)}</select></label> : null}
    </div>
    <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key} className={column.className}><button className="sort-button" onClick={() => changeSort(column.key)}>{column.label}{sortKey === column.key ? <span>{sortDirection === "asc" ? " ↑" : " ↓"}</span> : null}</button></th>)}</tr></thead><tbody>{visibleRows.length ? visibleRows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key} className={column.className}>{column.render ? column.render(row) : String(column.value ? column.value(row) : row[column.key] ?? "—")}</td>)}</tr>) : <tr><td colSpan={columns.length} className="empty-row">{empty}</td></tr>}</tbody></table></div>
  </>;
}
function Workflow({ steps }) {
    return <div className="workflow">{steps.map((step, index) => <div key={step} className="workflow-step"><span>{index + 1}</span><strong>{step}</strong>{index < steps.length - 1 ? <b>↓</b> : null}</div>)}</div>;
}
function InlineNotice({ children, tone = "info" }) {
    return <div className={`note-box note-${tone}`}>{children}</div>;
}
function calculateMetrics(data) {
    const saleTotal = data.sales.reduce((sum, item) => sum + item.total, 0);
    const grindingTotal = data.grindingJobs.reduce((sum, item) => sum + item.charges, 0);
    const fuelTotal = data.machineReadings.reduce((sum, item) => sum + readingAmount(item), 0);
    const totalSales = saleTotal + grindingTotal + fuelTotal;
    const directCollections = data.sales.reduce((sum, item) => sum + amountPaidForSale(item), 0) + data.grindingJobs.reduce((sum, item) => sum + item.paidAmount, 0) + data.machineReadings.reduce((sum, item) => sum + item.paidAmount, 0);
    const creditRecovery = data.creditPayments.reduce((sum, item) => sum + item.amount, 0);
    const totalCollection = directCollections + creditRecovery;
    const salaryExpense = data.salaryPayments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0) + salaryExpense;
    const purchaseCost = ["feed", "petrol", "store", "gas"].reduce((sum, business) => sum + purchaseAmountByBusiness(data, business), 0);
    const petrolPurchased = data.fuelPurchases.filter((item) => item.fuelType === "petrol").reduce((sum, item) => sum + item.liters, 0);
    const dieselPurchased = data.fuelPurchases.filter((item) => item.fuelType === "diesel").reduce((sum, item) => sum + item.liters, 0);
    const petrolSold = data.machineReadings.filter((item) => item.fuelType === "petrol").reduce((sum, item) => sum + soldLiters(item), 0);
    const dieselSold = data.machineReadings.filter((item) => item.fuelType === "diesel").reduce((sum, item) => sum + soldLiters(item), 0);
    const petrolReturned = data.purchaseReturns.filter((item) => item.business === "petrol" && item.productId === "petrol").reduce((sum, item) => sum + item.quantity, 0);
    const dieselReturned = data.purchaseReturns.filter((item) => item.business === "petrol" && item.productId === "diesel").reduce((sum, item) => sum + item.quantity, 0);
    const petrolStock = Math.max(data.settings.openingPetrolLiters + petrolPurchased - petrolReturned - petrolSold, 0);
    const dieselStock = Math.max(data.settings.openingDieselLiters + dieselPurchased - dieselReturned - dieselSold, 0);
    const cashReceived = data.cashEntries.filter((item) => item.type === "received").reduce((sum, item) => sum + item.amount, 0);
    const cashPaid = data.cashEntries.filter((item) => item.type === "paid" || item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    const cashBalance = data.settings.openingCashBalance + cashReceived - cashPaid;
    const dues = Object.fromEntries(["feed", "chakki", "petrol", "store", "gas"].map((business) => [business, data.customers.filter((item) => item.business === business).reduce((sum, item) => sum + customerOutstanding(data, item.id), 0)]));
    const outstandingCredit = dues.feed + dues.chakki + dues.petrol + dues.store + dues.gas;
    const outstandingPayables = data.suppliers.reduce((sum, item) => sum + supplierOutstanding(data, item.id), 0);
    const inventoryValue = ["feed", "chakki", "petrol", "store", "gas"].reduce((sum, business) => sum + inventoryValueForBusiness(data, business, petrolStock, dieselStock), 0);
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
    const todayCreditRecovery = data.creditPayments.filter((item) => item.date === today()).reduce((sum, item) => sum + item.amount, 0);
    const todayCollection = data.cashEntries.filter((item) => item.date === today() && item.type === "received").reduce((sum, item) => sum + item.amount, 0);
    const cashSales = data.sales.filter((item) => item.paymentType === "cash").reduce((sum, item) => sum + item.total, 0) + data.grindingJobs.filter((item) => item.paymentType === "cash").reduce((sum, item) => sum + item.charges, 0) + data.machineReadings.filter((item) => item.paymentType === "cash").reduce((sum, item) => sum + readingAmount(item), 0);
    const creditSales = Math.max(totalSales - cashSales, 0);
    const cogs = data.sales.reduce((sum, item) => sum + saleCost(data, item), 0) + data.machineReadings.reduce((sum, item) => sum + soldLiters(item) * latestFuelCost(data, item.fuelType), 0);
    const estimatedProfit = totalSales - cogs - totalExpenses;
    const todayCogs = data.sales.filter((item) => item.date === today()).reduce((sum, item) => sum + saleCost(data, item), 0) + data.machineReadings.filter((item) => item.date === today()).reduce((sum, item) => sum + soldLiters(item) * latestFuelCost(data, item.fuelType), 0);
    const todayProfit = todaySales - todayCogs - todayExpenses;
    const totalInvestment = data.investments.reduce((sum, item) => sum + (item.type === "investment" ? item.amount : -item.amount), 0);
    return { saleTotal, grindingTotal, fuelTotal, totalSales, totalCollection, totalExpenses, purchaseCost, cashBalance, outstandingCredit, outstandingPayables, feedDue: dues.feed, flourDue: dues.chakki, petrolDue: dues.petrol, storeDue: dues.store, gasDue: dues.gas, petrolStock, dieselStock, inventoryValue, lowStockItems, todaySales, todayExpenses, todayCollection, todayCreditRecovery, cashSales, creditSales, estimatedProfit, todayProfit, totalInvestment, cogs };
}
const inRange = (date, from, to) => (!from || date >= from) && (!to || date <= to);
const getBusinessTotals = (data, business, from, to) => {
    const sales = data.sales.filter((item) => item.business === business && inRange(item.date, from, to));
    const grinding = business === "chakki" ? data.grindingJobs.filter((item) => inRange(item.date, from, to)) : [];
    const readings = business === "petrol" ? data.machineReadings.filter((item) => inRange(item.date, from, to)) : [];
    const saleValue = sales.reduce((sum, item) => sum + item.total, 0);
    const grindingValue = grinding.reduce((sum, item) => sum + item.charges, 0);
    const fuelValue = readings.reduce((sum, item) => sum + readingAmount(item), 0);
    const totalSales = saleValue + grindingValue + fuelValue;
    const cashSales = sales.filter((item) => item.paymentType === "cash").reduce((sum, item) => sum + item.total, 0) + grinding.filter((item) => item.paymentType === "cash").reduce((sum, item) => sum + item.charges, 0) + readings.filter((item) => item.paymentType === "cash").reduce((sum, item) => sum + readingAmount(item), 0);
    const directCollection = sales.reduce((sum, item) => sum + amountPaidForSale(item), 0) + grinding.reduce((sum, item) => sum + item.paidAmount, 0) + readings.reduce((sum, item) => sum + item.paidAmount, 0);
    const creditRecovery = data.creditPayments.filter((item) => item.business === business && inRange(item.date, from, to)).reduce((sum, item) => sum + item.amount, 0);
    const businessStaffIds = new Set(data.staff.filter((item) => item.business === business).map((item) => item.id));
    const expenseTotal = data.expenses.filter((item) => item.business === business && inRange(item.date, from, to)).reduce((sum, item) => sum + item.amount, 0) + data.salaryPayments.filter((item) => businessStaffIds.has(item.staffId) && item.status === "paid" && inRange(item.date, from, to)).reduce((sum, item) => sum + item.amount, 0);
    const cogs = sales.reduce((sum, item) => sum + saleCost(data, item), 0) + readings.reduce((sum, item) => sum + soldLiters(item) * latestFuelCost(data, item.fuelType), 0);
    let purchases = 0;
    if (business === "feed")
        purchases = data.rawMaterialPurchases.filter((item) => inRange(item.date, from, to)).reduce((sum, item) => sum + item.quantity * item.rate, 0);
    if (business === "petrol")
        purchases = data.fuelPurchases.filter((item) => inRange(item.date, from, to)).reduce((sum, item) => sum + item.liters * item.rate, 0);
    if (business === "store")
        purchases = data.storePurchases.filter((item) => inRange(item.date, from, to)).reduce((sum, item) => sum + item.quantity * item.rate, 0);
    if (business === "gas")
        purchases = data.gasPurchases.filter((item) => inRange(item.date, from, to)).reduce((sum, item) => sum + item.quantity * item.rate, 0);
    return { sales: totalSales, cashSales, creditSales: Math.max(totalSales - cashSales, 0), collections: directCollection + creditRecovery, creditRecovery, expenses: expenseTotal, cogs, profit: totalSales - cogs - expenseTotal, purchases, transactions: sales.length + grinding.length + readings.length };
};
const inventoryQuantityLabel = (data, business, metrics) => {
    if (business === "feed")
        return `${fmt(data.bagInventory.reduce((sum, item) => sum + item.quantity, 0))} feed bags`;
    if (business === "chakki")
        return `${fmt(data.flourProducts.reduce((sum, item) => sum + item.stock, 0))} flour bags`;
    if (business === "petrol")
        return `${fmt(metrics.petrolStock + metrics.dieselStock)} litres`;
    if (business === "store")
        return `${fmt(data.storeProducts.reduce((sum, item) => sum + item.stock, 0))} store units`;
    if (business === "gas")
        return `${fmt(data.gasProducts.reduce((sum, item) => sum + item.stock, 0))} cylinders`;
    return "—";
};
const businessOutstanding = (metrics, business) => business === "feed" ? metrics.feedDue : business === "chakki" ? metrics.flourDue : business === "petrol" ? metrics.petrolDue : business === "store" ? metrics.storeDue : business === "gas" ? metrics.gasDue : 0;
const transactionRowsForBusiness = (data, business) => {
    const rows = data.sales.filter((item) => item.business === business).map((item) => ({ id: item.id, date: item.date, reference: item.invoiceNo, party: item.customerName, description: item.productName, payment: titleCase(item.paymentType), total: item.total, paid: item.paidAmount, balance: Math.max(item.total - item.paidAmount, 0) }));
    if (business === "chakki")
        rows.push(...data.grindingJobs.map((item) => ({ id: item.id, date: item.date, reference: item.receiptNo, party: item.customerName, description: `Grinding ${fmt(item.weightKg)} KG`, payment: titleCase(item.paymentType), total: item.charges, paid: item.paidAmount, balance: Math.max(item.charges - item.paidAmount, 0) })));
    if (business === "petrol")
        rows.push(...data.machineReadings.map((item) => ({ id: item.id, date: item.date, reference: `${item.machine}-${item.id.slice(-4)}`, party: item.customerName, description: `${titleCase(item.fuelType)} ${fmt(soldLiters(item))} L`, payment: titleCase(item.paymentType), total: readingAmount(item), paid: item.paidAmount, balance: Math.max(readingAmount(item) - item.paidAmount, 0) })));
    return rows.sort((a, b) => b.date.localeCompare(a.date));
};
export default function DashboardApp() {
    const [data, setData, mounted] = useERPStore();
    const [session, setSession] = useLocalStore("fp-session", null);
    const [activeTab, setActiveTab] = useState("overview");
    const [loginEmail, setLoginEmail] = useState("admin@demo.com");
    const [loginPassword, setLoginPassword] = useState("admin123");
    const [loginError, setLoginError] = useState("");
    const [printDocument, setPrintDocument] = useState(null);
    const isAdmin = session?.role === "admin";
    const canCreate = hasPermission(session?.role, "records.create");
    const canDelete = hasPermission(session?.role, "records.delete");
    const metrics = useMemo(() => calculateMetrics(data), [data]);
    useEffect(() => {
        if (!session)
            return;
        let timer;
        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => setSession(null), Math.max(data.settings.sessionTimeoutMinutes, 5) * 60 * 1000);
        };
        const events = ["mousemove", "keydown", "click", "scroll"];
        events.forEach((name) => window.addEventListener(name, resetTimer, { passive: true }));
        resetTimer();
        return () => {
            clearTimeout(timer);
            events.forEach((name) => window.removeEventListener(name, resetTimer));
        };
    }, [session, data.settings.sessionTimeoutMinutes, setSession]);
    const inferRecordBusiness = (key, record, current) => {
        if (typeof record.business === "string")
            return record.business;
        if (["rawMaterialPurchases", "productionBatches"].includes(String(key)))
            return "feed";
        if (["grindingJobs", "flourProduction"].includes(String(key)))
            return "chakki";
        if (["fuelPurchases", "machineReadings"].includes(String(key)))
            return "petrol";
        if (["storePurchases", "purchaseReturns"].includes(String(key)))
            return record.business || "store";
        if (key === "gasPurchases")
            return "gas";
        if (key === "salaryPayments") {
            const member = current.staff.find((item) => item.id === record.staffId);
            return member?.business || "common";
        }
        return "common";
    };
    const commit = (area, action, detail, updater) => {
        if (!canCreate && !isAdmin) {
            window.alert("This role has read-only access. The action is not permitted.");
            return;
        }
        setData((current) => {
            const updated = updater(current);
            const transactionKeys = ["rawMaterialPurchases", "productionBatches", "sales", "expenses", "salaryPayments", "grindingJobs", "flourProduction", "fuelPurchases", "machineReadings", "storePurchases", "purchaseReturns", "gasPurchases", "cashEntries", "supplierPayments", "creditPayments"];
            for (const key of transactionKeys) {
                const before = current[key] || [];
                const after = updated[key] || [];
                const added = after.find((item) => !before.some((old) => old.id === item.id));
                if (added?.date) {
                    const business = inferRecordBusiness(key, added, current);
                    if (isTransactionLocked(current, String(added.date), business)) {
                        window.setTimeout(() => window.alert(`The selected date is closed for ${businessLabel(business)}. Ask Admin to reopen it before adding a transaction.`), 0);
                        return current;
                    }
                }
            }
            const log = { id: uid(), dateTime: new Date().toLocaleString(), user: session?.name || "Demo User", area, action, detail };
            const sensitive = /delete|setting|user|role|permission|closing|restore|unlock|reopen|backup/i.test(`${area} ${action}`);
            const audit = { ...log, id: uid(), sensitive: true };
            return {
                ...updated,
                activityLogs: [log, ...(updated.activityLogs || [])].slice(0, 500),
                auditLogs: sensitive ? [audit, ...(updated.auditLogs || [])].slice(0, 500) : (updated.auditLogs || []),
            };
        });
    };
    const deleteRecord = (key, id, area, label) => {
        if (!canDelete || !isAdmin) {
            window.alert("Only Admin can delete records.");
            return;
        }
        const collection = data[key];
        const record = collection.find((item) => item.id === id);
        if (!record)
            return;
        let reason = "Admin deletion";
        if (record.date) {
            const business = inferRecordBusiness(key, record, data);
            if (isTransactionLocked(data, String(record.date), business)) {
                reason = window.prompt("This record belongs to a closed period. Enter the mandatory Admin reason to continue:", "") || "";
                if (!reason.trim())
                    return;
            }
        }
        if (!window.confirm(`Delete this ${label}? This action will be written to the Audit Log.`))
            return;
        commit(area, `Delete ${label}`, `${id} · ${reason}`, (current) => ({ ...current, [key]: current[key].filter((item) => item.id !== id) }));
    };
    const addCashEntry = (current, entry) => ({ ...current, cashEntries: [{ ...entry, id: uid() }, ...current.cashEntries] });
    const openPrint = (document) => setPrintDocument(document);
    const login = (event) => {
        event.preventDefault();
        const user = data.users.find((item) => item.email.toLowerCase() === loginEmail.toLowerCase() && item.password === loginPassword && item.status === "active");
        if (!user) {
            setLoginError("Invalid email or password. Use the demo credentials below.");
            return;
        }
        setSession({ name: user.name, email: user.email, role: user.role, businessAccess: user.businessAccess });
        setActiveTab("overview");
        setLoginError("");
    };
    if (!mounted)
        return <div className="loading-screen"><div className="brand-mark">PK</div><strong>Loading ERP Suite...</strong></div>;
    if (!session) {
        return <main className="login-page"><section className="login-card"><div className="brand-mark">PK</div><span className="version-pill">Version 2.0</span><h1>PK Business ERP Suite</h1><p>Clickable multi-business ERP demo for Feed Unit, Chakki, Petrol Pump, Super Store, Gas Management, Cash Book and reporting.</p><form className="login-form" onSubmit={login}><label>Email<input type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required/></label><label>Password<input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required/></label>{loginError ? <div className="form-error">{loginError}</div> : null}<button>Sign In</button></form><div className="demo-credentials"><strong>Demo credentials</strong><span>Admin: admin@demo.com / admin123</span><span>Manager: manager@demo.com / manager123</span><span>Operator: operator@demo.com / operator123</span><span>Staff: staff@demo.com / staff123</span><span>Viewer: viewer@demo.com / viewer123</span></div></section></main>;
    }
    const tabBusiness = { feed: "feed", chakki: "chakki", petrol: "petrol", store: "store", gas: "gas" };
    const allNavItems = [
        ["overview", "Dashboard"], ["feed", "Feed Unit"], ["chakki", "Chakki"], ["petrol", "Petrol Pump"], ["store", "Super Store"], ["gas", "Gas Management"], ["cashbook", "Cash Book"], ["staff", "Staff"], ["reports", "Reports / Print"], ["settings", "Settings"],
    ];
    const navItems = allNavItems.filter(([key]) => {
        const targetBusiness = tabBusiness[key];
        if (targetBusiness && !canAccessBusiness(session, targetBusiness))
            return false;
        if (key === "reports" && !hasPermission(session.role, "reports.view"))
            return false;
        if (key === "cashbook" && !hasPermission(session.role, "closings.manage") && session.role !== "admin")
            return false;
        if (key === "settings" && session.role !== "admin")
            return false;
        return true;
    });
    const pageTitle = { overview: "Business Dashboard", feed: "Feed Unit Management", chakki: "Chakki Management", petrol: "Petrol Pump Management", store: "Super Store Management", gas: "Gas Management", cashbook: "Cash Book", staff: "Staff & Salary", reports: "Reports & Print", settings: "System Settings" };
    return <>
    <main className={`app-shell ${data.settings.darkMode ? "dark-mode" : ""}`}>
      <aside className="sidebar no-print">
        <div className="logo-wrap"><div className="brand-mark small">PK</div><div><strong>{data.settings.businessName}</strong><span>Version {data.settings.version}</span></div></div>
        <nav>{navItems.map(([key, label]) => <button key={key} className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)}>{label}</button>)}</nav>
        <div className="sidebar-status"><span className="status-dot"/> LocalStorage active</div>
        <button className="logout" onClick={() => { setActiveTab("overview"); setSession(null); }}>Sign Out</button>
      </aside>
      <section className="content-area">
        <header className="topbar no-print"><div><p>{new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p><h1>{pageTitle[activeTab]}</h1></div><div className="topbar-actions"><button className="notification-button" onClick={() => setActiveTab("overview")}>Notifications <b>{metrics.lowStockItems.length + (metrics.outstandingCredit > 0 ? 1 : 0)}</b></button><div className="user-chip"><strong>{session.name}</strong><span>{titleCase(session.role)}</span></div></div></header>
        {activeTab === "overview" ? <Overview data={data} metrics={metrics} navigate={setActiveTab} openPrint={openPrint}/> : null}
        {activeTab === "feed" ? <FeedUnitPanel data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} metrics={metrics}/> : null}
        {activeTab === "chakki" ? <ChakkiPanel data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} metrics={metrics}/> : null}
        {activeTab === "petrol" ? <PetrolPanel data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} metrics={metrics}/> : null}
        {activeTab === "store" ? <StorePanel data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} metrics={metrics}/> : null}
        {activeTab === "gas" ? <GasPanel data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint} metrics={metrics}/> : null}
        {activeTab === "cashbook" ? <CashBookPanel data={data} commit={commit} deleteRecord={deleteRecord} metrics={metrics} openPrint={openPrint} isAdmin={isAdmin}/> : null}
        {activeTab === "staff" ? <StaffPanel data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint}/> : null}
        {activeTab === "reports" ? <ReportsPanel data={data} metrics={metrics} openPrint={openPrint}/> : null}
        {activeTab === "settings" ? <SettingsPanel data={data} setData={setData} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin}/> : null}
      </section>
    </main>
    {printDocument ? <PrintPreview document={printDocument} onClose={() => setPrintDocument(null)}/> : null}
  </>;
}
function MetricChart({ title, months, metric }) {
    const maximum = Math.max(...months.map((item) => Math.max(item[metric], 0)), 1);
    return <div className="metric-chart"><h3>{title}</h3><div className="bar-chart compact-chart">{months.map((item) => <div key={item.key} className="bar-column"><div className="bar-value">{money(item[metric])}</div><div className="bar-track"><div className={`bar-fill ${metric}`} style={{ height: `${Math.max((Math.max(item[metric], 0) / maximum) * 100, 4)}%` }}/></div><strong>{item.label}</strong></div>)}</div></div>;
}
function Overview({ data, metrics, navigate, openPrint }) {
    const [chartBusiness, setChartBusiness] = useState("all");
    const months = useMemo(() => Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (5 - index));
        const key = date.toISOString().slice(0, 7);
        const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
        const businesses = chartBusiness === "all" ? ["feed", "chakki", "petrol", "store", "gas"] : [chartBusiness];
        const totals = businesses.map((business) => getBusinessTotals(data, business, `${key}-01`, last));
        return { key, label: date.toLocaleDateString("en-PK", { month: "short" }), sales: totals.reduce((sum, item) => sum + item.sales, 0), expenses: totals.reduce((sum, item) => sum + item.expenses, 0), profit: totals.reduce((sum, item) => sum + item.profit, 0) };
    }), [data, chartBusiness]);
    const currentMonth = today().slice(0, 7);
    const hasSalaryDue = data.staff.some((member) => member.status === "active" && !data.salaryPayments.some((payment) => payment.staffId === member.id && payment.month === currentMonth && payment.status === "paid"));
    const daysSinceBackup = Math.floor((Date.now() - new Date(data.settings.lastBackupAt || dateOffset(-30)).getTime()) / 86400000);
    const notifications = [
        ...metrics.lowStockItems.slice(0, 6).map((item) => ({ id: `stock-${item.id}`, title: `Low stock: ${item.item}`, detail: `${item.business} has ${item.stock} remaining.`, type: "warning" })),
        ...(metrics.outstandingCredit > 0 ? [{ id: "credit-due", title: "Credit due", detail: `${money(metrics.outstandingCredit)} is outstanding across businesses.`, type: "danger" }] : []),
        ...(hasSalaryDue ? [{ id: "salary-due", title: "Salary due", detail: "One or more active staff salaries are pending this month.", type: "warning" }] : []),
        ...(!data.closings.some((item) => item.period === "monthly" && item.date.slice(0, 7) === currentMonth && item.status !== "reopened") ? [{ id: "closing-reminder", title: "Monthly closing reminder", detail: "Current month closing has not been completed.", type: "info" }] : []),
        ...(daysSinceBackup >= 7 ? [{ id: "backup-reminder", title: "Backup reminder", detail: `Last backup was ${daysSinceBackup} days ago.`, type: "info" }] : []),
    ];
    const productMap = new Map();
    data.sales.forEach((item) => { const existing = productMap.get(item.productName) || { name: item.productName, quantity: 0, value: 0 }; existing.quantity += item.quantity; existing.value += item.total; productMap.set(item.productName, existing); });
    const topProducts = [...productMap.values()].sort((a, b) => b.value - a.value).slice(0, 5).map((item, index) => ({ id: `product-${index}`, ...item }));
    const customerMap = new Map();
    data.customers.forEach((customer) => customerMap.set(customer.name, { name: customer.name, sales: 0, outstanding: customerOutstanding(data, customer.id) }));
    data.sales.forEach((sale) => { const item = customerMap.get(sale.customerName) || { name: sale.customerName, sales: 0, outstanding: 0 }; item.sales += sale.total; customerMap.set(sale.customerName, item); });
    data.machineReadings.forEach((reading) => { const item = customerMap.get(reading.customerName) || { name: reading.customerName, sales: 0, outstanding: 0 }; item.sales += readingAmount(reading); customerMap.set(reading.customerName, item); });
    const topCustomers = [...customerMap.values()].filter((item) => item.sales > 0 || item.outstanding > 0).sort((a, b) => b.sales - a.sales).slice(0, 5).map((item, index) => ({ id: `customer-${index}`, ...item }));
    const todayBusiness = (business) => getBusinessTotals(data, business, today(), today());
    const cards = [
        { key: "feed", business: "feed", title: "Feed Unit", detail: `${inventoryQuantityLabel(data, "feed", metrics)} · Chakki available inside Feed operations` },
        { key: "petrol", business: "petrol", title: "Petrol Pump", detail: inventoryQuantityLabel(data, "petrol", metrics) },
        { key: "store", business: "store", title: "Super Store", detail: inventoryQuantityLabel(data, "store", metrics) },
        { key: "gas", business: "gas", title: "Gas Management", detail: inventoryQuantityLabel(data, "gas", metrics) },
    ];
    return <div className="screen-stack">
    <section className="hero-panel"><div><p>PK Business ERP Suite</p><h2>One dashboard. Four business systems.</h2><span>BRD-aligned clickable demo with automatic inventory, credit, cash book, closings, reports and audit controls.</span></div><button className="secondary-btn" onClick={() => openPrint({ title: "Main ERP Dashboard Summary", subtitle: today(), fields: [["Total Investment", money(metrics.totalInvestment)], ["Today's Sales", money(metrics.todaySales)], ["Today's Expenses", money(metrics.todayExpenses)], ["Today's Profit", money(metrics.todayProfit)], ["Today's Collection", money(metrics.todayCollection)], ["Credit Recovery", money(metrics.todayCreditRecovery)], ["Cash In Hand", money(metrics.cashBalance)], ["Outstanding Credit", money(metrics.outstandingCredit)], ["Supplier Payables", money(metrics.outstandingPayables)], ["Inventory Value", money(metrics.inventoryValue)]], footer: "PK Business ERP Suite Version 2.0 · Client Demo" })}>Print Summary</button></section>
    <div className="business-cards">{cards.map((card) => { const totals = todayBusiness(card.business); return <button key={card.key} onClick={() => navigate(card.key)}><span>{card.title}</span><strong>{money(totals.sales)}</strong><small>Today profit: {money(totals.profit)}<br />{card.detail}</small></button>; })}</div>
    <div className="stats-grid">
      <StatCard label="Total Investment" value={money(metrics.totalInvestment)} hint="Partner capital less withdrawals"/>
      <StatCard label="Today's Sales" value={money(metrics.todaySales)} hint="All business systems" tone="success"/>
      <StatCard label="Today's Expenses" value={money(metrics.todayExpenses)} hint="Operational + paid salary" tone="danger"/>
      <StatCard label="Today's Profit" value={money(metrics.todayProfit)} hint="Sales − cost − expenses" tone={metrics.todayProfit >= 0 ? "success" : "danger"}/>
      <StatCard label="Today's Collection" value={money(metrics.todayCollection)} hint="Cash sale + credit recovery"/>
      <StatCard label="Today's Credit Recovery" value={money(metrics.todayCreditRecovery)} hint="Old outstanding collected"/>
      <StatCard label="Cash In Hand" value={money(metrics.cashBalance)} hint="Live Cash Book balance"/>
      <StatCard label="Cash Sales" value={money(metrics.cashSales)} hint="All-time cash sales"/>
      <StatCard label="Credit Sales" value={money(metrics.creditSales)} hint="Credit + temporary"/>
      <StatCard label="Outstanding Credit" value={money(metrics.outstandingCredit)} hint="Customer receivables" tone="warning"/>
      <StatCard label="Supplier Payables" value={money(metrics.outstandingPayables)} hint="Supplier outstanding balance" tone="warning"/>
      <StatCard label="Inventory Summary" value={money(metrics.inventoryValue)} hint="Current cost value"/>
    </div>
    <div className="two-col">
      <Panel title="Low Stock"><DataTable rows={metrics.lowStockItems} columns={[{ key: "business", label: "Business" }, { key: "item", label: "Item" }, { key: "stock", label: "Current" }, { key: "reorder", label: "Reorder At" }]} empty="All stock levels are healthy."/></Panel>
      <Panel title="Notifications"><div className="notification-list">{notifications.length ? notifications.map((item) => <div key={item.id} className={`notification-item ${item.type}`}><strong>{item.title}</strong><span>{item.detail}</span></div>) : <div className="empty-card">No active notification.</div>}</div></Panel>
    </div>
    <div className="two-col">
      <Panel title="Recent Activities"><div className="activity-list">{data.activityLogs.slice(0, 8).map((item) => <div key={item.id}><span>{item.dateTime}</span><strong>{item.action}</strong><small>{item.user} · {item.area} · {item.detail}</small></div>)}</div></Panel>
      <Panel title="Quick Actions"><div className="quick-actions"><button onClick={() => navigate("feed")}>New Feed Purchase / Batch</button><button onClick={() => navigate("chakki")}>Grinding Receipt</button><button onClick={() => navigate("petrol")}>Machine Reading</button><button onClick={() => navigate("store")}>Store Sale</button><button onClick={() => navigate("cashbook")}>Daily Closing</button><button onClick={() => navigate("reports")}>Generate Report</button></div></Panel>
    </div>
    <div className="two-col"><Panel title="Top Selling Products"><DataTable rows={topProducts} columns={[{ key: "name", label: "Product" }, { key: "quantity", label: "Quantity", value: (row) => row.quantity }, { key: "value", label: "Sales Value", value: (row) => row.value, render: (row) => money(row.value) }]} empty="No sales yet."/></Panel><Panel title="Top Customers"><DataTable rows={topCustomers} columns={[{ key: "name", label: "Customer" }, { key: "sales", label: "Sales", value: (row) => row.sales, render: (row) => money(row.sales) }, { key: "outstanding", label: "Outstanding", value: (row) => row.outstanding, render: (row) => money(row.outstanding) }]} empty="No customer activity yet."/></Panel></div>
    <Panel title="Monthly Sales, Expense & Profit Charts" actions={<label className="filter-control"><span>Business</span><select value={chartBusiness} onChange={(event) => setChartBusiness(event.target.value)}><option value="all">Combined</option><option value="feed">Feed Unit</option><option value="chakki">Chakki</option><option value="petrol">Petrol Pump</option><option value="store">Super Store</option><option value="gas">Gas Management</option></select></label>}><div className="chart-grid"><MetricChart title="Monthly Sales" months={months} metric="sales"/><MetricChart title="Monthly Expenses" months={months} metric="expenses"/><MetricChart title="Monthly Profit" months={months} metric="profit"/></div></Panel>
  </div>;
}
function ContactManager({ type, business, data, commit, deleteRecord, isAdmin }) {
    const [form, setForm] = useState({ name: "", phone: "", address: "", amount: "0", creditLimit: "0" });
    const rows = type === "supplier" ? data.suppliers.filter((item) => item.business === business) : data.customers.filter((item) => item.business === business);
    const submit = (event) => {
        event.preventDefault();
        if (type === "supplier") {
            const record = { id: uid(), business, name: form.name, phone: form.phone, address: form.address, openingBalance: toNum(form.amount) };
            commit(businessLabel(business), "Add supplier", record.name, (current) => ({ ...current, suppliers: [record, ...current.suppliers] }));
        }
        else {
            const record = { id: uid(), business, name: form.name, phone: form.phone, address: form.address, openingBalance: toNum(form.amount), creditLimit: toNum(form.creditLimit) };
            commit(businessLabel(business), "Add customer", record.name, (current) => ({ ...current, customers: [record, ...current.customers] }));
        }
        setForm({ name: "", phone: "", address: "", amount: "0", creditLimit: "0" });
    };
    return <Panel title={`${type === "supplier" ? "Supplier" : "Customer"} Management`}>
    <form className="form-grid wide" onSubmit={submit}><input placeholder={`${titleCase(type)} name`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required/><input placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/><input placeholder="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })}/><input type="number" min="0" placeholder="Opening balance" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })}/>{type === "customer" ? <input type="number" min="0" placeholder="Credit limit" value={form.creditLimit} onChange={(event) => setForm({ ...form, creditLimit: event.target.value })}/> : null}<button>Add {titleCase(type)}</button></form>
    <DataTable rows={rows} columns={[{ key: "name", label: "Name" }, { key: "phone", label: "Phone" }, { key: "address", label: "Address" }, { key: "openingBalance", label: "Opening Balance", value: (row) => row.openingBalance, render: (row) => money(row.openingBalance) }, ...(type === "customer" ? [{ key: "creditLimit", label: "Credit Limit", value: (row) => row.creditLimit, render: (row) => money(row.creditLimit) }] : []), { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord(type === "supplier" ? "suppliers" : "customers", row.id, businessLabel(business), type)}>Delete</button> : <span className="muted-text">View only</span> }]}/>
  </Panel>;
}
function ExpenseManager({ business, data, commit, deleteRecord, addCashEntry, isAdmin, openPrint }) {
    const [form, setForm] = useState({ date: today(), title: "", category: "Utilities", amount: "", paymentType: "cash", notes: "" });
    const rows = data.expenses.filter((item) => item.business === business);
    const submit = (event) => {
        event.preventDefault();
        const record = { id: uid(), business, date: form.date, title: form.title, category: form.category, amount: toNum(form.amount), paymentType: form.paymentType, notes: form.notes };
        commit(businessLabel(business), "Add expense", `${record.title}: ${money(record.amount)}`, (current) => {
            let next = { ...current, expenses: [record, ...current.expenses] };
            if (record.paymentType === "cash")
                next = addCashEntry(next, { date: record.date, type: "expense", business, category: record.category, reference: record.id, description: record.title, amount: record.amount });
            return next;
        });
        setForm({ date: today(), title: "", category: "Utilities", amount: "", paymentType: "cash", notes: "" });
    };
    return <Panel title={`${businessLabel(business)} Expenses`} actions={<button className="secondary-btn" onClick={() => openPrint({ title: `${businessLabel(business)} Expense Report`, subtitle: `Generated ${today()}`, columns: ["Date", "Title", "Category", "Amount", "Payment"], rows: rows.map((item) => [item.date, item.title, item.category, money(item.amount), titleCase(item.paymentType)]), footer: `Total: ${money(rows.reduce((sum, item) => sum + item.amount, 0))}` })}>Print Expense Report</button>}>
    <form className="form-grid wide" onSubmit={submit}><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required/><input placeholder="Expense title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required/><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Utilities</option><option>Maintenance</option><option>Transport</option><option>Rent</option><option>Office</option><option>Other</option></select><input type="number" min="0" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required/><select value={form.paymentType} onChange={(event) => setForm({ ...form, paymentType: event.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option></select><input placeholder="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })}/><button>Add Expense</button></form>
    <DataTable rows={rows} columns={[{ key: "date", label: "Date" }, { key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }, { key: "notes", label: "Notes" }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("expenses", row.id, businessLabel(business), "expense")}>Delete</button> : <span className="muted-text">View only</span> }]}/>
  </Panel>;
}
function BusinessStaffView({ business, data }) {
    const rows = data.staff.filter((item) => item.business === business);
    return <Panel title={`${businessLabel(business)} Staff`}><DataTable rows={rows} columns={[{ key: "name", label: "Name" }, { key: "roleTitle", label: "Role" }, { key: "phone", label: "Phone" }, { key: "monthlySalary", label: "Monthly Salary", value: (row) => row.monthlySalary, render: (row) => money(row.monthlySalary) }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }]}/></Panel>;
}
function BusinessSalaryView({ business, data }) {
    const staffIds = new Set(data.staff.filter((item) => item.business === business).map((item) => item.id));
    const rows = data.salaryPayments.filter((item) => staffIds.has(item.staffId));
    return <Panel title={`${businessLabel(business)} Salary History`}><DataTable rows={rows} columns={[{ key: "date", label: "Date" }, { key: "month", label: "Salary Month" }, { key: "staffId", label: "Staff", value: (row) => data.staff.find((item) => item.id === row.staffId)?.name || "Unknown" }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }, { key: "notes", label: "Notes" }]}/></Panel>;
}
function SimpleBusinessReport({ business, data, openPrint }) {
    const sales = data.sales.filter((item) => item.business === business);
    const expenses = data.expenses.filter((item) => item.business === business);
    const extraSales = business === "chakki" ? data.grindingJobs.reduce((sum, item) => sum + item.charges, 0) : business === "petrol" ? data.machineReadings.reduce((sum, item) => sum + readingAmount(item), 0) : 0;
    const totalSales = sales.reduce((sum, item) => sum + item.total, 0) + extraSales;
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    return <div className="screen-stack"><div className="stats-grid compact"><StatCard label="Sales" value={money(totalSales)}/><StatCard label="Expenses" value={money(totalExpenses)}/><StatCard label="Profit" value={money(totalSales - totalExpenses)} tone="success"/><StatCard label="Transactions" value={fmt(sales.length + (business === "chakki" ? data.grindingJobs.length : business === "petrol" ? data.machineReadings.length : 0))}/></div><Panel title={`${businessLabel(business)} Report`} actions={<button className="primary-btn" onClick={() => openPrint({ title: `${businessLabel(business)} Monthly Report`, subtitle: new Date().toLocaleDateString("en-PK", { month: "long", year: "numeric" }), fields: [["Sales", money(totalSales)], ["Expenses", money(totalExpenses)], ["Estimated Profit", money(totalSales - totalExpenses)], ["Transactions", String(sales.length)]], columns: ["Date", "Invoice", "Customer", "Product", "Total", "Paid"], rows: sales.map((item) => [item.date, item.invoiceNo, item.customerName, item.productName, money(item.total), money(item.paidAmount)]), footer: "Generated by PK Business ERP Suite Version 2.0" })}>Print Monthly Report</button>}><DataTable rows={sales} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Product" }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "paidAmount", label: "Paid", value: (row) => row.paidAmount, render: (row) => money(row.paidAmount) }]}/></Panel></div>;
}
function BusinessDashboard({ business, data, metrics, openPrint }) {
    const totals = getBusinessTotals(data, business, today(), today());
    const allTotals = getBusinessTotals(data, business);
    const rows = transactionRowsForBusiness(data, business).slice(0, 8);
    const inventory = inventoryQuantityLabel(data, business, metrics);
    const outstanding = businessOutstanding(metrics, business);
    const months = Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (5 - index));
        const key = date.toISOString().slice(0, 7);
        const to = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
        const item = getBusinessTotals(data, business, `${key}-01`, to);
        return { key, label: date.toLocaleDateString("en-PK", { month: "short" }), sales: item.sales, expenses: item.expenses, profit: item.profit };
    });
    return <div className="screen-stack"><div className="stats-grid compact"><StatCard label="Today's Sales" value={money(totals.sales)} tone="success"/><StatCard label="Cash Sales" value={money(totals.cashSales)}/><StatCard label="Credit Sales" value={money(totals.creditSales)} tone="warning"/><StatCard label="Today's Expenses" value={money(totals.expenses)} tone="danger"/><StatCard label="Today's Profit" value={money(totals.profit)} tone={totals.profit >= 0 ? "success" : "danger"}/><StatCard label="Current Inventory" value={inventory}/><StatCard label="Outstanding Credit" value={money(outstanding)} tone="warning"/><StatCard label="All-time Sales" value={money(allTotals.sales)}/></div><Panel title={`${businessLabel(business)} Monthly Performance`} actions={<button className="secondary-btn" onClick={() => openPrint({ title: `${businessLabel(business)} Dashboard`, subtitle: today(), fields: [["Today's Sales", money(totals.sales)], ["Today's Cash Sales", money(totals.cashSales)], ["Today's Credit Sales", money(totals.creditSales)], ["Today's Expenses", money(totals.expenses)], ["Today's Profit", money(totals.profit)], ["Inventory", inventory], ["Outstanding Credit", money(outstanding)]] })}>Print Dashboard</button>}><div className="chart-grid"><MetricChart title="Sales" months={months} metric="sales"/><MetricChart title="Expenses" months={months} metric="expenses"/><MetricChart title="Profit" months={months} metric="profit"/></div></Panel><Panel title="Recent Transactions"><DataTable rows={rows} columns={[{ key: "date", label: "Date" }, { key: "reference", label: "Reference" }, { key: "party", label: "Customer" }, { key: "description", label: "Description" }, { key: "payment", label: "Payment" }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "balance", label: "Balance", value: (row) => row.balance, render: (row) => money(row.balance) }]}/></Panel></div>;
}
function SupplierLedgerManager({ business, data, commit, addCashEntry, isAdmin, openPrint }) {
    const suppliers = data.suppliers.filter((item) => item.business === business);
    const [form, setForm] = useState({ date: today(), supplierId: suppliers[0]?.id || "", amount: "", paymentMethod: "cash", reference: `SPAY-${Date.now().toString().slice(-6)}`, notes: "" });
    const addPayment = (event) => {
        event.preventDefault();
        const supplier = data.suppliers.find((item) => item.id === form.supplierId);
        const amount = toNum(form.amount);
        if (!supplier || !transactionDateIsAllowed(form.date) || !positiveAmount(amount, "Payment amount"))
            return;
        const outstanding = supplierOutstanding(data, supplier.id);
        if (amount > outstanding && !isAdmin) {
            window.alert(`Payment exceeds supplier outstanding of ${money(outstanding)}. Admin override is required.`);
            return;
        }
        const record = { id: uid(), date: form.date, supplierId: supplier.id, business, amount, paymentMethod: form.paymentMethod, reference: form.reference, notes: form.notes };
        commit(businessLabel(business), "Supplier payment", `${supplier.name}: ${money(amount)}`, (current) => {
            let next = { ...current, supplierPayments: [record, ...current.supplierPayments] };
            if (record.paymentMethod === "cash")
                next = addCashEntry(next, { date: record.date, type: "paid", business, category: "Supplier Payment", reference: record.reference, description: supplier.name, amount: record.amount });
            return next;
        });
        setForm({ ...form, amount: "", reference: `SPAY-${Date.now().toString().slice(-6)}`, notes: "" });
    };
    const rows = suppliers.map((supplier) => ({ ...supplier, purchases: supplier.business === "feed" ? data.rawMaterialPurchases.filter((item) => item.supplierId === supplier.id).reduce((sum, item) => sum + item.quantity * item.rate, 0) : supplier.business === "petrol" ? data.fuelPurchases.filter((item) => item.supplierId === supplier.id).reduce((sum, item) => sum + item.liters * item.rate, 0) : supplier.business === "store" ? data.storePurchases.filter((item) => item.supplierId === supplier.id).reduce((sum, item) => sum + item.quantity * item.rate, 0) : data.gasPurchases.filter((item) => item.supplierId === supplier.id).reduce((sum, item) => sum + item.quantity * item.rate, 0), payments: data.supplierPayments.filter((item) => item.supplierId === supplier.id).reduce((sum, item) => sum + item.amount, 0), outstanding: supplierOutstanding(data, supplier.id) }));
    const printStatement = (supplierId) => {
        const supplier = data.suppliers.find((item) => item.id === supplierId);
        if (!supplier)
            return;
        const purchaseRows = [];
        data.rawMaterialPurchases.filter((item) => item.supplierId === supplierId).forEach((item) => purchaseRows.push([item.date, item.invoiceNo, "Raw Material Purchase", money(item.quantity * item.rate), money(item.paidAmount)]));
        data.fuelPurchases.filter((item) => item.supplierId === supplierId).forEach((item) => purchaseRows.push([item.date, item.invoiceNo, `${titleCase(item.fuelType)} Purchase`, money(item.liters * item.rate), money(item.paidAmount)]));
        data.storePurchases.filter((item) => item.supplierId === supplierId).forEach((item) => purchaseRows.push([item.date, item.invoiceNo, "Store Purchase", money(item.quantity * item.rate), money(item.paidAmount)]));
        data.gasPurchases.filter((item) => item.supplierId === supplierId).forEach((item) => purchaseRows.push([item.date, item.invoiceNo, "Cylinder Purchase", money(item.quantity * item.rate), money(item.paidAmount)]));
        data.supplierPayments.filter((item) => item.supplierId === supplierId).forEach((item) => purchaseRows.push([item.date, item.reference, "Supplier Payment", money(0), money(item.amount)]));
        openPrint({ title: "Supplier Statement of Account", subtitle: supplier.name, fields: [["Business", businessLabel(supplier.business)], ["Phone", supplier.phone || "—"], ["Opening Balance", money(supplier.openingBalance)], ["Outstanding Payable", money(supplierOutstanding(data, supplier.id))]], columns: ["Date", "Reference", "Description", "Debit", "Payment"], rows: purchaseRows.sort((a, b) => b[0].localeCompare(a[0])) });
    };
    return <div className="screen-stack"><Panel title={`${businessLabel(business)} Supplier Payments`}><form className="form-grid wide" onSubmit={addPayment}><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required/><select value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })}>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name} · Due {money(supplierOutstanding(data, item.id))}</option>)}</select><input type="number" min="0" placeholder="Payment amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required/><select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option value="cash">Cash</option><option value="bank">Bank</option></select><input placeholder="Reference" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} required/><input placeholder="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })}/><button>Record Payment</button></form></Panel><Panel title="Supplier Ledger"><DataTable rows={rows} columns={[{ key: "name", label: "Supplier" }, { key: "phone", label: "Phone" }, { key: "purchases", label: "Purchases", value: (row) => row.purchases, render: (row) => money(row.purchases) }, { key: "payments", label: "Payments", value: (row) => row.payments, render: (row) => money(row.payments) }, { key: "outstanding", label: "Outstanding", value: (row) => row.outstanding, render: (row) => money(row.outstanding) }, { key: "statement", label: "Statement", render: (row) => <button className="secondary-btn mini" onClick={() => printStatement(row.id)}>Print</button> }]}/></Panel></div>;
}
function CustomerLedgerManager({ business, data, commit, addCashEntry, openPrint }) {
    const customers = data.customers.filter((item) => item.business === business);
    const [form, setForm] = useState({ date: today(), customerId: customers[0]?.id || "", amount: "", paymentMethod: "cash", reference: `REC-${Date.now().toString().slice(-6)}`, notes: "" });
    const addRecovery = (event) => {
        event.preventDefault();
        const customer = data.customers.find((item) => item.id === form.customerId);
        const amount = toNum(form.amount);
        if (!customer || !transactionDateIsAllowed(form.date) || !positiveAmount(amount, "Recovery amount"))
            return;
        const outstanding = customerOutstanding(data, customer.id);
        if (amount > outstanding) {
            window.alert(`Recovery cannot exceed current outstanding of ${money(outstanding)}.`);
            return;
        }
        const record = { id: uid(), date: form.date, customerId: customer.id, business, amount, paymentMethod: form.paymentMethod, reference: form.reference, notes: form.notes };
        commit(businessLabel(business), "Credit recovery", `${customer.name}: ${money(amount)}`, (current) => {
            let next = { ...current, creditPayments: [record, ...current.creditPayments] };
            if (record.paymentMethod === "cash")
                next = addCashEntry(next, { date: record.date, type: "received", business, category: "Credit Recovery", reference: record.reference, description: customer.name, amount: record.amount });
            return next;
        });
        setForm({ ...form, amount: "", reference: `REC-${Date.now().toString().slice(-6)}`, notes: "" });
    };
    const rows = customers.map((customer) => ({ ...customer, sales: data.sales.filter((item) => item.customerId === customer.id).reduce((sum, item) => sum + item.total, 0) + data.machineReadings.filter((item) => item.customerId === customer.id).reduce((sum, item) => sum + readingAmount(item), 0), recovered: data.creditPayments.filter((item) => item.customerId === customer.id).reduce((sum, item) => sum + item.amount, 0), outstanding: customerOutstanding(data, customer.id) }));
    const printLedger = (customerId) => {
        const customer = data.customers.find((item) => item.id === customerId);
        if (!customer)
            return;
        const ledgerRows = [];
        data.sales.filter((item) => item.customerId === customerId).forEach((item) => ledgerRows.push([item.date, item.invoiceNo, item.productName, money(item.total), money(item.paidAmount), money(item.total - item.paidAmount)]));
        data.machineReadings.filter((item) => item.customerId === customerId).forEach((item) => ledgerRows.push([item.date, `${item.machine}-${item.id.slice(-4)}`, `${titleCase(item.fuelType)} ${fmt(soldLiters(item))} L`, money(readingAmount(item)), money(item.paidAmount), money(readingAmount(item) - item.paidAmount)]));
        data.creditPayments.filter((item) => item.customerId === customerId).forEach((item) => ledgerRows.push([item.date, item.reference, "Credit Recovery", money(0), money(item.amount), money(0)]));
        openPrint({ title: "Customer Ledger", subtitle: customer.name, fields: [["Business", businessLabel(customer.business)], ["Phone", customer.phone || "—"], ["Credit Limit", money(customer.creditLimit)], ["Current Outstanding", money(customerOutstanding(data, customer.id))]], columns: ["Date", "Reference", "Description", "Sale", "Paid", "Balance"], rows: ledgerRows.sort((a, b) => b[0].localeCompare(a[0])) });
    };
    return <div className="screen-stack"><Panel title={`${businessLabel(business)} Credit Recovery`}><form className="form-grid wide" onSubmit={addRecovery}><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required/><select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}>{customers.map((item) => <option key={item.id} value={item.id}>{item.name} · Due {money(customerOutstanding(data, item.id))}</option>)}</select><input type="number" min="0" placeholder="Amount received" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required/><select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option value="cash">Cash</option><option value="bank">Bank</option></select><input placeholder="Reference" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} required/><input placeholder="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })}/><button>Receive Payment</button></form></Panel><Panel title="Customer Ledger"><DataTable rows={rows} columns={[{ key: "name", label: "Customer" }, { key: "phone", label: "Phone" }, { key: "creditLimit", label: "Credit Limit", value: (row) => row.creditLimit, render: (row) => money(row.creditLimit) }, { key: "sales", label: "Sales", value: (row) => row.sales, render: (row) => money(row.sales) }, { key: "recovered", label: "Recovered", value: (row) => row.recovered, render: (row) => money(row.recovered) }, { key: "outstanding", label: "Outstanding", value: (row) => row.outstanding, render: (row) => <span className={`status-badge ${row.outstanding > row.creditLimit && row.creditLimit > 0 ? "danger" : "warning"}`}>{money(row.outstanding)}</span> }, { key: "statement", label: "Ledger", render: (row) => <button className="secondary-btn mini" onClick={() => printLedger(row.id)}>Print</button> }]}/></Panel></div>;
}
function PurchaseReturnManager({ business, data, commit, openPrint }) {
    const invoices = business === "feed" ? data.rawMaterialPurchases.map((item) => ({ invoiceNo: item.invoiceNo, supplierId: item.supplierId, productId: item.materialId, quantity: item.quantity, rate: item.rate, productName: data.rawMaterials.find((product) => product.id === item.materialId)?.name || "Raw Material" })) : business === "petrol" ? data.fuelPurchases.map((item) => ({ invoiceNo: item.invoiceNo, supplierId: item.supplierId, productId: item.fuelType, quantity: item.liters, rate: item.rate, productName: `${titleCase(item.fuelType)} Fuel` })) : business === "store" ? data.storePurchases.map((item) => ({ invoiceNo: item.invoiceNo, supplierId: item.supplierId, productId: item.productId, quantity: item.quantity, rate: item.rate, productName: data.storeProducts.find((product) => product.id === item.productId)?.name || "Store Product" })) : data.gasPurchases.map((item) => ({ invoiceNo: item.invoiceNo, supplierId: item.supplierId, productId: item.productId, quantity: item.quantity, rate: item.rate, productName: data.gasProducts.find((product) => product.id === item.productId)?.name || "Gas Cylinder" }));
    const [form, setForm] = useState({ date: today(), returnNo: `RET-${Date.now().toString().slice(-6)}`, originalInvoiceNo: invoices[0]?.invoiceNo || "", quantity: "", reason: "Damaged goods" });
    const selected = invoices.find((item) => item.invoiceNo === form.originalInvoiceNo);
    const addReturn = (event) => {
        event.preventDefault();
        const quantity = toNum(form.quantity);
        if (!selected || !transactionDateIsAllowed(form.date) || !positiveAmount(quantity, "Return quantity"))
            return;
        const alreadyReturned = data.purchaseReturns.filter((item) => item.business === business && item.originalInvoiceNo === selected.invoiceNo).reduce((sum, item) => sum + item.quantity, 0);
        if (quantity + alreadyReturned > selected.quantity) {
            window.alert(`Return quantity exceeds remaining quantity from original invoice. Maximum available: ${fmt(selected.quantity - alreadyReturned)}.`);
            return;
        }
        const record = { id: uid(), date: form.date, returnNo: form.returnNo, business, supplierId: selected.supplierId, productId: selected.productId, quantity, rate: selected.rate, reason: form.reason, originalInvoiceNo: selected.invoiceNo };
        commit(businessLabel(business), "Purchase return", `${record.returnNo}: ${selected.productName} ${fmt(quantity)}`, (current) => {
            if (business === "feed")
                return { ...current, purchaseReturns: [record, ...current.purchaseReturns], rawMaterials: current.rawMaterials.map((item) => item.id === record.productId ? { ...item, stock: Math.max(item.stock - record.quantity, 0) } : item) };
            if (business === "store")
                return { ...current, purchaseReturns: [record, ...current.purchaseReturns], storeProducts: current.storeProducts.map((item) => item.id === record.productId ? { ...item, stock: Math.max(item.stock - record.quantity, 0) } : item) };
            if (business === "gas")
                return { ...current, purchaseReturns: [record, ...current.purchaseReturns], gasProducts: current.gasProducts.map((item) => item.id === record.productId ? { ...item, stock: Math.max(item.stock - record.quantity, 0) } : item) };
            return { ...current, purchaseReturns: [record, ...current.purchaseReturns] };
        });
        openPrint({ title: "Purchase Return", subtitle: record.returnNo, fields: [["Date", record.date], ["Business", businessLabel(business)], ["Original Purchase Invoice", selected.invoiceNo], ["Supplier", data.suppliers.find((item) => item.id === selected.supplierId)?.name || "Unknown"], ["Item", selected.productName], ["Quantity", fmt(record.quantity)], ["Rate", money(record.rate)], ["Return Value", money(record.quantity * record.rate)], ["Reason", record.reason]] });
        setForm({ ...form, returnNo: `RET-${Date.now().toString().slice(-6)}`, quantity: "", reason: "Damaged goods" });
    };
    const rows = data.purchaseReturns.filter((item) => item.business === business).map((item) => ({ ...item, supplierName: data.suppliers.find((supplier) => supplier.id === item.supplierId)?.name || "Unknown", productName: business === "feed" ? data.rawMaterials.find((product) => product.id === item.productId)?.name || item.productId : business === "store" ? data.storeProducts.find((product) => product.id === item.productId)?.name || item.productId : business === "gas" ? data.gasProducts.find((product) => product.id === item.productId)?.name || item.productId : titleCase(item.productId) }));
    return <Panel title={`${businessLabel(business)} Purchase Return`}><form className="form-grid wide" onSubmit={addReturn}><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required/><input placeholder="Return no" value={form.returnNo} onChange={(event) => setForm({ ...form, returnNo: event.target.value })} required/><select value={form.originalInvoiceNo} onChange={(event) => setForm({ ...form, originalInvoiceNo: event.target.value })}>{invoices.map((item) => <option key={item.invoiceNo} value={item.invoiceNo}>{item.invoiceNo} · {item.productName} · {fmt(item.quantity)}</option>)}</select><input value={selected ? data.suppliers.find((item) => item.id === selected.supplierId)?.name || "Unknown supplier" : ""} readOnly/><input type="number" min="0" placeholder="Return quantity" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required/><input placeholder="Mandatory reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required/><button>Save Return</button></form><InlineNotice>Saving a return reduces inventory and the supplier payable automatically. Every return must reference its original purchase invoice.</InlineNotice><DataTable rows={rows} columns={[{ key: "date", label: "Date" }, { key: "returnNo", label: "Return No" }, { key: "originalInvoiceNo", label: "Purchase Invoice", value: (row) => row.originalInvoiceNo || "—" }, { key: "supplierName", label: "Supplier" }, { key: "productName", label: "Item" }, { key: "quantity", label: "Quantity", value: (row) => row.quantity }, { key: "value", label: "Value", value: (row) => row.quantity * row.rate, render: (row) => money(row.quantity * row.rate) }, { key: "reason", label: "Reason" }]}/></Panel>;
}
function FuelRateManager({ data, commit, openPrint }) {
    const [form, setForm] = useState({ date: today(), fuelType: "petrol", rate: "", notes: "" });
    const submit = (event) => {
        event.preventDefault();
        const rate = toNum(form.rate);
        if (!transactionDateIsAllowed(form.date) || !positiveAmount(rate, "Fuel rate"))
            return;
        const record = { id: uid(), date: form.date, fuelType: form.fuelType, rate, notes: form.notes };
        commit("Petrol Pump", "Update fuel sale rate", `${titleCase(record.fuelType)}: ${money(record.rate)}/L`, (current) => ({ ...current, fuelRates: [record, ...current.fuelRates] }));
        setForm({ ...form, rate: "", notes: "" });
    };
    return <Panel title="Fuel Rate History" actions={<button className="secondary-btn" onClick={() => openPrint({ title: "Fuel Rate History Report", subtitle: `Generated ${today()}`, columns: ["Date", "Fuel Type", "Rate / Litre", "Notes"], rows: data.fuelRates.map((item) => [item.date, titleCase(item.fuelType), money(item.rate), item.notes || "—"]) })}>Print Rate Report</button>}><form className="form-grid wide" onSubmit={submit}><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required/><select value={form.fuelType} onChange={(event) => setForm({ ...form, fuelType: event.target.value })}><option value="petrol">Petrol</option><option value="diesel">Diesel</option></select><input type="number" min="0" step="0.01" placeholder="New sale rate / litre" value={form.rate} onChange={(event) => setForm({ ...form, rate: event.target.value })} required/><input placeholder="Reason / notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })}/><button>Save Rate</button></form><DataTable rows={data.fuelRates} columns={[{ key: "date", label: "Effective Date" }, { key: "fuelType", label: "Fuel", render: (row) => titleCase(row.fuelType) }, { key: "rate", label: "Sale Rate / L", value: (row) => row.rate, render: (row) => money(row.rate) }, { key: "notes", label: "Notes" }]}/></Panel>;
}
function FeedUnitPanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint, metrics }) {
    const [section, setSection] = useState("dashboard");
    const [partnerForm, setPartnerForm] = useState({ name: "", phone: "", sharePercent: "" });
    const [investmentForm, setInvestmentForm] = useState({ date: today(), partnerId: data.partners[0]?.id || "", type: "investment", amount: "", notes: "" });
    const [materialForm, setMaterialForm] = useState({ name: "", unit: "kg", openingStock: "", reorderLevel: "", averageRate: "" });
    const [purchaseForm, setPurchaseForm] = useState({ date: today(), invoiceNo: `PUR-F-${Date.now().toString().slice(-5)}`, supplierId: data.suppliers.find((item) => item.business === "feed")?.id || "", materialId: data.rawMaterials[0]?.id || "", quantity: "", rate: "", paymentType: "cash", paidAmount: "" });
    const [formulaForm, setFormulaForm] = useState({ name: "", outputKg: "1000", material1: data.rawMaterials[0]?.id || "", qty1: "", material2: data.rawMaterials[1]?.id || data.rawMaterials[0]?.id || "", qty2: "", notes: "" });
    const [productionForm, setProductionForm] = useState({ date: today(), manufacturingDate: today(), expiryDate: "", batchNo: `BATCH-${today().replaceAll("-", "")}-${String(data.productionBatches.length + 1).padStart(2, "0")}`, formulaId: data.feedFormulas[0]?.id || "", outputKg: "1000", bagSize: "40", productName: "Dairy Gold Feed", saleRate: "5200", productionExpense: "0", status: "completed", notes: "" });
    const [saleForm, setSaleForm] = useState({ date: today(), invoiceNo: `INV-F-${1000 + data.sales.filter((item) => item.business === "feed").length + 1}`, customerId: data.customers.find((item) => item.business === "feed")?.id || "", productId: data.bagInventory[0]?.id || "", batchNo: data.productionBatches.find((item) => item.status !== "in_progress")?.batchNo || "", quantity: "", rate: String(data.bagInventory[0]?.saleRate || ""), paymentType: "cash", paidAmount: "", dueDate: dateOffset(7), remarks: "" });
    const tabs = [["dashboard", "Dashboard"], ["partners", "Partner Management"], ["investment", "Investment Management"], ["investment-history", "Investment History"], ["suppliers", "Supplier Management"], ["supplier-ledger", "Supplier Ledger"], ["purchases", "Purchase Management"], ["purchase-return", "Purchase Return"], ["raw-inventory", "Raw Material Inventory"], ["production", "Feed Production"], ["batches", "Batch Production"], ["formula", "Feed Formula"], ["production-cost", "Production Cost"], ["finished-goods", "Finished Goods"], ["finished-bags", "Finished Feed Bags"], ["bag-inventory", "Bag Inventory"], ["bag-sales", "Bag Sales"], ["customers", "Customers"], ["customer-ledger", "Customer Ledger"], ["expenses", "Expenses"], ["staff", "Staff"], ["salary", "Salary"], ["reports", "Reports"], ["settings", "Settings"]];
    const addPartner = (event) => {
        event.preventDefault();
        const share = toNum(partnerForm.sharePercent);
        if (!positiveAmount(share, "Partner share") || share > 100)
            return;
        const assigned = data.partners.filter((item) => item.status === "active").reduce((sum, item) => sum + item.sharePercent, 0);
        if (assigned + share > 100) {
            window.alert(`Total active partner share cannot exceed 100%. Currently assigned: ${fmt(assigned)}%.`);
            return;
        }
        const record = { id: uid(), name: partnerForm.name.trim(), phone: partnerForm.phone.trim(), sharePercent: share, status: "active" };
        commit("Feed Unit", "Add partner", record.name, (current) => ({ ...current, partners: [record, ...current.partners] }));
        setPartnerForm({ name: "", phone: "", sharePercent: "" });
    };
    const addInvestment = (event) => {
        event.preventDefault();
        const amount = toNum(investmentForm.amount);
        if (!transactionDateIsAllowed(investmentForm.date) || !positiveAmount(amount, "Investment amount"))
            return;
        const partner = data.partners.find((item) => item.id === investmentForm.partnerId);
        if (!partner)
            return;
        const remaining = data.investments.filter((item) => item.partnerId === partner.id).reduce((sum, item) => sum + (item.type === "investment" ? item.amount : -item.amount), 0);
        if (investmentForm.type === "withdrawal" && amount > remaining && !isAdmin) {
            window.alert(`Withdrawal exceeds remaining investment of ${money(remaining)}. Admin override is required.`);
            return;
        }
        const record = { id: uid(), date: investmentForm.date, partnerId: partner.id, type: investmentForm.type, amount, notes: investmentForm.notes };
        commit("Feed Unit", `Add ${record.type}`, `${partner.name}: ${money(record.amount)}`, (current) => {
            let next = { ...current, investments: [record, ...current.investments] };
            next = addCashEntry(next, { date: record.date, type: record.type === "investment" ? "received" : "paid", business: "feed", category: "Partner Capital", reference: record.id, description: `${partner.name} ${record.type}`, amount: record.amount });
            return next;
        });
        openPrint({ title: record.type === "investment" ? "Partner Investment Receipt" : "Partner Withdrawal Receipt", subtitle: record.id, fields: [["Date", record.date], ["Partner", partner.name], ["Transaction", titleCase(record.type)], ["Amount", money(record.amount)], ["Previous Remaining Investment", money(remaining)], ["New Remaining Investment", money(remaining + (record.type === "investment" ? record.amount : -record.amount))], ["Notes", record.notes || "—"]] });
        setInvestmentForm({ ...investmentForm, amount: "", notes: "" });
    };
    const addMaterial = (event) => {
        event.preventDefault();
        const record = { id: uid(), name: materialForm.name, unit: materialForm.unit, stock: toNum(materialForm.openingStock), reorderLevel: toNum(materialForm.reorderLevel), averageRate: toNum(materialForm.averageRate) };
        commit("Feed Unit", "Add raw material", record.name, (current) => ({ ...current, rawMaterials: [record, ...current.rawMaterials] }));
        setMaterialForm({ name: "", unit: "kg", openingStock: "", reorderLevel: "", averageRate: "" });
    };
    const addPurchase = (event) => {
        event.preventDefault();
        const record = { id: uid(), date: purchaseForm.date, invoiceNo: purchaseForm.invoiceNo, supplierId: purchaseForm.supplierId, materialId: purchaseForm.materialId, quantity: toNum(purchaseForm.quantity), rate: toNum(purchaseForm.rate), paymentType: purchaseForm.paymentType, paidAmount: purchaseForm.paymentType === "cash" ? toNum(purchaseForm.quantity) * toNum(purchaseForm.rate) : toNum(purchaseForm.paidAmount) };
        const material = data.rawMaterials.find((item) => item.id === record.materialId);
        commit("Feed Unit", "Add raw material purchase", `${material?.name || "Material"}: ${fmt(record.quantity)} kg`, (current) => {
            const materials = current.rawMaterials.map((item) => {
                if (item.id !== record.materialId)
                    return item;
                const oldValue = item.stock * item.averageRate;
                const newStock = item.stock + record.quantity;
                return { ...item, stock: newStock, averageRate: newStock ? (oldValue + record.quantity * record.rate) / newStock : record.rate };
            });
            let next = { ...current, rawMaterials: materials, rawMaterialPurchases: [record, ...current.rawMaterialPurchases] };
            if (record.paidAmount > 0)
                next = addCashEntry(next, { date: record.date, type: "paid", business: "feed", category: "Raw Material Purchase", reference: record.invoiceNo, description: material?.name || "Raw material", amount: record.paidAmount });
            return next;
        });
        setPurchaseForm({ ...purchaseForm, invoiceNo: `PUR-F-${Date.now().toString().slice(-5)}`, quantity: "", rate: "", paidAmount: "" });
    };
    const addFormula = (event) => {
        event.preventDefault();
        const ingredients = [{ materialId: formulaForm.material1, quantity: toNum(formulaForm.qty1) }, { materialId: formulaForm.material2, quantity: toNum(formulaForm.qty2) }].filter((item) => item.materialId && item.quantity > 0);
        const record = { id: uid(), name: formulaForm.name, outputKg: toNum(formulaForm.outputKg), ingredients, notes: formulaForm.notes };
        commit("Feed Unit", "Add feed formula", record.name, (current) => ({ ...current, feedFormulas: [record, ...current.feedFormulas] }));
        setFormulaForm({ ...formulaForm, name: "", qty1: "", qty2: "", notes: "" });
    };
    const addFinishedBatchInventory = (current, record) => {
        const existingFinished = current.finishedGoods.find((item) => item.name === "Finished Feed");
        const finishedGoods = existingFinished ? current.finishedGoods.map((item) => item.id === existingFinished.id ? { ...item, stockKg: item.stockKg + record.outputKg, averageCost: record.productionCost / Math.max(record.outputKg, 1) } : item) : [{ id: uid(), name: "Finished Feed", stockKg: record.outputKg, averageCost: record.productionCost / Math.max(record.outputKg, 1) }, ...current.finishedGoods];
        const name = record.productName || "Finished Feed";
        const existingBag = current.bagInventory.find((item) => item.productName === name && item.bagSize === record.bagSize);
        const bagInventory = existingBag ? current.bagInventory.map((item) => item.id === existingBag.id ? { ...item, quantity: item.quantity + record.bagsProduced, costRate: record.productionCost / Math.max(record.bagsProduced, 1), saleRate: record.saleRate || item.saleRate } : item) : [{ id: uid(), productName: name, bagSize: record.bagSize, quantity: record.bagsProduced, reorderLevel: 10, saleRate: record.saleRate || 0, costRate: record.productionCost / Math.max(record.bagsProduced, 1) }, ...current.bagInventory];
        return { finishedGoods, bagInventory };
    };
    const produceFeed = (event) => {
        event.preventDefault();
        const formula = data.feedFormulas.find((item) => item.id === productionForm.formulaId);
        if (!formula || !transactionDateIsAllowed(productionForm.date) || !transactionDateIsAllowed(productionForm.manufacturingDate))
            return;
        if (data.productionBatches.some((item) => item.batchNo.toLowerCase() === productionForm.batchNo.trim().toLowerCase())) {
            window.alert("Batch number must be unique.");
            return;
        }
        if (productionForm.expiryDate && productionForm.expiryDate <= productionForm.manufacturingDate) {
            window.alert("Expiry date must be later than manufacturing date.");
            return;
        }
        const outputKg = toNum(productionForm.outputKg);
        const bagSize = toNum(productionForm.bagSize);
        if (!positiveAmount(outputKg, "Output quantity") || !positiveAmount(bagSize, "Bag size"))
            return;
        const scale = outputKg / formula.outputKg;
        const consumption = formula.ingredients.map((ingredient) => ({ ...ingredient, quantity: ingredient.quantity * scale }));
        const shortages = consumption.filter((ingredient) => (data.rawMaterials.find((item) => item.id === ingredient.materialId)?.stock || 0) < ingredient.quantity);
        if (shortages.length) {
            window.alert(`Insufficient stock: ${shortages.map((item) => data.rawMaterials.find((material) => material.id === item.materialId)?.name).join(", ")}`);
            return;
        }
        const bagsProduced = Math.floor(outputKg / bagSize);
        const rawCost = consumption.reduce((sum, ingredient) => { const material = data.rawMaterials.find((item) => item.id === ingredient.materialId); return sum + ingredient.quantity * (material?.averageRate || 0); }, 0);
        const productionCost = rawCost + Math.max(toNum(productionForm.productionExpense), 0);
        const record = { id: uid(), date: productionForm.date, manufacturingDate: productionForm.manufacturingDate, expiryDate: productionForm.expiryDate || undefined, batchNo: productionForm.batchNo.trim(), formulaId: formula.id, outputKg, bagSize, bagsProduced, productionCost, status: productionForm.status, consumption, productName: productionForm.productName, saleRate: toNum(productionForm.saleRate), notes: productionForm.notes };
        commit("Feed Unit", record.status === "completed" ? "Complete production batch" : "Start production batch", `${record.batchNo}: ${fmt(outputKg)} kg`, (current) => {
            const rawMaterials = current.rawMaterials.map((material) => { const ingredient = consumption.find((item) => item.materialId === material.id); return ingredient ? { ...material, stock: material.stock - ingredient.quantity } : material; });
            const base = { ...current, rawMaterials, productionBatches: [record, ...current.productionBatches] };
            if (record.status !== "completed")
                return base;
            const inventory = addFinishedBatchInventory(base, record);
            return { ...base, ...inventory };
        });
        setProductionForm({ ...productionForm, date: today(), manufacturingDate: today(), expiryDate: "", batchNo: `BATCH-${today().replaceAll("-", "")}-${String(data.productionBatches.length + 2).padStart(2, "0")}`, productionExpense: "0", status: "completed", notes: "" });
    };
    const completeExistingBatch = (batch) => {
        if (batch.status === "completed")
            return;
        commit("Feed Unit", "Complete production batch", batch.batchNo, (current) => {
            const currentBatch = current.productionBatches.find((item) => item.id === batch.id);
            if (!currentBatch || currentBatch.status === "completed")
                return current;
            const completed = { ...currentBatch, status: "completed" };
            const inventory = addFinishedBatchInventory(current, completed);
            return { ...current, ...inventory, productionBatches: current.productionBatches.map((item) => item.id === batch.id ? completed : item) };
        });
    };
    const addBagSale = (event) => {
        event.preventDefault();
        const bag = data.bagInventory.find((item) => item.id === saleForm.productId);
        if (!bag)
            return;
        const quantity = toNum(saleForm.quantity);
        if (quantity > bag.quantity) {
            window.alert(`Only ${bag.quantity} bags are available.`);
            return;
        }
        const customer = data.customers.find((item) => item.id === saleForm.customerId);
        const total = quantity * toNum(saleForm.rate);
        const paidAmount = saleForm.paymentType === "cash" ? total : Math.min(toNum(saleForm.paidAmount), total);
        const record = { id: uid(), date: saleForm.date, business: "feed", invoiceNo: saleForm.invoiceNo, customerId: saleForm.customerId, customerName: customer?.name || "Walk-in Customer", productId: bag.id, productName: `${bag.productName} ${bag.bagSize} KG`, quantity, unit: "bags", rate: toNum(saleForm.rate), total, paidAmount, paymentType: saleForm.paymentType, dueDate: saleForm.paymentType === "cash" ? "" : saleForm.dueDate, remarks: saleForm.remarks, batchNo: saleForm.batchNo || undefined, costRate: bag.costRate };
        commit("Feed Unit", "Add bag sale", `${record.invoiceNo}: ${money(record.total)}`, (current) => {
            let next = { ...current, sales: [record, ...current.sales], bagInventory: current.bagInventory.map((item) => item.id === bag.id ? { ...item, quantity: item.quantity - quantity } : item), finishedGoods: current.finishedGoods.map((item) => item.name === "Finished Feed" ? { ...item, stockKg: Math.max(item.stockKg - quantity * bag.bagSize, 0) } : item) };
            if (paidAmount > 0)
                next = addCashEntry(next, { date: record.date, type: "received", business: "feed", category: "Bag Sales", reference: record.invoiceNo, description: `${record.customerName} - ${record.productName}`, amount: paidAmount });
            return next;
        });
        openPrint({ title: "Feed Sale Invoice", subtitle: record.invoiceNo, fields: [["Date", record.date], ["Customer", record.customerName], ["Product", record.productName], ["Quantity", `${fmt(record.quantity)} bags`], ["Rate", money(record.rate)], ["Total", money(record.total)], ["Paid", money(record.paidAmount)], ["Balance", money(record.total - record.paidAmount)], ["Payment", titleCase(record.paymentType)]], footer: "Thank you for your business." });
        setSaleForm({ ...saleForm, invoiceNo: `INV-F-${1001 + data.sales.filter((item) => item.business === "feed").length + 1}`, quantity: "", paidAmount: "", remarks: "" });
    };
    const investmentRows = data.investments.map((item) => ({ ...item, partnerName: data.partners.find((partner) => partner.id === item.partnerId)?.name || "Unknown" }));
    const partnerInvestmentSummary = data.partners.map((partner) => { const history = data.investments.filter((item) => item.partnerId === partner.id); const invested = history.filter((item) => item.type === "investment").reduce((sum, item) => sum + item.amount, 0); const withdrawn = history.filter((item) => item.type === "withdrawal").reduce((sum, item) => sum + item.amount, 0); const profitShare = data.profitDistributions.filter((item) => item.partnerId === partner.id).reduce((sum, item) => sum + item.shareAmount, 0); return { ...partner, invested, withdrawn, remaining: invested - withdrawn, profitShare }; });
    const feedSales = data.sales.filter((item) => item.business === "feed");
    return <div className="screen-stack"><InlineNotice>Version 2 workflow: Raw Material Purchase → Inventory → Feed Formula → Production Batch → Finished Feed → Feed Bags → Inventory → Sales. Completing production automatically increases finished goods and bag stock.</InlineNotice><ModuleTabs items={tabs} active={section} onChange={(key) => setSection(key)}/>
    {section === "partners" ? <Panel title="Partner Management"><form className="form-grid wide" onSubmit={addPartner}><input placeholder="Partner name" value={partnerForm.name} onChange={(event) => setPartnerForm({ ...partnerForm, name: event.target.value })} required/><input placeholder="Phone" value={partnerForm.phone} onChange={(event) => setPartnerForm({ ...partnerForm, phone: event.target.value })}/><input type="number" min="0" max="100" placeholder="Share %" value={partnerForm.sharePercent} onChange={(event) => setPartnerForm({ ...partnerForm, sharePercent: event.target.value })} required/><button>Add Partner</button></form><DataTable rows={data.partners} columns={[{ key: "name", label: "Partner" }, { key: "phone", label: "Phone" }, { key: "sharePercent", label: "Share", value: (row) => row.sharePercent, render: (row) => `${fmt(row.sharePercent)}%` }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("partners", row.id, "Feed Unit", "partner")}>Delete</button> : <span className="muted-text">View only</span> }]}/></Panel> : null}
    {section === "investment" ? <Panel title="Investment Management"><form className="form-grid wide" onSubmit={addInvestment}><input type="date" value={investmentForm.date} onChange={(event) => setInvestmentForm({ ...investmentForm, date: event.target.value })}/><select value={investmentForm.partnerId} onChange={(event) => setInvestmentForm({ ...investmentForm, partnerId: event.target.value })}>{data.partners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={investmentForm.type} onChange={(event) => setInvestmentForm({ ...investmentForm, type: event.target.value })}><option value="investment">Investment</option><option value="withdrawal">Withdrawal</option></select><input type="number" min="0" placeholder="Amount" value={investmentForm.amount} onChange={(event) => setInvestmentForm({ ...investmentForm, amount: event.target.value })} required/><input placeholder="Notes" value={investmentForm.notes} onChange={(event) => setInvestmentForm({ ...investmentForm, notes: event.target.value })}/><button>Save Investment</button></form><div className="stats-grid compact"><StatCard label="Total Investment" value={money(data.investments.filter((item) => item.type === "investment").reduce((sum, item) => sum + item.amount, 0))}/><StatCard label="Withdrawals" value={money(data.investments.filter((item) => item.type === "withdrawal").reduce((sum, item) => sum + item.amount, 0))}/><StatCard label="Net Capital" value={money(data.investments.reduce((sum, item) => sum + (item.type === "investment" ? item.amount : -item.amount), 0))}/><StatCard label="Partners" value={fmt(data.partners.length)}/></div></Panel> : null}
    {section === "investment-history" ? <div className="screen-stack"><Panel title="Partner Investment Summary"><DataTable rows={partnerInvestmentSummary} columns={[{ key: "name", label: "Partner" }, { key: "sharePercent", label: "Profit Share", value: (row) => row.sharePercent, render: (row) => `${fmt(row.sharePercent)}%` }, { key: "invested", label: "Invested", value: (row) => row.invested, render: (row) => money(row.invested) }, { key: "withdrawn", label: "Withdrawn", value: (row) => row.withdrawn, render: (row) => money(row.withdrawn) }, { key: "remaining", label: "Remaining Investment", value: (row) => row.remaining, render: (row) => money(row.remaining) }, { key: "profitShare", label: "Distributed Profit", value: (row) => row.profitShare, render: (row) => money(row.profitShare) }]}/></Panel><Panel title="Investment History"><DataTable rows={investmentRows} columns={[{ key: "date", label: "Date" }, { key: "partnerName", label: "Partner" }, { key: "type", label: "Type", render: (row) => titleCase(row.type) }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "notes", label: "Notes" }, { key: "actions", label: "Actions", render: (row) => <div className="row-actions"><button className="secondary-btn mini" onClick={() => openPrint({ title: row.type === "investment" ? "Partner Investment Receipt" : "Partner Withdrawal Receipt", subtitle: row.id, fields: [["Date", row.date], ["Partner", row.partnerName], ["Transaction", titleCase(row.type)], ["Amount", money(row.amount)], ["Notes", row.notes || "—"]] })}>Print</button>{isAdmin ? <button className="text-danger" onClick={() => deleteRecord("investments", row.id, "Feed Unit", "investment")}>Delete</button> : null}</div> }]}/></Panel><Panel title="Profit Sharing History"><DataTable rows={data.profitDistributions} columns={[{ key: "month", label: "Month" }, { key: "partnerId", label: "Partner", value: (row) => data.partners.find((item) => item.id === row.partnerId)?.name || "Unknown" }, { key: "profitAmount", label: "Locked Profit", value: (row) => row.profitAmount, render: (row) => money(row.profitAmount) }, { key: "sharePercent", label: "Share %", value: (row) => row.sharePercent, render: (row) => `${fmt(row.sharePercent)}%` }, { key: "shareAmount", label: "Share Amount", value: (row) => row.shareAmount, render: (row) => money(row.shareAmount) }]}/></Panel></div> : null}
    {section === "suppliers" ? <ContactManager type="supplier" business="feed" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin}/> : null}
    {section === "supplier-ledger" ? <SupplierLedgerManager business="feed" data={data} commit={commit} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint}/> : null}
    {section === "purchases" ? <Panel title="Raw Material Purchase"><form className="form-grid wide" onSubmit={addPurchase}><input type="date" value={purchaseForm.date} onChange={(event) => setPurchaseForm({ ...purchaseForm, date: event.target.value })}/><input placeholder="Invoice no" value={purchaseForm.invoiceNo} onChange={(event) => setPurchaseForm({ ...purchaseForm, invoiceNo: event.target.value })}/><select value={purchaseForm.supplierId} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplierId: event.target.value })}>{data.suppliers.filter((item) => item.business === "feed").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={purchaseForm.materialId} onChange={(event) => setPurchaseForm({ ...purchaseForm, materialId: event.target.value })}>{data.rawMaterials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="0" placeholder="Quantity" value={purchaseForm.quantity} onChange={(event) => setPurchaseForm({ ...purchaseForm, quantity: event.target.value })} required/><input type="number" min="0" placeholder="Rate" value={purchaseForm.rate} onChange={(event) => setPurchaseForm({ ...purchaseForm, rate: event.target.value })} required/><select value={purchaseForm.paymentType} onChange={(event) => setPurchaseForm({ ...purchaseForm, paymentType: event.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{purchaseForm.paymentType === "credit" ? <input type="number" min="0" placeholder="Paid amount" value={purchaseForm.paidAmount} onChange={(event) => setPurchaseForm({ ...purchaseForm, paidAmount: event.target.value })}/> : null}<button>Add Purchase</button></form><DataTable rows={data.rawMaterialPurchases} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "materialId", label: "Material", value: (row) => data.rawMaterials.find((item) => item.id === row.materialId)?.name || "Unknown" }, { key: "quantity", label: "Quantity", value: (row) => row.quantity, render: (row) => fmt(row.quantity) }, { key: "rate", label: "Rate", value: (row) => row.rate, render: (row) => money(row.rate) }, { key: "total", label: "Total", value: (row) => row.quantity * row.rate, render: (row) => money(row.quantity * row.rate) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }]}/></Panel> : null}
    {section === "purchase-return" ? <PurchaseReturnManager business="feed" data={data} commit={commit} openPrint={openPrint}/> : null}
    {section === "raw-inventory" ? <Panel title="Raw Material Inventory"><form className="form-grid wide" onSubmit={addMaterial}><input placeholder="Material name" value={materialForm.name} onChange={(event) => setMaterialForm({ ...materialForm, name: event.target.value })} required/><input placeholder="Unit" value={materialForm.unit} onChange={(event) => setMaterialForm({ ...materialForm, unit: event.target.value })}/><input type="number" min="0" placeholder="Opening stock" value={materialForm.openingStock} onChange={(event) => setMaterialForm({ ...materialForm, openingStock: event.target.value })}/><input type="number" min="0" placeholder="Reorder level" value={materialForm.reorderLevel} onChange={(event) => setMaterialForm({ ...materialForm, reorderLevel: event.target.value })}/><input type="number" min="0" placeholder="Average rate" value={materialForm.averageRate} onChange={(event) => setMaterialForm({ ...materialForm, averageRate: event.target.value })}/><button>Add Material</button></form><DataTable rows={data.rawMaterials} columns={[{ key: "name", label: "Material" }, { key: "unit", label: "Unit" }, { key: "stock", label: "Stock", value: (row) => row.stock, render: (row) => `${fmt(row.stock)} ${row.unit}` }, { key: "reorderLevel", label: "Reorder At", value: (row) => row.reorderLevel, render: (row) => `${fmt(row.reorderLevel)} ${row.unit}` }, { key: "averageRate", label: "Avg Rate", value: (row) => row.averageRate, render: (row) => money(row.averageRate) }, { key: "value", label: "Stock Value", value: (row) => row.stock * row.averageRate, render: (row) => money(row.stock * row.averageRate) }, { key: "status", label: "Status", value: (row) => row.stock <= row.reorderLevel ? "Low Stock" : "Available", render: (row) => <span className={`status-badge ${row.stock <= row.reorderLevel ? "danger" : "success"}`}>{row.stock <= row.reorderLevel ? "Low Stock" : "Available"}</span> }]}/></Panel> : null}
    {section === "production" ? <><Workflow steps={["Raw Material Purchase", "Inventory", "Feed Formula", "Production Batch", "Raw Material Consumed", "Finished Feed", "Feed Bags", "Sales"]}/><Panel title="Feed Production"><form className="form-grid wide" onSubmit={produceFeed}><input type="date" value={productionForm.date} onChange={(event) => setProductionForm({ ...productionForm, date: event.target.value })} required/><input type="date" value={productionForm.manufacturingDate} onChange={(event) => setProductionForm({ ...productionForm, manufacturingDate: event.target.value })} title="Manufacturing date" required/><input type="date" value={productionForm.expiryDate} onChange={(event) => setProductionForm({ ...productionForm, expiryDate: event.target.value })} title="Optional expiry date"/><input placeholder="Unique batch number" value={productionForm.batchNo} onChange={(event) => setProductionForm({ ...productionForm, batchNo: event.target.value })} required/><select value={productionForm.formulaId} onChange={(event) => setProductionForm({ ...productionForm, formulaId: event.target.value })}>{data.feedFormulas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="1" placeholder="Output KG" value={productionForm.outputKg} onChange={(event) => setProductionForm({ ...productionForm, outputKg: event.target.value })} required/><select value={productionForm.bagSize} onChange={(event) => setProductionForm({ ...productionForm, bagSize: event.target.value })}><option value="10">10 KG</option><option value="20">20 KG</option><option value="40">40 KG</option><option value="50">50 KG</option></select><input placeholder="Bag product name" value={productionForm.productName} onChange={(event) => setProductionForm({ ...productionForm, productName: event.target.value })} required/><input type="number" min="0" placeholder="Sale rate / bag" value={productionForm.saleRate} onChange={(event) => setProductionForm({ ...productionForm, saleRate: event.target.value })}/><input type="number" min="0" placeholder="Production expense" value={productionForm.productionExpense} onChange={(event) => setProductionForm({ ...productionForm, productionExpense: event.target.value })}/><select value={productionForm.status} onChange={(event) => setProductionForm({ ...productionForm, status: event.target.value })}><option value="completed">Complete Now</option><option value="in_progress">Start In Progress</option></select><input placeholder="Notes" value={productionForm.notes} onChange={(event) => setProductionForm({ ...productionForm, notes: event.target.value })}/><button>{productionForm.status === "completed" ? "Complete Production" : "Start Batch"}</button></form><InlineNotice tone="success">Starting a batch deducts the exact formula consumption from raw material inventory. Finished feed and bag stock increase only when the batch is completed.</InlineNotice></Panel></> : null}
    {section === "batches" ? <Panel title="Batch Production & Traceability"><DataTable rows={data.productionBatches} columns={[{ key: "date", label: "Entry Date" }, { key: "batchNo", label: "Batch" }, { key: "manufacturingDate", label: "Manufacturing", value: (row) => row.manufacturingDate || row.date }, { key: "expiryDate", label: "Expiry", value: (row) => row.expiryDate || "—" }, { key: "formulaId", label: "Formula", value: (row) => data.feedFormulas.find((item) => item.id === row.formulaId)?.name || "Unknown" }, { key: "outputKg", label: "Output", value: (row) => row.outputKg, render: (row) => `${fmt(row.outputKg)} kg` }, { key: "bagsProduced", label: "Bags", value: (row) => row.bagsProduced }, { key: "productionCost", label: "Cost", value: (row) => row.productionCost, render: (row) => money(row.productionCost) }, { key: "status", label: "Status", value: (row) => row.status || "completed", render: (row) => <span className={`status-badge ${row.status === "in_progress" ? "warning" : "success"}`}>{titleCase(row.status || "completed")}</span> }, { key: "consumption", label: "Raw Consumption", value: (row) => (row.consumption || []).map((item) => `${data.rawMaterials.find((material) => material.id === item.materialId)?.name || "Material"}: ${fmt(item.quantity)} kg`).join("; ") || "Legacy batch" }, { key: "actions", label: "Action", render: (row) => row.status === "in_progress" ? <button className="primary-btn mini" onClick={() => completeExistingBatch(row)}>Complete Batch</button> : <button className="secondary-btn mini" onClick={() => openPrint({ title: "Production Batch Traceability", subtitle: row.batchNo, fields: [["Manufacturing Date", row.manufacturingDate || row.date], ["Expiry Date", row.expiryDate || "Not set"], ["Formula", data.feedFormulas.find((item) => item.id === row.formulaId)?.name || "Unknown"], ["Output", `${fmt(row.outputKg)} KG`], ["Finished Bags", String(row.bagsProduced)], ["Production Cost", money(row.productionCost)], ["Status", titleCase(row.status || "completed")]], columns: ["Raw Material", "Quantity Consumed"], rows: (row.consumption || []).map((item) => [data.rawMaterials.find((material) => material.id === item.materialId)?.name || "Unknown", `${fmt(item.quantity)} kg`]) })}>Trace</button> }]}/></Panel> : null}
    {section === "formula" ? <Panel title="Feed Formula"><form className="form-grid wide" onSubmit={addFormula}><input placeholder="Formula name" value={formulaForm.name} onChange={(event) => setFormulaForm({ ...formulaForm, name: event.target.value })} required/><input type="number" min="1" placeholder="Standard output KG" value={formulaForm.outputKg} onChange={(event) => setFormulaForm({ ...formulaForm, outputKg: event.target.value })}/><select value={formulaForm.material1} onChange={(event) => setFormulaForm({ ...formulaForm, material1: event.target.value })}>{data.rawMaterials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="0" placeholder="Material 1 KG" value={formulaForm.qty1} onChange={(event) => setFormulaForm({ ...formulaForm, qty1: event.target.value })}/><select value={formulaForm.material2} onChange={(event) => setFormulaForm({ ...formulaForm, material2: event.target.value })}>{data.rawMaterials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="0" placeholder="Material 2 KG" value={formulaForm.qty2} onChange={(event) => setFormulaForm({ ...formulaForm, qty2: event.target.value })}/><input placeholder="Notes" value={formulaForm.notes} onChange={(event) => setFormulaForm({ ...formulaForm, notes: event.target.value })}/><button>Add Formula</button></form><DataTable rows={data.feedFormulas} columns={[{ key: "name", label: "Formula" }, { key: "outputKg", label: "Output", value: (row) => row.outputKg, render: (row) => `${fmt(row.outputKg)} kg` }, { key: "ingredients", label: "Ingredients", value: (row) => row.ingredients.map((item) => data.rawMaterials.find((material) => material.id === item.materialId)?.name || "").join(" "), render: (row) => row.ingredients.map((ingredient) => `${data.rawMaterials.find((item) => item.id === ingredient.materialId)?.name || "Unknown"}: ${fmt(ingredient.quantity)} kg`).join(" · ") }, { key: "notes", label: "Notes" }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("feedFormulas", row.id, "Feed Unit", "formula")}>Delete</button> : <span className="muted-text">View only</span> }]}/></Panel> : null}
    {section === "production-cost" ? <Panel title="Production Cost"><DataTable rows={data.productionBatches} columns={[{ key: "batchNo", label: "Batch" }, { key: "date", label: "Date" }, { key: "outputKg", label: "Output", value: (row) => row.outputKg, render: (row) => `${fmt(row.outputKg)} kg` }, { key: "productionCost", label: "Total Cost", value: (row) => row.productionCost, render: (row) => money(row.productionCost) }, { key: "costPerKg", label: "Cost / KG", value: (row) => row.productionCost / row.outputKg, render: (row) => money(row.productionCost / row.outputKg) }, { key: "bagCost", label: "Cost / Bag", value: (row) => row.productionCost / row.bagsProduced, render: (row) => money(row.productionCost / Math.max(row.bagsProduced, 1)) }]}/></Panel> : null}
    {section === "finished-goods" ? <Panel title="Finished Goods"><DataTable rows={data.finishedGoods} columns={[{ key: "name", label: "Finished Good" }, { key: "stockKg", label: "Stock", value: (row) => row.stockKg, render: (row) => `${fmt(row.stockKg)} kg` }, { key: "averageCost", label: "Average Cost / KG", value: (row) => row.averageCost, render: (row) => money(row.averageCost) }, { key: "stockValue", label: "Stock Value", value: (row) => row.stockKg * row.averageCost, render: (row) => money(row.stockKg * row.averageCost) }]}/></Panel> : null}
    {section === "finished-bags" || section === "bag-inventory" ? <Panel title={section === "finished-bags" ? "Finished Feed Bags" : "Bag Inventory"}><DataTable rows={data.bagInventory} columns={[{ key: "productName", label: "Product" }, { key: "bagSize", label: "Bag Size", value: (row) => row.bagSize, render: (row) => `${fmt(row.bagSize)} KG` }, { key: "quantity", label: "Bags in Stock", value: (row) => row.quantity }, { key: "reorderLevel", label: "Reorder At", value: (row) => row.reorderLevel }, { key: "costRate", label: "Cost / Bag", value: (row) => row.costRate, render: (row) => money(row.costRate) }, { key: "saleRate", label: "Sale Rate", value: (row) => row.saleRate, render: (row) => money(row.saleRate) }, { key: "status", label: "Status", value: (row) => row.quantity <= row.reorderLevel ? "Low Stock" : "Available", render: (row) => <span className={`status-badge ${row.quantity <= row.reorderLevel ? "danger" : "success"}`}>{row.quantity <= row.reorderLevel ? "Low Stock" : "Available"}</span> }]}/></Panel> : null}
    {section === "bag-sales" ? <Panel title="Bag Sales"><form className="form-grid wide" onSubmit={addBagSale}><input type="date" value={saleForm.date} onChange={(event) => setSaleForm({ ...saleForm, date: event.target.value })}/><input placeholder="Invoice no" value={saleForm.invoiceNo} onChange={(event) => setSaleForm({ ...saleForm, invoiceNo: event.target.value })}/><select value={saleForm.customerId} onChange={(event) => setSaleForm({ ...saleForm, customerId: event.target.value })}>{data.customers.filter((item) => item.business === "feed").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={saleForm.productId} onChange={(event) => { const bag = data.bagInventory.find((item) => item.id === event.target.value); setSaleForm({ ...saleForm, productId: event.target.value, rate: String(bag?.saleRate || "") }); }}>{data.bagInventory.map((item) => <option key={item.id} value={item.id}>{item.productName} {item.bagSize} KG ({item.quantity} available)</option>)}</select><select value={saleForm.batchNo} onChange={(event) => setSaleForm({ ...saleForm, batchNo: event.target.value })}><option value="">Select completed batch</option>{data.productionBatches.filter((item) => item.status !== "in_progress").map((item) => <option key={item.id} value={item.batchNo}>{item.batchNo} · {item.manufacturingDate || item.date}</option>)}</select><input type="number" min="1" placeholder="Bags" value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })} required/><input type="number" min="0" placeholder="Rate" value={saleForm.rate} onChange={(event) => setSaleForm({ ...saleForm, rate: event.target.value })} required/><select value={saleForm.paymentType} onChange={(event) => setSaleForm({ ...saleForm, paymentType: event.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{saleForm.paymentType !== "cash" ? <><input type="number" min="0" placeholder="Paid amount" value={saleForm.paidAmount} onChange={(event) => setSaleForm({ ...saleForm, paidAmount: event.target.value })}/><input type="date" value={saleForm.dueDate} onChange={(event) => setSaleForm({ ...saleForm, dueDate: event.target.value })}/></> : null}<input placeholder="Remarks" value={saleForm.remarks} onChange={(event) => setSaleForm({ ...saleForm, remarks: event.target.value })}/><button>Save & Print Invoice</button></form><DataTable rows={feedSales} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Product" }, { key: "batchNo", label: "Batch", value: (row) => row.batchNo || "—" }, { key: "quantity", label: "Bags", value: (row) => row.quantity }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "due", label: "Due", value: (row) => row.total - row.paidAmount, render: (row) => money(row.total - row.paidAmount) }, { key: "actions", label: "Print", render: (row) => <button className="secondary-btn mini" onClick={() => openPrint({ title: "Feed Sale Invoice", subtitle: row.invoiceNo, fields: [["Date", row.date], ["Customer", row.customerName], ["Product", row.productName], ["Quantity", `${row.quantity} bags`], ["Total", money(row.total)], ["Paid", money(row.paidAmount)], ["Balance", money(row.total - row.paidAmount)]] })}>Print</button> }]}/></Panel> : null}
    {section === "customers" ? <ContactManager type="customer" business="feed" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin}/> : null}
    {section === "customer-ledger" ? <CustomerLedgerManager business="feed" data={data} commit={commit} addCashEntry={addCashEntry} openPrint={openPrint}/> : null}
    {section === "expenses" ? <ExpenseManager business="feed" data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint}/> : null}
    {section === "staff" ? <BusinessStaffView business="feed" data={data}/> : null}
    {section === "salary" ? <BusinessSalaryView business="feed" data={data}/> : null}
    {section === "reports" ? <SimpleBusinessReport business="feed" data={data} openPrint={openPrint}/> : null}
    {section === "settings" ? <Panel title="Feed Unit Settings"><div className="settings-summary"><span><b>Raw materials:</b> {data.rawMaterials.length}</span><span><b>Active formulas:</b> {data.feedFormulas.length}</span><span><b>Bag products:</b> {data.bagInventory.length}</span><span><b>Low-stock products:</b> {data.bagInventory.filter((item) => item.quantity <= item.reorderLevel).length}</span></div><InlineNotice>Global opening balances, users, roles, permissions, backup and restore are available in the main Settings tab.</InlineNotice></Panel> : null}
  </div>;
}
function ChakkiPanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint, metrics }) {
    const [section, setSection] = useState("dashboard");
    const [grindingForm, setGrindingForm] = useState({ date: today(), receiptNo: `GR-${1000 + data.grindingJobs.length + 1}`, customerName: "", phone: "", weightKg: "", grindingRate: "8", paymentType: "cash", paidAmount: "", remarks: "" });
    const [productForm, setProductForm] = useState({ name: "10 KG Flour Bag", bagSize: "10", openingStock: "0", reorderLevel: "10", costRate: "", saleRate: "" });
    const [productionForm, setProductionForm] = useState({ date: today(), batchNo: `FLOUR-B-${1000 + data.flourProduction.length + 1}`, productId: data.flourProducts[0]?.id || "", bagsProduced: "", totalCost: "", notes: "" });
    const [saleForm, setSaleForm] = useState({ date: today(), invoiceNo: `INV-C-${1000 + data.sales.filter((item) => item.business === "chakki").length + 1}`, customerId: data.customers.find((item) => item.business === "chakki")?.id || "", customerName: "Walk-in Customer", productId: data.flourProducts[0]?.id || "", quantity: "", rate: String(data.flourProducts[0]?.saleRate || ""), paymentType: "cash", paidAmount: "", dueDate: dateOffset(7), remarks: "" });
    const tabs = [["dashboard", "Dashboard"], ["overview", "Two Businesses"], ["grinding", "Grinding Service"], ["flour-products", "Flour Products"], ["flour-production", "Flour Production"], ["flour-sales", "Flour Bag Sales"], ["customers", "Customers"], ["customer-ledger", "Customer Ledger"], ["expenses", "Expenses"], ["staff", "Staff"], ["salary", "Salary"], ["reports", "Reports"], ["settings", "Settings"]];
    const addGrinding = (event) => {
        event.preventDefault();
        if (!transactionDateIsAllowed(grindingForm.date) || !positiveAmount(toNum(grindingForm.weightKg), "Wheat weight") || !positiveAmount(toNum(grindingForm.grindingRate), "Grinding rate"))
            return;
        const charges = toNum(grindingForm.weightKg) * toNum(grindingForm.grindingRate);
        const paidAmount = grindingForm.paymentType === "cash" ? charges : Math.min(toNum(grindingForm.paidAmount), charges);
        const record = { id: uid(), date: grindingForm.date, receiptNo: grindingForm.receiptNo, customerName: grindingForm.customerName, phone: grindingForm.phone, weightKg: toNum(grindingForm.weightKg), grindingRate: toNum(grindingForm.grindingRate), charges, paymentType: grindingForm.paymentType, paidAmount, remarks: grindingForm.remarks };
        commit("Chakki", "Add grinding service", `${record.receiptNo}: ${money(record.charges)}`, (current) => {
            let next = { ...current, grindingJobs: [record, ...current.grindingJobs] };
            if (paidAmount > 0)
                next = addCashEntry(next, { date: record.date, type: "received", business: "chakki", category: "Grinding Income", reference: record.receiptNo, description: `${record.customerName} grinding charges`, amount: paidAmount });
            return next;
        });
        openPrint({ title: "Grinding Receipt", subtitle: record.receiptNo, fields: [["Date", record.date], ["Customer", record.customerName], ["Phone", record.phone || "—"], ["Customer Wheat", `${fmt(record.weightKg)} KG`], ["Grinding Rate", `${money(record.grindingRate)} / KG`], ["Grinding Charges", money(record.charges)], ["Paid", money(record.paidAmount)], ["Balance", money(record.charges - record.paidAmount)], ["Payment", titleCase(record.paymentType)], ["Remarks", record.remarks || "—"]], footer: "Customer wheat is processed as service material only and is not added to company inventory." });
        setGrindingForm({ ...grindingForm, receiptNo: `GR-${1001 + data.grindingJobs.length + 1}`, customerName: "", phone: "", weightKg: "", paidAmount: "", remarks: "" });
    };
    const addProduct = (event) => {
        event.preventDefault();
        const record = { id: uid(), name: productForm.name, bagSize: toNum(productForm.bagSize), stock: toNum(productForm.openingStock), reorderLevel: toNum(productForm.reorderLevel), costRate: toNum(productForm.costRate), saleRate: toNum(productForm.saleRate) };
        commit("Chakki", "Add flour product", record.name, (current) => ({ ...current, flourProducts: [record, ...current.flourProducts] }));
        setProductForm({ name: "10 KG Flour Bag", bagSize: "10", openingStock: "0", reorderLevel: "10", costRate: "", saleRate: "" });
    };
    const manufactureFlour = (event) => {
        event.preventDefault();
        const product = data.flourProducts.find((item) => item.id === productionForm.productId);
        if (!product)
            return;
        if (!transactionDateIsAllowed(productionForm.date) || !positiveAmount(toNum(productionForm.bagsProduced), "Bags produced"))
            return;
        if (data.flourProduction.some((item) => item.batchNo.toLowerCase() === productionForm.batchNo.trim().toLowerCase())) {
            window.alert("Flour production batch number must be unique.");
            return;
        }
        const record = { id: uid(), date: productionForm.date, batchNo: productionForm.batchNo.trim(), productId: product.id, bagsProduced: toNum(productionForm.bagsProduced), totalCost: toNum(productionForm.totalCost), notes: productionForm.notes };
        commit("Chakki", "Manufacture flour bags", `${product.name}: ${record.bagsProduced} bags`, (current) => ({ ...current, flourProduction: [record, ...current.flourProduction], flourProducts: current.flourProducts.map((item) => item.id === product.id ? { ...item, stock: item.stock + record.bagsProduced, costRate: record.totalCost > 0 ? record.totalCost / record.bagsProduced : item.costRate } : item) }));
        setProductionForm({ ...productionForm, batchNo: `FLOUR-B-${1001 + data.flourProduction.length + 1}`, bagsProduced: "", totalCost: "", notes: "" });
    };
    const sellFlour = (event) => {
        event.preventDefault();
        const product = data.flourProducts.find((item) => item.id === saleForm.productId);
        if (!product)
            return;
        if (!transactionDateIsAllowed(saleForm.date))
            return;
        const quantity = toNum(saleForm.quantity);
        if (!positiveAmount(quantity, "Bag quantity"))
            return;
        if (quantity > product.stock) {
            window.alert(`Only ${product.stock} bags are available.`);
            return;
        }
        const total = quantity * toNum(saleForm.rate);
        const customer = data.customers.find((item) => item.id === saleForm.customerId);
        if (saleForm.paymentType === "credit" && !customer) {
            window.alert("A credit flour sale must be linked to a registered Chakki customer.");
            return;
        }
        if (customer?.creditLimit && customerOutstanding(data, customer.id) + total > customer.creditLimit && !window.confirm(`This sale exceeds ${customer.name}'s credit limit. Continue?`))
            return;
        const paidAmount = saleForm.paymentType === "cash" ? total : Math.min(toNum(saleForm.paidAmount), total);
        const record = { id: uid(), date: saleForm.date, business: "chakki", invoiceNo: saleForm.invoiceNo, customerId: customer?.id || "", customerName: customer?.name || saleForm.customerName || "Walk-in Customer", productId: product.id, productName: product.name, quantity, unit: "bags", rate: toNum(saleForm.rate), total, paidAmount, paymentType: saleForm.paymentType, dueDate: saleForm.paymentType === "cash" ? "" : saleForm.dueDate, remarks: saleForm.remarks, costRate: product.costRate };
        commit("Chakki", "Add flour bag sale", `${record.invoiceNo}: ${money(total)}`, (current) => {
            let next = { ...current, sales: [record, ...current.sales], flourProducts: current.flourProducts.map((item) => item.id === product.id ? { ...item, stock: item.stock - quantity } : item) };
            if (paidAmount > 0)
                next = addCashEntry(next, { date: record.date, type: "received", business: "chakki", category: "Flour Bag Sales", reference: record.invoiceNo, description: `${record.customerName} - ${record.productName}`, amount: paidAmount });
            return next;
        });
        openPrint({ title: "Flour Bag Sale Invoice", subtitle: record.invoiceNo, fields: [["Date", record.date], ["Customer", record.customerName], ["Product", record.productName], ["Quantity", `${record.quantity} bags`], ["Rate", money(record.rate)], ["Total", money(record.total)], ["Paid", money(record.paidAmount)], ["Balance", money(record.total - record.paidAmount)]], footer: "PK Business ERP Suite - Chakki" });
        setSaleForm({ ...saleForm, invoiceNo: `INV-C-${1001 + data.sales.filter((item) => item.business === "chakki").length + 1}`, quantity: "", paidAmount: "", remarks: "" });
    };
    const flourSales = data.sales.filter((item) => item.business === "chakki");
    return <div className="screen-stack"><ModuleTabs items={tabs} active={section} onChange={(key) => setSection(key)}/>
    {section === "dashboard" ? <BusinessDashboard business="chakki" data={data} metrics={metrics} openPrint={openPrint}/> : null}
    {section === "overview" ? <><div className="two-col"><Panel title="1. Grinding Service"><InlineNotice tone="warning"><b>Important:</b> Customer wheat never becomes company inventory. Only grinding income is recorded in sales/cash book.</InlineNotice><div className="feature-list"><span>Customer details and weight</span><span>Grinding rate and charges</span><span>Cash or credit</span><span>Grinding receipt and reports</span></div><button className="primary-btn" onClick={() => setSection("grinding")}>Open Grinding Service</button></Panel><Panel title="2. Flour Bag Sales"><InlineNotice>The company manufactures its own flour bags. Manufacturing increases stock and every invoice decreases inventory automatically.</InlineNotice><div className="feature-list"><span>10 KG Bag</span><span>20 KG Bag</span><span>40 KG Bag</span><span>50 KG Bag</span></div><button className="primary-btn" onClick={() => setSection("flour-sales")}>Open Flour Bag Sales</button></Panel></div><div className="stats-grid compact"><StatCard label="Grinding Income" value={money(data.grindingJobs.reduce((sum, item) => sum + item.charges, 0))}/><StatCard label="Customer Wheat Processed" value={`${fmt(data.grindingJobs.reduce((sum, item) => sum + item.weightKg, 0))} KG`}/><StatCard label="Flour Bag Stock" value={`${fmt(data.flourProducts.reduce((sum, item) => sum + item.stock, 0))} bags`}/><StatCard label="Flour Sales" value={money(flourSales.reduce((sum, item) => sum + item.total, 0))}/></div></> : null}
    {section === "grinding" ? <Panel title="Grinding Service"><form className="form-grid wide" onSubmit={addGrinding}><input type="date" value={grindingForm.date} onChange={(event) => setGrindingForm({ ...grindingForm, date: event.target.value })}/><input placeholder="Receipt no" value={grindingForm.receiptNo} onChange={(event) => setGrindingForm({ ...grindingForm, receiptNo: event.target.value })}/><input placeholder="Customer name" value={grindingForm.customerName} onChange={(event) => setGrindingForm({ ...grindingForm, customerName: event.target.value })} required/><input placeholder="Phone" value={grindingForm.phone} onChange={(event) => setGrindingForm({ ...grindingForm, phone: event.target.value })}/><input type="number" min="0" placeholder="Weight KG" value={grindingForm.weightKg} onChange={(event) => setGrindingForm({ ...grindingForm, weightKg: event.target.value })} required/><input type="number" min="0" placeholder="Grinding rate / KG" value={grindingForm.grindingRate} onChange={(event) => setGrindingForm({ ...grindingForm, grindingRate: event.target.value })} required/><select value={grindingForm.paymentType} onChange={(event) => setGrindingForm({ ...grindingForm, paymentType: event.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{grindingForm.paymentType === "credit" ? <input type="number" min="0" placeholder="Paid amount" value={grindingForm.paidAmount} onChange={(event) => setGrindingForm({ ...grindingForm, paidAmount: event.target.value })}/> : null}<input placeholder="Remarks" value={grindingForm.remarks} onChange={(event) => setGrindingForm({ ...grindingForm, remarks: event.target.value })}/><button>Generate Receipt</button></form><InlineNotice tone="warning">This form records grinding service income only. The wheat weight is kept as a service record and is never posted to company stock.</InlineNotice><DataTable rows={data.grindingJobs} columns={[{ key: "date", label: "Date" }, { key: "receiptNo", label: "Receipt" }, { key: "customerName", label: "Customer" }, { key: "phone", label: "Phone" }, { key: "weightKg", label: "Weight", value: (row) => row.weightKg, render: (row) => `${fmt(row.weightKg)} KG` }, { key: "charges", label: "Charges", value: (row) => row.charges, render: (row) => money(row.charges) }, { key: "balance", label: "Balance", value: (row) => row.charges - row.paidAmount, render: (row) => money(row.charges - row.paidAmount) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }, { key: "print", label: "Receipt", render: (row) => <button className="secondary-btn mini" onClick={() => openPrint({ title: "Grinding Receipt", subtitle: row.receiptNo, fields: [["Date", row.date], ["Customer", row.customerName], ["Phone", row.phone || "—"], ["Customer Wheat", `${row.weightKg} KG`], ["Rate", `${money(row.grindingRate)} / KG`], ["Charges", money(row.charges)], ["Paid", money(row.paidAmount)], ["Balance", money(row.charges - row.paidAmount)], ["Remarks", row.remarks || "—"]], footer: "Customer wheat is not company inventory." })}>Print</button> }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("grindingJobs", row.id, "Chakki", "grinding receipt")}>Delete</button> : <span className="muted-text">View only</span> }]}/></Panel> : null}
    {section === "flour-products" ? <Panel title="Flour Products"><form className="form-grid wide" onSubmit={addProduct}><select value={productForm.name} onChange={(event) => { const size = event.target.value.split(" ")[0]; setProductForm({ ...productForm, name: event.target.value, bagSize: size }); }}><option>10 KG Flour Bag</option><option>20 KG Flour Bag</option><option>40 KG Flour Bag</option><option>50 KG Flour Bag</option></select><input type="number" min="1" placeholder="Bag size KG" value={productForm.bagSize} onChange={(event) => setProductForm({ ...productForm, bagSize: event.target.value })}/><input type="number" min="0" placeholder="Opening stock" value={productForm.openingStock} onChange={(event) => setProductForm({ ...productForm, openingStock: event.target.value })}/><input type="number" min="0" placeholder="Reorder level" value={productForm.reorderLevel} onChange={(event) => setProductForm({ ...productForm, reorderLevel: event.target.value })}/><input type="number" min="0" placeholder="Cost rate" value={productForm.costRate} onChange={(event) => setProductForm({ ...productForm, costRate: event.target.value })}/><input type="number" min="0" placeholder="Sale rate" value={productForm.saleRate} onChange={(event) => setProductForm({ ...productForm, saleRate: event.target.value })}/><button>Create Product</button></form><DataTable rows={data.flourProducts} columns={[{ key: "name", label: "Product" }, { key: "bagSize", label: "Size", value: (row) => row.bagSize, render: (row) => `${row.bagSize} KG` }, { key: "stock", label: "Stock", value: (row) => row.stock, render: (row) => `${row.stock} bags` }, { key: "costRate", label: "Cost", value: (row) => row.costRate, render: (row) => money(row.costRate) }, { key: "saleRate", label: "Sale Rate", value: (row) => row.saleRate, render: (row) => money(row.saleRate) }, { key: "status", label: "Status", value: (row) => row.stock <= row.reorderLevel ? "Low Stock" : "Available", render: (row) => <span className={`status-badge ${row.stock <= row.reorderLevel ? "danger" : "success"}`}>{row.stock <= row.reorderLevel ? "Low Stock" : "Available"}</span> }]}/></Panel> : null}
    {section === "flour-production" ? <Panel title="Company Flour Production"><form className="form-grid wide" onSubmit={manufactureFlour}><input type="date" value={productionForm.date} onChange={(event) => setProductionForm({ ...productionForm, date: event.target.value })}/><input placeholder="Batch no" value={productionForm.batchNo} onChange={(event) => setProductionForm({ ...productionForm, batchNo: event.target.value })}/><select value={productionForm.productId} onChange={(event) => setProductionForm({ ...productionForm, productId: event.target.value })}>{data.flourProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="1" placeholder="Bags produced" value={productionForm.bagsProduced} onChange={(event) => setProductionForm({ ...productionForm, bagsProduced: event.target.value })} required/><input type="number" min="0" placeholder="Total production cost" value={productionForm.totalCost} onChange={(event) => setProductionForm({ ...productionForm, totalCost: event.target.value })}/><input placeholder="Notes" value={productionForm.notes} onChange={(event) => setProductionForm({ ...productionForm, notes: event.target.value })}/><button>Complete Production</button></form><InlineNotice tone="success">Completing this batch automatically increases the selected flour bag inventory.</InlineNotice><DataTable rows={data.flourProduction} columns={[{ key: "date", label: "Date" }, { key: "batchNo", label: "Batch" }, { key: "productId", label: "Product", value: (row) => data.flourProducts.find((item) => item.id === row.productId)?.name || "Unknown" }, { key: "bagsProduced", label: "Bags", value: (row) => row.bagsProduced }, { key: "totalCost", label: "Total Cost", value: (row) => row.totalCost, render: (row) => money(row.totalCost) }, { key: "notes", label: "Notes" }]}/></Panel> : null}
    {section === "flour-sales" ? <Panel title="Flour Bag Sales"><form className="form-grid wide" onSubmit={sellFlour}><input type="date" value={saleForm.date} onChange={(event) => setSaleForm({ ...saleForm, date: event.target.value })}/><input placeholder="Invoice no" value={saleForm.invoiceNo} onChange={(event) => setSaleForm({ ...saleForm, invoiceNo: event.target.value })}/><select value={saleForm.customerId} onChange={(event) => { const customer = data.customers.find((item) => item.id === event.target.value); setSaleForm({ ...saleForm, customerId: event.target.value, customerName: customer?.name || "Walk-in Customer" }); }}><option value="">Walk-in Customer</option>{data.customers.filter((item) => item.business === "chakki").map((item) => <option key={item.id} value={item.id}>{item.name} · Due {money(customerOutstanding(data, item.id))}</option>)}</select><select value={saleForm.productId} onChange={(event) => { const product = data.flourProducts.find((item) => item.id === event.target.value); setSaleForm({ ...saleForm, productId: event.target.value, rate: String(product?.saleRate || "") }); }}>{data.flourProducts.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stock} bags)</option>)}</select><input type="number" min="1" placeholder="Bags" value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })} required/><input type="number" min="0" placeholder="Rate" value={saleForm.rate} onChange={(event) => setSaleForm({ ...saleForm, rate: event.target.value })} required/><select value={saleForm.paymentType} onChange={(event) => setSaleForm({ ...saleForm, paymentType: event.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{saleForm.paymentType === "credit" ? <><input type="number" min="0" placeholder="Paid amount" value={saleForm.paidAmount} onChange={(event) => setSaleForm({ ...saleForm, paidAmount: event.target.value })}/><input type="date" value={saleForm.dueDate} onChange={(event) => setSaleForm({ ...saleForm, dueDate: event.target.value })}/></> : null}<input placeholder="Remarks" value={saleForm.remarks} onChange={(event) => setSaleForm({ ...saleForm, remarks: event.target.value })}/><button>Generate Invoice</button></form><DataTable rows={flourSales} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Product" }, { key: "quantity", label: "Bags", value: (row) => row.quantity }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "due", label: "Due", value: (row) => row.total - row.paidAmount, render: (row) => money(row.total - row.paidAmount) }, { key: "print", label: "Invoice", render: (row) => <button className="secondary-btn mini" onClick={() => openPrint({ title: "Flour Bag Sale Invoice", subtitle: row.invoiceNo, fields: [["Date", row.date], ["Customer", row.customerName], ["Product", row.productName], ["Quantity", `${row.quantity} bags`], ["Total", money(row.total)], ["Paid", money(row.paidAmount)], ["Balance", money(row.total - row.paidAmount)]] })}>Print</button> }]}/></Panel> : null}
    {section === "customers" ? <ContactManager type="customer" business="chakki" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin}/> : null}
    {section === "customer-ledger" ? <CustomerLedgerManager business="chakki" data={data} commit={commit} addCashEntry={addCashEntry} openPrint={openPrint}/> : null}
    {section === "expenses" ? <ExpenseManager business="chakki" data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint}/> : null}
    {section === "staff" ? <BusinessStaffView business="chakki" data={data}/> : null}
    {section === "salary" ? <BusinessSalaryView business="chakki" data={data}/> : null}
    {section === "reports" ? <div className="screen-stack"><SimpleBusinessReport business="chakki" data={data} openPrint={openPrint}/><Panel title="Grinding Reports" actions={<button className="secondary-btn" onClick={() => openPrint({ title: "Monthly Grinding Report", subtitle: new Date().toLocaleDateString("en-PK", { month: "long", year: "numeric" }), columns: ["Date", "Receipt", "Customer", "Weight", "Charges", "Paid", "Credit"], rows: data.grindingJobs.map((item) => [item.date, item.receiptNo, item.customerName, `${item.weightKg} KG`, money(item.charges), money(item.paidAmount), money(item.charges - item.paidAmount)]), footer: `Grinding Income: ${money(data.grindingJobs.reduce((sum, item) => sum + item.charges, 0))}` })}>Print Grinding Report</button>}><DataTable rows={data.grindingJobs} columns={[{ key: "date", label: "Date" }, { key: "receiptNo", label: "Receipt" }, { key: "customerName", label: "Customer" }, { key: "weightKg", label: "Weight", value: (row) => row.weightKg, render: (row) => `${row.weightKg} KG` }, { key: "charges", label: "Charges", value: (row) => row.charges, render: (row) => money(row.charges) }]}/></Panel></div> : null}
    {section === "settings" ? <Panel title="Chakki Settings"><div className="settings-summary"><span><b>Grinding rate:</b> Configurable per receipt</span><span><b>Flour bag sizes:</b> 10, 20, 40 and 50 KG</span><span><b>Low-stock products:</b> {data.flourProducts.filter((item) => item.stock <= item.reorderLevel).length}</span><span><b>Accounting rule:</b> Customer wheat never enters company inventory</span></div></Panel> : null}
  </div>;
}
function PetrolPanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint, metrics }) {
    const [section, setSection] = useState("dashboard");
    const [purchaseForm, setPurchaseForm] = useState({ date: today(), invoiceNo: `FP-${1000 + data.fuelPurchases.length + 1}`, fuelType: "petrol", liters: "", rate: "", supplierId: data.suppliers.find((item) => item.business === "petrol")?.id || "", paymentType: "cash", paidAmount: "" });
    const [readingForm, setReadingForm] = useState({ date: today(), machine: "Machine 1", fuelType: "petrol", openingReading: "", closingReading: "", saleRate: String(data.fuelRates.find((item) => item.fuelType === "petrol")?.rate || ""), paymentType: "cash", customerId: "", paidAmount: "", dueDate: dateOffset(5), remarks: "", rollover: false, meterMaximum: String(data.settings.meterMaximum) });
    const tabs = [["dashboard", "Dashboard"], ["suppliers", "Suppliers"], ["supplier-ledger", "Supplier Ledger"], ["fuel-purchase", "Fuel Purchase"], ["purchase-return", "Purchase Return"], ["tank-stock", "Tank Stock"], ["machine-reading", "Machine Reading"], ["fuel-rates", "Fuel Rates"], ["customers", "Customers"], ["customer-ledger", "Customer Ledger"], ["temporary-credit", "Temporary Credit"], ["cash", "Cash"], ["expenses", "Expenses"], ["staff", "Staff"], ["salary", "Salary"], ["reports", "Reports"], ["daily-closing", "Daily Closing"], ["monthly-closing", "Monthly Closing"], ["settings", "Settings"]];
    const addFuelPurchase = (event) => {
        event.preventDefault();
        if (!transactionDateIsAllowed(purchaseForm.date) || !positiveAmount(toNum(purchaseForm.liters), "Fuel quantity") || !positiveAmount(toNum(purchaseForm.rate), "Purchase rate"))
            return;
        if (data.fuelPurchases.some((item) => item.invoiceNo.toLowerCase() === purchaseForm.invoiceNo.trim().toLowerCase())) {
            window.alert("Fuel purchase invoice number must be unique.");
            return;
        }
        const total = toNum(purchaseForm.liters) * toNum(purchaseForm.rate);
        const paidAmount = purchaseForm.paymentType === "cash" ? total : Math.min(toNum(purchaseForm.paidAmount), total);
        const record = { id: uid(), date: purchaseForm.date, invoiceNo: purchaseForm.invoiceNo, fuelType: purchaseForm.fuelType, liters: toNum(purchaseForm.liters), rate: toNum(purchaseForm.rate), supplierId: purchaseForm.supplierId, paymentType: purchaseForm.paymentType, paidAmount };
        commit("Petrol Pump", "Add fuel purchase", `${titleCase(record.fuelType)} ${fmt(record.liters)} L`, (current) => {
            let next = { ...current, fuelPurchases: [record, ...current.fuelPurchases] };
            if (paidAmount > 0)
                next = addCashEntry(next, { date: record.date, type: "paid", business: "petrol", category: "Fuel Purchase", reference: record.invoiceNo, description: `${titleCase(record.fuelType)} purchase`, amount: paidAmount });
            return next;
        });
        setPurchaseForm({ ...purchaseForm, invoiceNo: `FP-${1001 + data.fuelPurchases.length + 1}`, liters: "", rate: "", paidAmount: "" });
    };
    const addMachineReading = (event) => {
        event.preventDefault();
        if (!transactionDateIsAllowed(readingForm.date))
            return;
        const openingReading = toNum(readingForm.openingReading);
        const closingReading = toNum(readingForm.closingReading);
        const rate = toNum(readingForm.saleRate);
        if (!positiveAmount(rate, "Fuel sale rate"))
            return;
        if (!readingForm.rollover && closingReading < openingReading) {
            window.alert("Closing reading must be greater than or equal to opening reading unless Meter Rollover is enabled.");
            return;
        }
        if (readingForm.rollover && toNum(readingForm.meterMaximum) <= openingReading) {
            window.alert("Meter maximum must be greater than the opening reading for rollover calculation.");
            return;
        }
        const draft = { id: uid(), date: readingForm.date, machine: readingForm.machine, fuelType: readingForm.fuelType, openingReading, closingReading, saleRate: rate, paymentType: readingForm.paymentType, customerId: readingForm.customerId, customerName: "", paidAmount: 0, dueDate: readingForm.paymentType === "cash" ? "" : readingForm.dueDate, remarks: readingForm.remarks, rollover: readingForm.rollover, meterMaximum: toNum(readingForm.meterMaximum) || data.settings.meterMaximum };
        const sold = soldLiters(draft);
        if (!positiveAmount(sold, "Fuel sold"))
            return;
        const available = readingForm.fuelType === "petrol" ? metrics.petrolStock : metrics.dieselStock;
        if (sold > available) {
            window.alert(`Fuel sold (${fmt(sold)} L) exceeds available ${readingForm.fuelType} stock (${fmt(available)} L). Please verify the meter readings.`);
            return;
        }
        const customer = data.customers.find((item) => item.id === readingForm.customerId);
        if (readingForm.paymentType !== "cash" && !customer) {
            window.alert("Credit and temporary credit fuel sales must be linked to a registered customer.");
            return;
        }
        const total = sold * rate;
        if (customer?.creditLimit && customerOutstanding(data, customer.id) + total > customer.creditLimit && !window.confirm(`This transaction exceeds ${customer.name}'s credit limit. Continue?`))
            return;
        const paidAmount = readingForm.paymentType === "cash" ? total : Math.min(toNum(readingForm.paidAmount), total);
        const record = { ...draft, customerName: customer?.name || "Walk-in Customers", paidAmount };
        commit("Petrol Pump", "Add machine reading", `${record.machine}: ${fmt(sold)} L sold`, (current) => {
            let next = { ...current, machineReadings: [record, ...current.machineReadings] };
            if (paidAmount > 0)
                next = addCashEntry(next, { date: record.date, type: "received", business: "petrol", category: "Fuel Sales", reference: `${record.machine}-${record.date}-${record.id.slice(-4)}`, description: `${titleCase(record.fuelType)} sale`, amount: paidAmount });
            return next;
        });
        setReadingForm({ ...readingForm, openingReading: closingReading.toString(), closingReading: "", paidAmount: "", remarks: "", rollover: false });
    };
    const saveClosing = (period) => {
        const date = period === "daily" ? today() : `${today().slice(0, 7)}-01`;
        const prefix = period === "daily" ? today() : today().slice(0, 7);
        const entries = data.cashEntries.filter((item) => item.business === "petrol" && item.date.startsWith(prefix));
        const received = entries.filter((item) => item.type === "received").reduce((sum, item) => sum + item.amount, 0);
        const paid = entries.filter((item) => item.type === "paid" || item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
        const previous = data.closings.filter((item) => item.business === "petrol" && item.period === period).at(0)?.closingBalance || 0;
        const record = { id: uid(), date, period, business: "petrol", openingBalance: previous, received, paid, closingBalance: previous + received - paid, notes: `${titleCase(period)} petrol pump closing` };
        commit("Petrol Pump", `Save ${period} closing`, money(record.closingBalance), (current) => ({ ...current, closings: [record, ...current.closings] }));
        openPrint({ title: `Petrol Pump ${titleCase(period)} Closing`, subtitle: date, fields: [["Opening Balance", money(record.openingBalance)], ["Cash Received", money(record.received)], ["Cash Paid", money(record.paid)], ["Closing Balance", money(record.closingBalance)], ["Petrol Tank", `${fmt(metrics.petrolStock)} L`], ["Diesel Tank", `${fmt(metrics.dieselStock)} L`]], footer: "Fuel Sold = Closing Reading - Opening Reading" });
    };
    const temporaryRows = data.machineReadings.filter((item) => item.paymentType === "temporary");
    const cashRows = data.machineReadings.filter((item) => item.paymentType === "cash");
    const closingRows = data.closings.filter((item) => item.business === "petrol");
    return <div className="screen-stack"><InlineNotice>Automatic formula: <b>Fuel Sold = Closing Reading − Opening Reading.</b> Meter rollover is supported with validation. Tank stock is calculated from opening stock + purchases − returns − machine sales.</InlineNotice><ModuleTabs items={tabs} active={section} onChange={(key) => setSection(key)}/>
    {section === "dashboard" ? <BusinessDashboard business="petrol" data={data} metrics={metrics} openPrint={openPrint}/> : null}
    {section === "suppliers" ? <ContactManager type="supplier" business="petrol" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin}/> : null}
    {section === "supplier-ledger" ? <SupplierLedgerManager business="petrol" data={data} commit={commit} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint}/> : null}
    {section === "fuel-purchase" ? <Panel title="Fuel Purchase"><form className="form-grid wide" onSubmit={addFuelPurchase}><input type="date" value={purchaseForm.date} onChange={(event) => setPurchaseForm({ ...purchaseForm, date: event.target.value })}/><input placeholder="Invoice no" value={purchaseForm.invoiceNo} onChange={(event) => setPurchaseForm({ ...purchaseForm, invoiceNo: event.target.value })}/><select value={purchaseForm.fuelType} onChange={(event) => setPurchaseForm({ ...purchaseForm, fuelType: event.target.value })}><option value="petrol">Petrol</option><option value="diesel">Diesel</option></select><input type="number" min="0" placeholder="Liters" value={purchaseForm.liters} onChange={(event) => setPurchaseForm({ ...purchaseForm, liters: event.target.value })} required/><input type="number" min="0" step="0.01" placeholder="Purchase rate" value={purchaseForm.rate} onChange={(event) => setPurchaseForm({ ...purchaseForm, rate: event.target.value })} required/><select value={purchaseForm.supplierId} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplierId: event.target.value })}>{data.suppliers.filter((item) => item.business === "petrol").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={purchaseForm.paymentType} onChange={(event) => setPurchaseForm({ ...purchaseForm, paymentType: event.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{purchaseForm.paymentType === "credit" ? <input type="number" min="0" placeholder="Paid amount" value={purchaseForm.paidAmount} onChange={(event) => setPurchaseForm({ ...purchaseForm, paidAmount: event.target.value })}/> : null}<button>Add Fuel Purchase</button></form><DataTable rows={data.fuelPurchases} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "fuelType", label: "Fuel", render: (row) => titleCase(row.fuelType) }, { key: "liters", label: "Liters", value: (row) => row.liters, render: (row) => `${fmt(row.liters)} L` }, { key: "rate", label: "Rate", value: (row) => row.rate, render: (row) => money(row.rate) }, { key: "total", label: "Total", value: (row) => row.liters * row.rate, render: (row) => money(row.liters * row.rate) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }]}/></Panel> : null}
    {section === "purchase-return" ? <PurchaseReturnManager business="petrol" data={data} commit={commit} openPrint={openPrint}/> : null}
    {section === "tank-stock" ? <><div className="stats-grid compact"><StatCard label="Petrol Tank Stock" value={`${fmt(metrics.petrolStock)} L`} hint={`Reorder at ${fmt(data.settings.petrolReorderLevel)} L`} tone={metrics.petrolStock <= data.settings.petrolReorderLevel ? "warning" : "success"}/><StatCard label="Diesel Tank Stock" value={`${fmt(metrics.dieselStock)} L`} hint={`Reorder at ${fmt(data.settings.dieselReorderLevel)} L`} tone={metrics.dieselStock <= data.settings.dieselReorderLevel ? "warning" : "success"}/><StatCard label="Petrol Sold" value={`${fmt(data.machineReadings.filter((item) => item.fuelType === "petrol").reduce((sum, item) => sum + soldLiters(item), 0))} L`}/><StatCard label="Diesel Sold" value={`${fmt(data.machineReadings.filter((item) => item.fuelType === "diesel").reduce((sum, item) => sum + soldLiters(item), 0))} L`}/></div><Panel title="Tank Stock Movement"><DataTable rows={[{ id: "tank-petrol", fuel: "Petrol", opening: data.settings.openingPetrolLiters, purchased: data.fuelPurchases.filter((item) => item.fuelType === "petrol").reduce((sum, item) => sum + item.liters, 0), sold: data.machineReadings.filter((item) => item.fuelType === "petrol").reduce((sum, item) => sum + soldLiters(item), 0), closing: metrics.petrolStock }, { id: "tank-diesel", fuel: "Diesel", opening: data.settings.openingDieselLiters, purchased: data.fuelPurchases.filter((item) => item.fuelType === "diesel").reduce((sum, item) => sum + item.liters, 0), sold: data.machineReadings.filter((item) => item.fuelType === "diesel").reduce((sum, item) => sum + soldLiters(item), 0), closing: metrics.dieselStock }]} columns={[{ key: "fuel", label: "Fuel" }, { key: "opening", label: "Opening", value: (row) => row.opening, render: (row) => `${fmt(row.opening)} L` }, { key: "purchased", label: "Purchased", value: (row) => row.purchased, render: (row) => `${fmt(row.purchased)} L` }, { key: "sold", label: "Sold", value: (row) => row.sold, render: (row) => `${fmt(row.sold)} L` }, { key: "closing", label: "Closing", value: (row) => row.closing, render: (row) => `${fmt(row.closing)} L` }]}/></Panel></> : null}
    {section === "machine-reading" ? <Panel title="Machine Reading"><form className="form-grid wide" onSubmit={addMachineReading}><input type="date" value={readingForm.date} onChange={(event) => setReadingForm({ ...readingForm, date: event.target.value })}/><select value={readingForm.machine} onChange={(event) => setReadingForm({ ...readingForm, machine: event.target.value })}><option>Machine 1</option><option>Machine 2</option></select><select value={readingForm.fuelType} onChange={(event) => setReadingForm({ ...readingForm, fuelType: event.target.value })}><option value="petrol">Petrol</option><option value="diesel">Diesel</option></select><input type="number" min="0" step="0.01" placeholder="Opening reading" value={readingForm.openingReading} onChange={(event) => setReadingForm({ ...readingForm, openingReading: event.target.value })} required/><input type="number" min="0" step="0.01" placeholder="Closing reading" value={readingForm.closingReading} onChange={(event) => setReadingForm({ ...readingForm, closingReading: event.target.value })} required/><input type="number" min="0" step="0.01" placeholder="Sale rate / L" value={readingForm.saleRate} onChange={(event) => setReadingForm({ ...readingForm, saleRate: event.target.value })} required/><label className="checkbox-field"><input type="checkbox" checked={readingForm.rollover} onChange={(event) => setReadingForm({ ...readingForm, rollover: event.target.checked })}/> Meter Rollover</label>{readingForm.rollover ? <input type="number" min="1" placeholder="Meter maximum" value={readingForm.meterMaximum} onChange={(event) => setReadingForm({ ...readingForm, meterMaximum: event.target.value })}/> : null}<select value={readingForm.paymentType} onChange={(event) => setReadingForm({ ...readingForm, paymentType: event.target.value })}><option value="cash">Cash</option><option value="credit">Regular Credit</option><option value="temporary">Temporary Credit</option></select>{readingForm.paymentType !== "cash" ? <><select value={readingForm.customerId} onChange={(event) => setReadingForm({ ...readingForm, customerId: event.target.value })}><option value="">Temporary / unnamed customer</option>{data.customers.filter((item) => item.business === "petrol").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="0" placeholder="Paid amount" value={readingForm.paidAmount} onChange={(event) => setReadingForm({ ...readingForm, paidAmount: event.target.value })}/><input type="date" value={readingForm.dueDate} onChange={(event) => setReadingForm({ ...readingForm, dueDate: event.target.value })}/></> : null}<input placeholder="Remarks" value={readingForm.remarks} onChange={(event) => setReadingForm({ ...readingForm, remarks: event.target.value })}/><button>Save Machine Reading</button></form><div className="formula-box"><span>Fuel Sold</span><strong>{fmt(Math.max(toNum(readingForm.closingReading) - toNum(readingForm.openingReading), 0))} L</strong><small>Closing Reading − Opening Reading</small></div><DataTable rows={data.machineReadings} columns={[{ key: "date", label: "Date" }, { key: "machine", label: "Machine" }, { key: "fuelType", label: "Fuel", render: (row) => titleCase(row.fuelType) }, { key: "openingReading", label: "Opening", value: (row) => row.openingReading, render: (row) => fmt(row.openingReading) }, { key: "closingReading", label: "Closing", value: (row) => row.closingReading, render: (row) => fmt(row.closingReading) }, { key: "sold", label: "Fuel Sold", value: soldLiters, render: (row) => `${fmt(soldLiters(row))} L` }, { key: "amount", label: "Amount", value: readingAmount, render: (row) => money(readingAmount(row)) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("machineReadings", row.id, "Petrol Pump", "reading")}>Delete</button> : <span className="muted-text">View only</span> }]}/></Panel> : null}
    {section === "fuel-rates" ? <FuelRateManager data={data} commit={commit} openPrint={openPrint}/> : null}
    {section === "customers" ? <ContactManager type="customer" business="petrol" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin}/> : null}
    {section === "customer-ledger" ? <CustomerLedgerManager business="petrol" data={data} commit={commit} addCashEntry={addCashEntry} openPrint={openPrint}/> : null}
    {section === "temporary-credit" ? <Panel title="Temporary Credit"><DataTable rows={temporaryRows} columns={[{ key: "date", label: "Date" }, { key: "customerName", label: "Customer" }, { key: "machine", label: "Machine" }, { key: "fuelType", label: "Fuel", render: (row) => titleCase(row.fuelType) }, { key: "liters", label: "Liters", value: soldLiters, render: (row) => `${fmt(soldLiters(row))} L` }, { key: "total", label: "Total", value: readingAmount, render: (row) => money(readingAmount(row)) }, { key: "paidAmount", label: "Paid", value: (row) => row.paidAmount, render: (row) => money(row.paidAmount) }, { key: "due", label: "Due", value: (row) => readingAmount(row) - row.paidAmount, render: (row) => money(readingAmount(row) - row.paidAmount) }, { key: "dueDate", label: "Due Date" }]}/></Panel> : null}
    {section === "cash" ? <Panel title="Petrol Pump Cash Sales"><DataTable rows={cashRows} columns={[{ key: "date", label: "Date" }, { key: "machine", label: "Machine" }, { key: "fuelType", label: "Fuel", render: (row) => titleCase(row.fuelType) }, { key: "liters", label: "Liters", value: soldLiters, render: (row) => `${fmt(soldLiters(row))} L` }, { key: "amount", label: "Cash Amount", value: readingAmount, render: (row) => money(readingAmount(row)) }]}/></Panel> : null}
    {section === "expenses" ? <ExpenseManager business="petrol" data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint}/> : null}
    {section === "staff" ? <BusinessStaffView business="petrol" data={data}/> : null}
    {section === "salary" ? <BusinessSalaryView business="petrol" data={data}/> : null}
    {section === "reports" ? <div className="screen-stack"><SimpleBusinessReport business="petrol" data={data} openPrint={openPrint}/><Panel title="Fuel Report" actions={<button className="primary-btn" onClick={() => openPrint({ title: "Fuel Sales Report", subtitle: `Generated ${today()}`, columns: ["Date", "Machine", "Fuel", "Opening", "Closing", "Liters Sold", "Amount", "Payment"], rows: data.machineReadings.map((item) => [item.date, item.machine, titleCase(item.fuelType), fmt(item.openingReading), fmt(item.closingReading), `${fmt(soldLiters(item))} L`, money(readingAmount(item)), titleCase(item.paymentType)]), footer: `Petrol Stock: ${fmt(metrics.petrolStock)} L · Diesel Stock: ${fmt(metrics.dieselStock)} L` })}>Print Fuel Report</button>}><DataTable rows={data.machineReadings} columns={[{ key: "date", label: "Date" }, { key: "machine", label: "Machine" }, { key: "fuelType", label: "Fuel", render: (row) => titleCase(row.fuelType) }, { key: "sold", label: "Sold", value: soldLiters, render: (row) => `${fmt(soldLiters(row))} L` }, { key: "amount", label: "Amount", value: readingAmount, render: (row) => money(readingAmount(row)) }]}/></Panel></div> : null}
    {section === "daily-closing" || section === "monthly-closing" ? <Panel title={section === "daily-closing" ? "Daily Closing" : "Monthly Closing"} actions={<button className="primary-btn" onClick={() => saveClosing(section === "daily-closing" ? "daily" : "monthly")}>Save & Print Closing</button>}><DataTable rows={closingRows.filter((item) => item.period === (section === "daily-closing" ? "daily" : "monthly"))} columns={[{ key: "date", label: "Date / Month" }, { key: "openingBalance", label: "Opening", value: (row) => row.openingBalance, render: (row) => money(row.openingBalance) }, { key: "received", label: "Received", value: (row) => row.received, render: (row) => money(row.received) }, { key: "paid", label: "Paid", value: (row) => row.paid, render: (row) => money(row.paid) }, { key: "closingBalance", label: "Closing", value: (row) => row.closingBalance, render: (row) => money(row.closingBalance) }, { key: "notes", label: "Notes" }]}/></Panel> : null}
    {section === "settings" ? <Panel title="Petrol Pump Settings"><div className="settings-summary"><span><b>Machines:</b> Machine 1 and Machine 2</span><span><b>Meter maximum:</b> {fmt(data.settings.meterMaximum)}</span><span><b>Petrol reorder:</b> {fmt(data.settings.petrolReorderLevel)} L</span><span><b>Diesel reorder:</b> {fmt(data.settings.dieselReorderLevel)} L</span></div><InlineNotice>Fuel sale rates are date-wise in Fuel Rates. Opening tank stock and meter maximum are controlled in global Settings.</InlineNotice></Panel> : null}
  </div>;
}
function StorePanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint, metrics }) {
    const [section, setSection] = useState("dashboard");
    const [productForm, setProductForm] = useState({ name: "", sku: "", category: "Grocery", stock: "0", reorderLevel: "10", costRate: "", saleRate: "" });
    const [purchaseForm, setPurchaseForm] = useState({ date: today(), invoiceNo: `SP-${1000 + data.storePurchases.length + 1}`, supplierId: data.suppliers.find((item) => item.business === "store")?.id || "", productId: data.storeProducts[0]?.id || "", quantity: "", rate: "", paymentType: "cash", paidAmount: "" });
    const [saleForm, setSaleForm] = useState({ date: today(), invoiceNo: `INV-S-${1000 + data.sales.filter((item) => item.business === "store").length + 1}`, customerId: data.customers.find((item) => item.business === "store")?.id || "", productId: data.storeProducts[0]?.id || "", quantity: "", rate: String(data.storeProducts[0]?.saleRate || ""), paymentType: "cash", paidAmount: "", dueDate: dateOffset(7) });
    const tabs = [
        ["dashboard", "Dashboard"], ["products", "Products"], ["categories", "Categories"], ["suppliers", "Suppliers"], ["supplier-ledger", "Supplier Ledger"], ["purchase", "Purchase"], ["purchase-return", "Purchase Return"], ["inventory", "Inventory"], ["sales", "Sales"], ["cash", "Cash Sales"], ["credit", "Credit Sales"], ["customers", "Customers"], ["customer-ledger", "Customer Ledger"], ["expenses", "Expenses"], ["staff", "Staff"], ["reports", "Reports"], ["settings", "Settings"],
    ];
    const addProduct = (event) => {
        event.preventDefault();
        if (!productForm.name.trim() || !productForm.sku.trim())
            return window.alert("Product name and SKU are required.");
        if (data.storeProducts.some((item) => item.sku.toLowerCase() === productForm.sku.trim().toLowerCase()))
            return window.alert("SKU already exists. Use a unique SKU.");
        const stock = toNum(productForm.stock), reorderLevel = toNum(productForm.reorderLevel), costRate = toNum(productForm.costRate), saleRate = toNum(productForm.saleRate);
        if ([stock, reorderLevel, costRate, saleRate].some((value) => value < 0))
            return window.alert("Stock and rates cannot be negative.");
        const record = { id: uid(), name: productForm.name.trim(), sku: productForm.sku.trim(), category: productForm.category.trim() || "General", stock, reorderLevel, costRate, saleRate };
        commit("Super Store", "Add product", record.name, (current) => ({ ...current, storeProducts: [record, ...current.storeProducts] }));
        setProductForm({ name: "", sku: "", category: "Grocery", stock: "0", reorderLevel: "10", costRate: "", saleRate: "" });
    };
    const addPurchase = (event) => {
        event.preventDefault();
        if (!transactionDateIsAllowed(purchaseForm.date))
            return;
        if (!purchaseForm.invoiceNo.trim() || data.storePurchases.some((item) => item.invoiceNo.toLowerCase() === purchaseForm.invoiceNo.trim().toLowerCase()))
            return window.alert("A unique purchase invoice number is required.");
        if (!purchaseForm.supplierId || !purchaseForm.productId)
            return window.alert("Supplier and product are required.");
        const quantity = toNum(purchaseForm.quantity), rate = toNum(purchaseForm.rate);
        if (!positiveAmount(quantity, "Quantity") || !positiveAmount(rate, "Rate"))
            return;
        const total = quantity * rate;
        const paidAmount = purchaseForm.paymentType === "cash" ? total : Math.min(toNum(purchaseForm.paidAmount), total);
        const record = { id: uid(), date: purchaseForm.date, invoiceNo: purchaseForm.invoiceNo.trim(), supplierId: purchaseForm.supplierId, productId: purchaseForm.productId, quantity, rate, paymentType: purchaseForm.paymentType, paidAmount };
        const product = data.storeProducts.find((item) => item.id === record.productId);
        commit("Super Store", "Add purchase", `${record.invoiceNo} · ${product?.name}`, (current) => {
            let next = { ...current, storePurchases: [record, ...current.storePurchases], storeProducts: current.storeProducts.map((item) => item.id === record.productId ? { ...item, stock: item.stock + record.quantity, costRate: ((item.stock * item.costRate) + (record.quantity * record.rate)) / Math.max(item.stock + record.quantity, 1) } : item) };
            if (paidAmount > 0)
                next = addCashEntry(next, { date: record.date, type: "paid", business: "store", category: "Purchase", reference: record.invoiceNo, description: product?.name || "Store purchase", amount: paidAmount });
            return next;
        });
        openPrint({ title: "Super Store Purchase Invoice", subtitle: record.invoiceNo, fields: [["Date", record.date], ["Supplier", data.suppliers.find((item) => item.id === record.supplierId)?.name || "—"], ["Product", product?.name || "—"], ["Quantity", String(record.quantity)], ["Rate", money(record.rate)], ["Total", money(total)], ["Paid", money(paidAmount)], ["Payable", money(total - paidAmount)]] });
        setPurchaseForm({ ...purchaseForm, invoiceNo: `SP-${1001 + data.storePurchases.length}`, quantity: "", rate: "", paidAmount: "" });
    };
    const addSale = (event) => {
        event.preventDefault();
        if (!transactionDateIsAllowed(saleForm.date))
            return;
        if (!saleForm.invoiceNo.trim() || data.sales.some((item) => item.invoiceNo.toLowerCase() === saleForm.invoiceNo.trim().toLowerCase()))
            return window.alert("A unique sale invoice number is required.");
        const product = data.storeProducts.find((item) => item.id === saleForm.productId);
        const customer = data.customers.find((item) => item.id === saleForm.customerId && item.business === "store");
        const quantity = toNum(saleForm.quantity), rate = toNum(saleForm.rate);
        if (!product || !positiveAmount(quantity, "Quantity") || !positiveAmount(rate, "Rate"))
            return;
        if (quantity > product.stock)
            return window.alert(`Insufficient Stock. Only ${product.stock} units are available.`);
        if (saleForm.paymentType === "credit" && !customer)
            return window.alert("A registered customer is required for a credit sale.");
        const total = quantity * rate;
        const paidAmount = saleForm.paymentType === "cash" ? total : Math.min(toNum(saleForm.paidAmount), total);
        if (customer && customer.creditLimit > 0 && customerOutstanding(data, customer.id) + total - paidAmount > customer.creditLimit && !window.confirm("This sale exceeds the customer's credit limit. Continue with supervisor approval?"))
            return;
        const record = { id: uid(), date: saleForm.date, business: "store", invoiceNo: saleForm.invoiceNo.trim(), customerId: customer?.id || "", customerName: customer?.name || "Walk-in Customer", productId: product.id, productName: product.name, quantity, unit: "pcs", rate, total, paidAmount, paymentType: saleForm.paymentType, dueDate: saleForm.paymentType === "cash" ? "" : saleForm.dueDate, remarks: "POS sale", costRate: product.costRate };
        commit("Super Store", "Add sale", `${record.invoiceNo}: ${money(total)}`, (current) => {
            let next = { ...current, sales: [record, ...current.sales], storeProducts: current.storeProducts.map((item) => item.id === product.id ? { ...item, stock: item.stock - quantity } : item) };
            if (paidAmount > 0)
                next = addCashEntry(next, { date: record.date, type: "received", business: "store", category: "Sales", reference: record.invoiceNo, description: `${record.customerName} - ${record.productName}`, amount: paidAmount });
            return next;
        });
        openPrint({ title: "Super Store Sales Invoice", subtitle: record.invoiceNo, fields: [["Date", record.date], ["Customer", record.customerName], ["Product", record.productName], ["Quantity", `${record.quantity} pcs`], ["Rate", money(record.rate)], ["Total", money(record.total)], ["Paid", money(record.paidAmount)], ["Balance", money(record.total - record.paidAmount)], ["Payment", titleCase(record.paymentType)]], footer: "Thank you for shopping with us." });
        setSaleForm({ ...saleForm, invoiceNo: `INV-S-${1001 + data.sales.filter((item) => item.business === "store").length}`, quantity: "", paidAmount: "" });
    };
    const storeSales = data.sales.filter((item) => item.business === "store");
    const categories = Array.from(new Set(data.storeProducts.map((item) => item.category))).map((category) => ({ id: category, category, products: data.storeProducts.filter((item) => item.category === category).length, stock: data.storeProducts.filter((item) => item.category === category).reduce((sum, item) => sum + item.stock, 0) }));
    return <div className="screen-stack"><ModuleTabs items={tabs} active={section} onChange={(key) => setSection(key)}/>
        {section === "dashboard" ? <BusinessDashboard business="store" data={data} metrics={metrics} openPrint={openPrint}/> : null}
        {section === "products" ? <Panel title="Products"><form className="form-grid wide" onSubmit={addProduct}><input placeholder="Product name" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} required/><input placeholder="Unique SKU / Code" value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} required/><input placeholder="Category" value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}/><input type="number" min="0" placeholder="Opening stock" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })}/><input type="number" min="0" placeholder="Reorder level" value={productForm.reorderLevel} onChange={(event) => setProductForm({ ...productForm, reorderLevel: event.target.value })}/><input type="number" min="0" step="0.01" placeholder="Cost rate" value={productForm.costRate} onChange={(event) => setProductForm({ ...productForm, costRate: event.target.value })}/><input type="number" min="0" step="0.01" placeholder="Sale rate" value={productForm.saleRate} onChange={(event) => setProductForm({ ...productForm, saleRate: event.target.value })}/><button>Add Product</button></form><DataTable rows={data.storeProducts} columns={[{ key: "sku", label: "SKU" }, { key: "name", label: "Product" }, { key: "category", label: "Category" }, { key: "stock", label: "Stock", value: (row) => row.stock }, { key: "costRate", label: "Cost", value: (row) => row.costRate, render: (row) => money(row.costRate) }, { key: "saleRate", label: "Sale", value: (row) => row.saleRate, render: (row) => money(row.saleRate) }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("storeProducts", row.id, "Super Store", "product")}>Delete</button> : <span className="muted-text">Protected</span> }]}/></Panel> : null}
        {section === "categories" ? <Panel title="Categories"><DataTable rows={categories} columns={[{ key: "category", label: "Category" }, { key: "products", label: "Products", value: (row) => row.products }, { key: "stock", label: "Total Stock", value: (row) => row.stock }]}/></Panel> : null}
        {section === "suppliers" ? <ContactManager type="supplier" business="store" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin}/> : null}
        {section === "supplier-ledger" ? <SupplierLedgerManager business="store" data={data} commit={commit} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint}/> : null}
        {section === "purchase" ? <Panel title="Purchase"><form className="form-grid wide" onSubmit={addPurchase}><input type="date" value={purchaseForm.date} onChange={(event) => setPurchaseForm({ ...purchaseForm, date: event.target.value })}/><input placeholder="Invoice no" value={purchaseForm.invoiceNo} onChange={(event) => setPurchaseForm({ ...purchaseForm, invoiceNo: event.target.value })}/><select value={purchaseForm.supplierId} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplierId: event.target.value })}><option value="">Select supplier</option>{data.suppliers.filter((item) => item.business === "store").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={purchaseForm.productId} onChange={(event) => setPurchaseForm({ ...purchaseForm, productId: event.target.value })}><option value="">Select product</option>{data.storeProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="1" placeholder="Quantity" value={purchaseForm.quantity} onChange={(event) => setPurchaseForm({ ...purchaseForm, quantity: event.target.value })} required/><input type="number" min="0" step="0.01" placeholder="Rate" value={purchaseForm.rate} onChange={(event) => setPurchaseForm({ ...purchaseForm, rate: event.target.value })} required/><select value={purchaseForm.paymentType} onChange={(event) => setPurchaseForm({ ...purchaseForm, paymentType: event.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{purchaseForm.paymentType === "credit" ? <input type="number" min="0" placeholder="Paid amount" value={purchaseForm.paidAmount} onChange={(event) => setPurchaseForm({ ...purchaseForm, paidAmount: event.target.value })}/> : null}<button>Save & Print Purchase</button></form><DataTable rows={data.storePurchases} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "productId", label: "Product", value: (row) => data.storeProducts.find((item) => item.id === row.productId)?.name || "Unknown" }, { key: "quantity", label: "Qty", value: (row) => row.quantity }, { key: "total", label: "Total", value: (row) => row.quantity * row.rate, render: (row) => money(row.quantity * row.rate) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }]}/></Panel> : null}
        {section === "purchase-return" ? <PurchaseReturnManager business="store" data={data} commit={commit} openPrint={openPrint}/> : null}
        {section === "inventory" ? <Panel title="Inventory"><DataTable rows={data.storeProducts} columns={[{ key: "sku", label: "SKU" }, { key: "name", label: "Product" }, { key: "category", label: "Category" }, { key: "stock", label: "Stock", value: (row) => row.stock }, { key: "reorderLevel", label: "Reorder At", value: (row) => row.reorderLevel }, { key: "value", label: "Stock Value", value: (row) => row.stock * row.costRate, render: (row) => money(row.stock * row.costRate) }, { key: "status", label: "Status", value: (row) => row.stock <= row.reorderLevel ? "Low Stock" : "Available", render: (row) => <span className={`status-badge ${row.stock <= row.reorderLevel ? "danger" : "success"}`}>{row.stock <= row.reorderLevel ? "Low Stock" : "Available"}</span> }]}/></Panel> : null}
        {section === "sales" ? <Panel title="Sales"><form className="form-grid wide" onSubmit={addSale}><input type="date" value={saleForm.date} onChange={(event) => setSaleForm({ ...saleForm, date: event.target.value })}/><input placeholder="Invoice no" value={saleForm.invoiceNo} onChange={(event) => setSaleForm({ ...saleForm, invoiceNo: event.target.value })}/><select value={saleForm.customerId} onChange={(event) => setSaleForm({ ...saleForm, customerId: event.target.value })}><option value="">Walk-in Customer</option>{data.customers.filter((item) => item.business === "store").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={saleForm.productId} onChange={(event) => { const product = data.storeProducts.find((item) => item.id === event.target.value); setSaleForm({ ...saleForm, productId: event.target.value, rate: String(product?.saleRate || "") }); }}><option value="">Select product</option>{data.storeProducts.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stock})</option>)}</select><input type="number" min="1" placeholder="Quantity" value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })} required/><input type="number" min="0" step="0.01" placeholder="Rate" value={saleForm.rate} onChange={(event) => setSaleForm({ ...saleForm, rate: event.target.value })} required/><select value={saleForm.paymentType} onChange={(event) => setSaleForm({ ...saleForm, paymentType: event.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{saleForm.paymentType === "credit" ? <><input type="number" min="0" placeholder="Paid amount" value={saleForm.paidAmount} onChange={(event) => setSaleForm({ ...saleForm, paidAmount: event.target.value })}/><input type="date" value={saleForm.dueDate} onChange={(event) => setSaleForm({ ...saleForm, dueDate: event.target.value })}/></> : null}<button>Save & Print Invoice</button></form><DataTable rows={storeSales} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Product" }, { key: "quantity", label: "Qty", value: (row) => row.quantity }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "paidAmount", label: "Paid", value: (row) => row.paidAmount, render: (row) => money(row.paidAmount) }, { key: "due", label: "Due", value: (row) => row.total - row.paidAmount, render: (row) => money(row.total - row.paidAmount) }, { key: "print", label: "Invoice", render: (row) => <button className="secondary-btn mini" onClick={() => openPrint({ title: "Super Store Sales Invoice", subtitle: row.invoiceNo, fields: [["Date", row.date], ["Customer", row.customerName], ["Product", row.productName], ["Quantity", String(row.quantity)], ["Total", money(row.total)], ["Paid", money(row.paidAmount)], ["Balance", money(row.total - row.paidAmount)]] })}>Print</button> }]}/></Panel> : null}
        {section === "cash" || section === "credit" ? <Panel title={section === "cash" ? "Cash Sales" : "Credit Sales"}><DataTable rows={storeSales.filter((item) => item.paymentType === section)} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Product" }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "paidAmount", label: "Paid", value: (row) => row.paidAmount, render: (row) => money(row.paidAmount) }, { key: "due", label: "Due", value: (row) => row.total - row.paidAmount, render: (row) => money(row.total - row.paidAmount) }]}/></Panel> : null}
        {section === "customers" ? <ContactManager type="customer" business="store" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin}/> : null}
        {section === "customer-ledger" ? <CustomerLedgerManager business="store" data={data} commit={commit} addCashEntry={addCashEntry} openPrint={openPrint}/> : null}
        {section === "expenses" ? <ExpenseManager business="store" data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint}/> : null}
        {section === "staff" ? <BusinessStaffView business="store" data={data}/> : null}
        {section === "reports" ? <SimpleBusinessReport business="store" data={data} openPrint={openPrint}/> : null}
        {section === "settings" ? <Panel title="Super Store Settings"><InlineNotice>Product reorder levels, cost rates, sale rates and customer credit limits are managed from Products and Customers. System-wide settings are Admin controlled.</InlineNotice><div className="stats-grid compact"><StatCard label="Products" value={fmt(data.storeProducts.length)}/><StatCard label="Categories" value={fmt(categories.length)}/><StatCard label="Low Stock" value={fmt(data.storeProducts.filter((item) => item.stock <= item.reorderLevel).length)} tone="warning"/><StatCard label="Stock Value" value={money(inventoryValueForBusiness(data, "store"))}/></div></Panel> : null}
    </div>;
}
function GasPanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint, metrics }) {
    const [section, setSection] = useState("dashboard");
    const [productForm, setProductForm] = useState({ name: "", unit: "cylinders", stock: "0", reorderLevel: "10", costRate: "", saleRate: "" });
    const [purchaseForm, setPurchaseForm] = useState({ date: today(), invoiceNo: `GP-${1000 + data.gasPurchases.length + 1}`, supplierId: data.suppliers.find((item) => item.business === "gas")?.id || "", productId: data.gasProducts[0]?.id || "", quantity: "", rate: "", paymentType: "cash", paidAmount: "" });
    const [saleForm, setSaleForm] = useState({ date: today(), invoiceNo: `INV-G-${1000 + data.sales.filter((item) => item.business === "gas").length + 1}`, customerId: data.customers.find((item) => item.business === "gas")?.id || "", productId: data.gasProducts[0]?.id || "", quantity: "", rate: String(data.gasProducts[0]?.saleRate || ""), paymentType: "cash", paidAmount: "", dueDate: dateOffset(7) });
    const tabs = [["dashboard", "Dashboard"], ["products", "Cylinder Types"], ["suppliers", "Suppliers"], ["supplier-ledger", "Supplier Ledger"], ["purchase", "Purchase"], ["purchase-return", "Purchase Return"], ["stock", "Stock"], ["sales", "Sales"], ["customers", "Customers"], ["customer-ledger", "Customer Ledger"], ["expenses", "Expenses"], ["staff", "Staff"], ["reports", "Reports"], ["settings", "Settings"]];
    const addProduct = (event) => {
        event.preventDefault();
        if (!productForm.name.trim())
            return window.alert("Cylinder type is required.");
        if (data.gasProducts.some((item) => item.name.toLowerCase() === productForm.name.trim().toLowerCase()))
            return window.alert("This cylinder type already exists.");
        const stock = toNum(productForm.stock), reorderLevel = toNum(productForm.reorderLevel), costRate = toNum(productForm.costRate), saleRate = toNum(productForm.saleRate);
        if ([stock, reorderLevel, costRate, saleRate].some((value) => value < 0))
            return window.alert("Stock and rates cannot be negative.");
        const record = { id: uid(), name: productForm.name.trim(), unit: productForm.unit.trim() || "cylinders", stock, reorderLevel, costRate, saleRate };
        commit("Gas Management", "Add cylinder type", record.name, (current) => ({ ...current, gasProducts: [record, ...current.gasProducts] }));
        setProductForm({ name: "", unit: "cylinders", stock: "0", reorderLevel: "10", costRate: "", saleRate: "" });
    };
    const addPurchase = (event) => {
        event.preventDefault();
        if (!transactionDateIsAllowed(purchaseForm.date))
            return;
        if (!purchaseForm.invoiceNo.trim() || data.gasPurchases.some((item) => item.invoiceNo.toLowerCase() === purchaseForm.invoiceNo.trim().toLowerCase()))
            return window.alert("A unique purchase invoice number is required.");
        if (!purchaseForm.supplierId || !purchaseForm.productId)
            return window.alert("Supplier and cylinder type are required.");
        const quantity = toNum(purchaseForm.quantity), rate = toNum(purchaseForm.rate);
        if (!positiveAmount(quantity, "Quantity") || !positiveAmount(rate, "Rate"))
            return;
        const total = quantity * rate;
        const paidAmount = purchaseForm.paymentType === "cash" ? total : Math.min(toNum(purchaseForm.paidAmount), total);
        const record = { id: uid(), date: purchaseForm.date, invoiceNo: purchaseForm.invoiceNo.trim(), supplierId: purchaseForm.supplierId, productId: purchaseForm.productId, quantity, rate, paymentType: purchaseForm.paymentType, paidAmount };
        const product = data.gasProducts.find((item) => item.id === record.productId);
        commit("Gas Management", "Add purchase", `${record.invoiceNo} · ${product?.name}`, (current) => {
            let next = { ...current, gasPurchases: [record, ...current.gasPurchases], gasProducts: current.gasProducts.map((item) => item.id === record.productId ? { ...item, stock: item.stock + quantity, costRate: ((item.stock * item.costRate) + (quantity * rate)) / Math.max(item.stock + quantity, 1) } : item) };
            if (paidAmount > 0)
                next = addCashEntry(next, { date: record.date, type: "paid", business: "gas", category: "Cylinder Purchase", reference: record.invoiceNo, description: product?.name || "Gas purchase", amount: paidAmount });
            return next;
        });
        openPrint({ title: "Gas Purchase Invoice", subtitle: record.invoiceNo, fields: [["Date", record.date], ["Supplier", data.suppliers.find((item) => item.id === record.supplierId)?.name || "—"], ["Cylinder Type", product?.name || "—"], ["Quantity", String(quantity)], ["Rate", money(rate)], ["Total", money(total)], ["Paid", money(paidAmount)], ["Payable", money(total - paidAmount)]] });
        setPurchaseForm({ ...purchaseForm, invoiceNo: `GP-${1001 + data.gasPurchases.length}`, quantity: "", rate: "", paidAmount: "" });
    };
    const addSale = (event) => {
        event.preventDefault();
        if (!transactionDateIsAllowed(saleForm.date))
            return;
        if (!saleForm.invoiceNo.trim() || data.sales.some((item) => item.invoiceNo.toLowerCase() === saleForm.invoiceNo.trim().toLowerCase()))
            return window.alert("A unique sale invoice number is required.");
        const product = data.gasProducts.find((item) => item.id === saleForm.productId);
        const customer = data.customers.find((item) => item.id === saleForm.customerId && item.business === "gas");
        const quantity = toNum(saleForm.quantity), rate = toNum(saleForm.rate);
        if (!product || !positiveAmount(quantity, "Quantity") || !positiveAmount(rate, "Rate"))
            return;
        if (quantity > product.stock)
            return window.alert(`Insufficient Stock. Only ${product.stock} ${product.unit} are available.`);
        if (saleForm.paymentType === "credit" && !customer)
            return window.alert("A registered customer is required for a credit sale.");
        const total = quantity * rate;
        const paidAmount = saleForm.paymentType === "cash" ? total : Math.min(toNum(saleForm.paidAmount), total);
        if (customer && customer.creditLimit > 0 && customerOutstanding(data, customer.id) + total - paidAmount > customer.creditLimit && !window.confirm("This sale exceeds the customer's credit limit. Continue with supervisor approval?"))
            return;
        const record = { id: uid(), date: saleForm.date, business: "gas", invoiceNo: saleForm.invoiceNo.trim(), customerId: customer?.id || "", customerName: customer?.name || "Walk-in Customer", productId: product.id, productName: product.name, quantity, unit: product.unit, rate, total, paidAmount, paymentType: saleForm.paymentType, dueDate: saleForm.paymentType === "cash" ? "" : saleForm.dueDate, remarks: "Cylinder sale", costRate: product.costRate };
        commit("Gas Management", "Add sale", `${record.invoiceNo}: ${money(total)}`, (current) => {
            let next = { ...current, sales: [record, ...current.sales], gasProducts: current.gasProducts.map((item) => item.id === product.id ? { ...item, stock: item.stock - quantity } : item) };
            if (paidAmount > 0)
                next = addCashEntry(next, { date: record.date, type: "received", business: "gas", category: "Sales", reference: record.invoiceNo, description: `${record.customerName} - ${record.productName}`, amount: paidAmount });
            return next;
        });
        openPrint({ title: "Gas Sales Invoice", subtitle: record.invoiceNo, fields: [["Date", record.date], ["Customer", record.customerName], ["Cylinder", record.productName], ["Quantity", `${record.quantity} ${record.unit}`], ["Rate", money(record.rate)], ["Total", money(record.total)], ["Paid", money(record.paidAmount)], ["Balance", money(record.total - record.paidAmount)], ["Payment", titleCase(record.paymentType)]] });
        setSaleForm({ ...saleForm, invoiceNo: `INV-G-${1001 + data.sales.filter((item) => item.business === "gas").length}`, quantity: "", paidAmount: "" });
    };
    const gasSales = data.sales.filter((item) => item.business === "gas");
    return <div className="screen-stack"><ModuleTabs items={tabs} active={section} onChange={(key) => setSection(key)}/>
        {section === "dashboard" ? <BusinessDashboard business="gas" data={data} metrics={metrics} openPrint={openPrint}/> : null}
        {section === "products" ? <Panel title="Cylinder Types"><form className="form-grid wide" onSubmit={addProduct}><input placeholder="Cylinder name / size" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} required/><input placeholder="Unit" value={productForm.unit} onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })}/><input type="number" min="0" placeholder="Opening stock" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })}/><input type="number" min="0" placeholder="Reorder level" value={productForm.reorderLevel} onChange={(event) => setProductForm({ ...productForm, reorderLevel: event.target.value })}/><input type="number" min="0" step="0.01" placeholder="Cost rate" value={productForm.costRate} onChange={(event) => setProductForm({ ...productForm, costRate: event.target.value })}/><input type="number" min="0" step="0.01" placeholder="Sale rate" value={productForm.saleRate} onChange={(event) => setProductForm({ ...productForm, saleRate: event.target.value })}/><button>Add Cylinder Type</button></form><DataTable rows={data.gasProducts} columns={[{ key: "name", label: "Cylinder Type" }, { key: "stock", label: "Stock", value: (row) => row.stock, render: (row) => `${fmt(row.stock)} ${row.unit}` }, { key: "reorderLevel", label: "Reorder At", value: (row) => row.reorderLevel }, { key: "costRate", label: "Cost", value: (row) => row.costRate, render: (row) => money(row.costRate) }, { key: "saleRate", label: "Sale", value: (row) => row.saleRate, render: (row) => money(row.saleRate) }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("gasProducts", row.id, "Gas Management", "cylinder type")}>Delete</button> : <span className="muted-text">Protected</span> }]}/></Panel> : null}
        {section === "suppliers" ? <ContactManager type="supplier" business="gas" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin}/> : null}
        {section === "supplier-ledger" ? <SupplierLedgerManager business="gas" data={data} commit={commit} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint}/> : null}
        {section === "purchase" ? <Panel title="Cylinder Purchase"><form className="form-grid wide" onSubmit={addPurchase}><input type="date" value={purchaseForm.date} onChange={(event) => setPurchaseForm({ ...purchaseForm, date: event.target.value })}/><input placeholder="Invoice no" value={purchaseForm.invoiceNo} onChange={(event) => setPurchaseForm({ ...purchaseForm, invoiceNo: event.target.value })}/><select value={purchaseForm.supplierId} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplierId: event.target.value })}><option value="">Select supplier</option>{data.suppliers.filter((item) => item.business === "gas").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={purchaseForm.productId} onChange={(event) => setPurchaseForm({ ...purchaseForm, productId: event.target.value })}><option value="">Select cylinder</option>{data.gasProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" min="1" placeholder="Quantity" value={purchaseForm.quantity} onChange={(event) => setPurchaseForm({ ...purchaseForm, quantity: event.target.value })} required/><input type="number" min="0" step="0.01" placeholder="Rate" value={purchaseForm.rate} onChange={(event) => setPurchaseForm({ ...purchaseForm, rate: event.target.value })} required/><select value={purchaseForm.paymentType} onChange={(event) => setPurchaseForm({ ...purchaseForm, paymentType: event.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{purchaseForm.paymentType === "credit" ? <input type="number" min="0" placeholder="Paid amount" value={purchaseForm.paidAmount} onChange={(event) => setPurchaseForm({ ...purchaseForm, paidAmount: event.target.value })}/> : null}<button>Save & Print Purchase</button></form><DataTable rows={data.gasPurchases} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "productId", label: "Cylinder", value: (row) => data.gasProducts.find((item) => item.id === row.productId)?.name || "Unknown" }, { key: "quantity", label: "Qty", value: (row) => row.quantity }, { key: "total", label: "Total", value: (row) => row.quantity * row.rate, render: (row) => money(row.quantity * row.rate) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }]}/></Panel> : null}
        {section === "purchase-return" ? <PurchaseReturnManager business="gas" data={data} commit={commit} openPrint={openPrint}/> : null}
        {section === "stock" ? <Panel title="Cylinder Stock"><DataTable rows={data.gasProducts} columns={[{ key: "name", label: "Cylinder Type" }, { key: "stock", label: "Available", value: (row) => row.stock, render: (row) => `${fmt(row.stock)} ${row.unit}` }, { key: "reorderLevel", label: "Reorder At", value: (row) => row.reorderLevel }, { key: "value", label: "Stock Value", value: (row) => row.stock * row.costRate, render: (row) => money(row.stock * row.costRate) }, { key: "status", label: "Status", value: (row) => row.stock <= row.reorderLevel ? "Low Stock" : "Available", render: (row) => <span className={`status-badge ${row.stock <= row.reorderLevel ? "danger" : "success"}`}>{row.stock <= row.reorderLevel ? "Low Stock" : "Available"}</span> }]}/></Panel> : null}
        {section === "sales" ? <Panel title="Cylinder Sales"><form className="form-grid wide" onSubmit={addSale}><input type="date" value={saleForm.date} onChange={(event) => setSaleForm({ ...saleForm, date: event.target.value })}/><input placeholder="Invoice no" value={saleForm.invoiceNo} onChange={(event) => setSaleForm({ ...saleForm, invoiceNo: event.target.value })}/><select value={saleForm.customerId} onChange={(event) => setSaleForm({ ...saleForm, customerId: event.target.value })}><option value="">Walk-in Customer</option>{data.customers.filter((item) => item.business === "gas").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={saleForm.productId} onChange={(event) => { const product = data.gasProducts.find((item) => item.id === event.target.value); setSaleForm({ ...saleForm, productId: event.target.value, rate: String(product?.saleRate || "") }); }}><option value="">Select cylinder</option>{data.gasProducts.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stock})</option>)}</select><input type="number" min="1" placeholder="Quantity" value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })} required/><input type="number" min="0" step="0.01" placeholder="Rate" value={saleForm.rate} onChange={(event) => setSaleForm({ ...saleForm, rate: event.target.value })} required/><select value={saleForm.paymentType} onChange={(event) => setSaleForm({ ...saleForm, paymentType: event.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option></select>{saleForm.paymentType === "credit" ? <><input type="number" min="0" placeholder="Paid amount" value={saleForm.paidAmount} onChange={(event) => setSaleForm({ ...saleForm, paidAmount: event.target.value })}/><input type="date" value={saleForm.dueDate} onChange={(event) => setSaleForm({ ...saleForm, dueDate: event.target.value })}/></> : null}<button>Save & Print Invoice</button></form><DataTable rows={gasSales} columns={[{ key: "date", label: "Date" }, { key: "invoiceNo", label: "Invoice" }, { key: "customerName", label: "Customer" }, { key: "productName", label: "Cylinder" }, { key: "quantity", label: "Qty", value: (row) => row.quantity }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "paidAmount", label: "Paid", value: (row) => row.paidAmount, render: (row) => money(row.paidAmount) }, { key: "due", label: "Due", value: (row) => row.total - row.paidAmount, render: (row) => money(row.total - row.paidAmount) }, { key: "print", label: "Invoice", render: (row) => <button className="secondary-btn mini" onClick={() => openPrint({ title: "Gas Sales Invoice", subtitle: row.invoiceNo, fields: [["Date", row.date], ["Customer", row.customerName], ["Cylinder", row.productName], ["Quantity", String(row.quantity)], ["Total", money(row.total)], ["Paid", money(row.paidAmount)], ["Balance", money(row.total - row.paidAmount)]] })}>Print</button> }]}/></Panel> : null}
        {section === "customers" ? <ContactManager type="customer" business="gas" data={data} commit={commit} deleteRecord={deleteRecord} isAdmin={isAdmin}/> : null}
        {section === "customer-ledger" ? <CustomerLedgerManager business="gas" data={data} commit={commit} addCashEntry={addCashEntry} openPrint={openPrint}/> : null}
        {section === "expenses" ? <ExpenseManager business="gas" data={data} commit={commit} deleteRecord={deleteRecord} addCashEntry={addCashEntry} isAdmin={isAdmin} openPrint={openPrint}/> : null}
        {section === "staff" ? <BusinessStaffView business="gas" data={data}/> : null}
        {section === "reports" ? <SimpleBusinessReport business="gas" data={data} openPrint={openPrint}/> : null}
        {section === "settings" ? <Panel title="Gas Management Settings"><InlineNotice>Cylinder reorder levels and rates are maintained from Cylinder Types. Customer credit limits are maintained from Customers.</InlineNotice><div className="stats-grid compact"><StatCard label="Cylinder Types" value={fmt(data.gasProducts.length)}/><StatCard label="Current Stock" value={`${fmt(data.gasProducts.reduce((sum, item) => sum + item.stock, 0))} cylinders`}/><StatCard label="Low Stock" value={fmt(data.gasProducts.filter((item) => item.stock <= item.reorderLevel).length)} tone="warning"/><StatCard label="Stock Value" value={money(inventoryValueForBusiness(data, "gas"))}/></div></Panel> : null}
    </div>;
}
function CashBookPanel({ data, commit, deleteRecord, metrics, openPrint, isAdmin }) {
    const [section, setSection] = useState("entries");
    const [entryForm, setEntryForm] = useState({ date: today(), type: "received", business: "common", category: "Other", reference: "", description: "", amount: "" });
    const [dailyForm, setDailyForm] = useState({ date: today(), business: "all", notes: "" });
    const [monthlyForm, setMonthlyForm] = useState({ month: today().slice(0, 7), business: "all", notes: "" });
    const tabs = [["entries", "Cash Entries"], ["daily", "Daily Closing"], ["monthly", "Monthly Closing"], ["closing-history", "Closing History"]];
    const businesses = ["all", "feed", "chakki", "petrol", "store", "gas", "common"];
    const scopedCashEntries = (business, from, to) => data.cashEntries.filter((item) => (business === "all" || item.business === business) && inRange(item.date, from, to));
    const getOpeningBalance = (date, business) => {
        const previous = data.closings.filter((item) => item.period === "daily" && item.status !== "reopened" && item.date < date && item.business === business).sort((a, b) => b.date.localeCompare(a.date))[0];
        if (previous)
            return previous.closingBalance;
        return business === "all" || business === "common" ? data.settings.openingCashBalance : 0;
    };
    const addEntry = (event) => {
        event.preventDefault();
        if (!transactionDateIsAllowed(entryForm.date) || !positiveAmount(toNum(entryForm.amount), "Amount"))
            return;
        if (!entryForm.category.trim() || !entryForm.description.trim())
            return window.alert("Category and description are required.");
        const record = { id: uid(), date: entryForm.date, type: entryForm.type, business: entryForm.business, category: entryForm.category.trim(), reference: entryForm.reference.trim() || `CB-${Date.now().toString().slice(-6)}`, description: entryForm.description.trim(), amount: toNum(entryForm.amount) };
        commit("Cash Book", "Add cash entry", `${record.reference}: ${money(record.amount)}`, (current) => ({ ...current, cashEntries: [record, ...current.cashEntries] }));
        setEntryForm({ ...entryForm, reference: "", description: "", amount: "" });
    };
    const createDailyClosing = (event) => {
        event.preventDefault();
        const { date, business } = dailyForm;
        if (!transactionDateIsAllowed(date))
            return;
        if (data.closings.some((item) => item.period === "daily" && item.date === date && item.business === business && item.status !== "reopened"))
            return window.alert("This day is already closed for the selected business.");
        const from = date, to = date;
        const businessKeys = business === "all" ? ["feed", "chakki", "petrol", "store", "gas"] : business === "common" ? [] : [business];
        const totals = businessKeys.reduce((acc, key) => {
            const value = getBusinessTotals(data, key, from, to);
            return { sales: acc.sales + value.sales, cashSales: acc.cashSales + value.cashSales, creditSales: acc.creditSales + value.creditSales, expenses: acc.expenses + value.expenses, profit: acc.profit + value.profit, purchases: acc.purchases + value.purchases, creditRecovery: acc.creditRecovery + value.creditRecovery };
        }, { sales: 0, cashSales: 0, creditSales: 0, expenses: 0, profit: 0, purchases: 0, creditRecovery: 0 });
        const entries = scopedCashEntries(business, from, to);
        const received = entries.filter((item) => item.type === "received").reduce((sum, item) => sum + item.amount, 0);
        const paid = entries.filter((item) => item.type === "paid" || item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
        const openingBalance = getOpeningBalance(date, business);
        const closingBalance = openingBalance + received - paid;
        const record = { id: uid(), date, period: "daily", business, openingBalance, received, paid, closingBalance, notes: dailyForm.notes, cashSales: totals.cashSales, creditSales: totals.creditSales, creditRecovery: totals.creditRecovery, expenses: totals.expenses, purchases: totals.purchases, sales: totals.sales, profit: totals.profit, status: "closed", lockedBy: "Authorized User", lockedAt: new Date().toISOString() };
        commit("Daily Closing", "Close day", `${date} · ${businessLabel(business)}`, (current) => ({ ...current, closings: [record, ...current.closings] }));
        openPrint({ title: "Daily Closing Summary", subtitle: `${date} · ${businessLabel(business)}`, fields: [["Opening Cash", money(openingBalance)], ["Cash Sales", money(totals.cashSales)], ["Credit Sales", money(totals.creditSales)], ["Credit Recovery", money(totals.creditRecovery)], ["Cash Received", money(received)], ["Cash Paid / Expenses", money(paid)], ["Sales", money(totals.sales)], ["Expenses", money(totals.expenses)], ["Profit", money(totals.profit)], ["Closing Cash", money(closingBalance)]], footer: "Transactions for this date are now locked for normal users." });
    };
    const prepareOpenTransactionDays = () => {
        const { month, business } = monthlyForm;
        if (!month || month > today().slice(0, 7))
            return window.alert("Select a valid current or past month.");
        const dates = Array.from(new Set([
            ...data.sales.filter((item) => item.date.startsWith(month) && (business === "all" || item.business === business)).map((item) => item.date),
            ...data.expenses.filter((item) => item.date.startsWith(month) && (business === "all" || item.business === business)).map((item) => item.date),
            ...data.cashEntries.filter((item) => item.date.startsWith(month) && (business === "all" || item.business === business)).map((item) => item.date),
            ...(business === "all" || business === "petrol" ? data.machineReadings.filter((item) => item.date.startsWith(month)).map((item) => item.date) : []),
            ...(business === "all" || business === "chakki" ? data.grindingJobs.filter((item) => item.date.startsWith(month)).map((item) => item.date) : []),
        ])).sort();
        const openDates = dates.filter((date) => !data.closings.some((item) => item.period === "daily" && item.date === date && item.status !== "reopened" && (item.business === business || item.business === "all")));
        if (!openDates.length)
            return window.alert("All transaction dates for this month are already closed.");
        if (!window.confirm(`Create reviewed Daily Closing records for ${openDates.length} open transaction day(s)?`))
            return;
        commit("Daily Closing", "Prepare monthly transaction days", `${month} · ${businessLabel(business)} · ${openDates.length} days`, (current) => {
            let previousClosing = current.closings.filter((item) => item.period === "daily" && item.status !== "reopened" && item.business === business && item.date < openDates[0]).sort((a, b) => b.date.localeCompare(a.date))[0]?.closingBalance ?? (business === "all" || business === "common" ? current.settings.openingCashBalance : 0);
            const created = openDates.map((date) => {
                const keys = business === "all" ? ["feed", "chakki", "petrol", "store", "gas"] : business === "common" ? [] : [business];
                const totals = keys.reduce((acc, key) => { const value = getBusinessTotals(current, key, date, date); return { sales: acc.sales + value.sales, cashSales: acc.cashSales + value.cashSales, creditSales: acc.creditSales + value.creditSales, creditRecovery: acc.creditRecovery + value.creditRecovery, expenses: acc.expenses + value.expenses, purchases: acc.purchases + value.purchases, profit: acc.profit + value.profit }; }, { sales: 0, cashSales: 0, creditSales: 0, creditRecovery: 0, expenses: 0, purchases: 0, profit: 0 });
                const entries = current.cashEntries.filter((item) => item.date === date && (business === "all" || item.business === business));
                const received = entries.filter((item) => item.type === "received").reduce((sum, item) => sum + item.amount, 0);
                const paid = entries.filter((item) => item.type === "paid" || item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
                const closingBalance = previousClosing + received - paid;
                const record = { id: uid(), date, period: "daily", business, openingBalance: previousClosing, received, paid, closingBalance, notes: "Prepared for monthly closing review", cashSales: totals.cashSales, creditSales: totals.creditSales, creditRecovery: totals.creditRecovery, expenses: totals.expenses, purchases: totals.purchases, sales: totals.sales, profit: totals.profit, status: "closed", lockedBy: "Authorized User", lockedAt: new Date().toISOString() };
                previousClosing = closingBalance;
                return record;
            });
            return { ...current, closings: [...created.reverse(), ...current.closings] };
        });
    };
    const createMonthlyClosing = (event) => {
        event.preventDefault();
        const { month, business } = monthlyForm;
        if (!month)
            return window.alert("Month is required.");
        if (month > today().slice(0, 7))
            return window.alert("A future month cannot be closed.");
        if (data.closings.some((item) => item.period === "monthly" && item.date.slice(0, 7) === month && item.business === business && item.status !== "reopened"))
            return window.alert("This month is already closed for the selected business.");
        const transactionDates = Array.from(new Set([
            ...data.sales.filter((item) => item.date.startsWith(month) && (business === "all" || item.business === business)).map((item) => item.date),
            ...data.expenses.filter((item) => item.date.startsWith(month) && (business === "all" || item.business === business)).map((item) => item.date),
            ...data.cashEntries.filter((item) => item.date.startsWith(month) && (business === "all" || item.business === business)).map((item) => item.date),
            ...(business === "all" || business === "petrol" ? data.machineReadings.filter((item) => item.date.startsWith(month)).map((item) => item.date) : []),
            ...(business === "all" || business === "chakki" ? data.grindingJobs.filter((item) => item.date.startsWith(month)).map((item) => item.date) : []),
        ])).sort();
        const unclosed = transactionDates.filter((date) => !data.closings.some((item) => item.period === "daily" && item.date === date && item.status !== "reopened" && (item.business === business || item.business === "all")));
        if (unclosed.length)
            return window.alert(`Monthly Closing blocked. Close these transaction days first: ${unclosed.join(", ")}`);
        const from = `${month}-01`;
        const endDate = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).toISOString().slice(0, 10);
        const businessKeys = business === "all" ? ["feed", "chakki", "petrol", "store", "gas"] : business === "common" ? [] : [business];
        const totals = businessKeys.reduce((acc, key) => {
            const value = getBusinessTotals(data, key, from, endDate);
            return { sales: acc.sales + value.sales, expenses: acc.expenses + value.expenses, profit: acc.profit + value.profit, purchases: acc.purchases + value.purchases };
        }, { sales: 0, expenses: 0, profit: 0, purchases: 0 });
        const daily = data.closings.filter((item) => item.period === "daily" && item.date.startsWith(month) && item.status !== "reopened" && (business === "all" || item.business === business));
        const openingBalance = daily.sort((a, b) => a.date.localeCompare(b.date))[0]?.openingBalance || getOpeningBalance(from, business);
        const closingBalance = daily.sort((a, b) => b.date.localeCompare(a.date))[0]?.closingBalance || openingBalance;
        const openingStock = businessKeys.reduce((sum, key) => sum + inventoryValueForBusiness(data, key, metrics.petrolStock, metrics.dieselStock), 0);
        const closingStock = Math.max(openingStock + totals.purchases - Math.max(totals.sales - totals.profit - totals.expenses, 0), 0);
        const record = { id: uid(), date: `${month}-01`, period: "monthly", business, openingBalance, received: daily.reduce((sum, item) => sum + item.received, 0), paid: daily.reduce((sum, item) => sum + item.paid, 0), closingBalance, notes: monthlyForm.notes, purchases: totals.purchases, sales: totals.sales, expenses: totals.expenses, profit: totals.profit, openingStock, closingStock, status: "closed", lockedBy: "Authorized User", lockedAt: new Date().toISOString() };
        commit("Monthly Closing", "Close month", `${month} · ${businessLabel(business)}`, (current) => {
            const distributions = (business === "feed" || business === "all") && totals.profit > 0 ? current.partners.filter((partner) => partner.status === "active").map((partner) => ({ id: uid(), date: today(), month, partnerId: partner.id, profitAmount: totals.profit, sharePercent: partner.sharePercent, shareAmount: totals.profit * partner.sharePercent / 100, closingId: record.id })) : [];
            return { ...current, closings: [record, ...current.closings], profitDistributions: [...distributions, ...current.profitDistributions] };
        });
        openPrint({ title: "Monthly Closing Report", subtitle: `${month} · ${businessLabel(business)}`, fields: [["Opening Cash", money(openingBalance)], ["Purchases", money(totals.purchases)], ["Sales", money(totals.sales)], ["Expenses", money(totals.expenses)], ["Profit", money(totals.profit)], ["Opening Stock Value", money(openingStock)], ["Closing Stock Value", money(closingStock)], ["Closing Cash", money(closingBalance)]], footer: business === "feed" || business === "all" ? "Feed Unit partner profit sharing has been calculated from this locked profit figure." : "Monthly records are locked." });
    };
    const reopenClosing = (record) => {
        if (!isAdmin)
            return window.alert("Only Admin can reopen a closing.");
        const reason = window.prompt("Enter the mandatory reason for reopening this closed period:", "")?.trim();
        if (!reason)
            return;
        commit(record.period === "daily" ? "Daily Closing" : "Monthly Closing", "Reopen closed period", `${record.date} · ${businessLabel(record.business)} · ${reason}`, (current) => ({ ...current, closings: current.closings.map((item) => item.id === record.id ? { ...item, status: "reopened", reopenReason: reason } : item) }));
    };
    const entrySummary = data.cashEntries.reduce((acc, item) => { if (item.type === "received")
        acc.received += item.amount;
    else
        acc.paid += item.amount; return acc; }, { received: 0, paid: 0 });
    return <div className="screen-stack"><ModuleTabs items={tabs} active={section} onChange={(key) => setSection(key)}/>
        {section === "entries" ? <><div className="stats-grid compact"><StatCard label="Opening Balance" value={money(data.settings.openingCashBalance)}/><StatCard label="Cash Received" value={money(entrySummary.received)} tone="success"/><StatCard label="Cash Paid + Expenses" value={money(entrySummary.paid)} tone="danger"/><StatCard label="Current Cash In Hand" value={money(metrics.cashBalance)}/></div><Panel title="Cash Book Entries"><form className="form-grid wide" onSubmit={addEntry}><input type="date" value={entryForm.date} onChange={(event) => setEntryForm({ ...entryForm, date: event.target.value })}/><select value={entryForm.business} onChange={(event) => setEntryForm({ ...entryForm, business: event.target.value })}>{businesses.filter((item) => item !== "all").map((item) => <option key={item} value={item}>{businessLabel(item)}</option>)}</select><select value={entryForm.type} onChange={(event) => setEntryForm({ ...entryForm, type: event.target.value })}><option value="opening">Opening</option><option value="received">Cash Received</option><option value="paid">Cash Paid</option><option value="expense">Expense</option></select><input placeholder="Category" value={entryForm.category} onChange={(event) => setEntryForm({ ...entryForm, category: event.target.value })}/><input placeholder="Reference" value={entryForm.reference} onChange={(event) => setEntryForm({ ...entryForm, reference: event.target.value })}/><input placeholder="Description" value={entryForm.description} onChange={(event) => setEntryForm({ ...entryForm, description: event.target.value })} required/><input type="number" min="0" step="0.01" placeholder="Amount" value={entryForm.amount} onChange={(event) => setEntryForm({ ...entryForm, amount: event.target.value })} required/><button>Add Entry</button></form><DataTable rows={data.cashEntries} columns={[{ key: "date", label: "Date" }, { key: "business", label: "Business", render: (row) => businessLabel(row.business) }, { key: "type", label: "Type", render: (row) => titleCase(row.type) }, { key: "category", label: "Category" }, { key: "reference", label: "Reference" }, { key: "description", label: "Description" }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("cashEntries", row.id, "Cash Book", "cash entry")}>Delete</button> : <span className="muted-text">Locked by role</span> }]}/></Panel></> : null}
        {section === "daily" ? <Panel title="Daily Closing"><InlineNotice>Closing Balance = Opening Balance + Cash Received − Cash Paid − Expenses. Saving locks that date for normal users.</InlineNotice><form className="form-grid wide" onSubmit={createDailyClosing}><input type="date" value={dailyForm.date} onChange={(event) => setDailyForm({ ...dailyForm, date: event.target.value })}/><select value={dailyForm.business} onChange={(event) => setDailyForm({ ...dailyForm, business: event.target.value })}>{businesses.map((item) => <option key={item} value={item}>{businessLabel(item)}</option>)}</select><input placeholder="Closing notes" value={dailyForm.notes} onChange={(event) => setDailyForm({ ...dailyForm, notes: event.target.value })}/><button>Calculate, Close & Print</button></form></Panel> : null}
        {section === "monthly" ? <Panel title="Monthly Closing"><InlineNotice tone="warning">Monthly closing is blocked until every transaction date in the selected month has a completed Daily Closing. Feed Unit closing also creates partner profit distribution records.</InlineNotice><form className="form-grid wide" onSubmit={createMonthlyClosing}><input type="month" value={monthlyForm.month} onChange={(event) => setMonthlyForm({ ...monthlyForm, month: event.target.value })}/><select value={monthlyForm.business} onChange={(event) => setMonthlyForm({ ...monthlyForm, business: event.target.value })}>{businesses.map((item) => <option key={item} value={item}>{businessLabel(item)}</option>)}</select><input placeholder="Month-end notes" value={monthlyForm.notes} onChange={(event) => setMonthlyForm({ ...monthlyForm, notes: event.target.value })}/><div className="row-actions"><button type="button" className="secondary-btn" onClick={prepareOpenTransactionDays}>Prepare Open Transaction Days</button><button>Validate, Close & Print</button></div></form><DataTable rows={data.profitDistributions} columns={[{ key: "month", label: "Month" }, { key: "partnerId", label: "Partner", value: (row) => data.partners.find((item) => item.id === row.partnerId)?.name || "Unknown" }, { key: "profitAmount", label: "Locked Profit", value: (row) => row.profitAmount, render: (row) => money(row.profitAmount) }, { key: "sharePercent", label: "Share %", value: (row) => row.sharePercent }, { key: "shareAmount", label: "Profit Share", value: (row) => row.shareAmount, render: (row) => money(row.shareAmount) }]}/></Panel> : null}
        {section === "closing-history" ? <Panel title="Closing History"><DataTable rows={data.closings} columns={[{ key: "date", label: "Period" }, { key: "period", label: "Type", render: (row) => titleCase(row.period) }, { key: "business", label: "Business", render: (row) => businessLabel(row.business) }, { key: "openingBalance", label: "Opening", value: (row) => row.openingBalance, render: (row) => money(row.openingBalance) }, { key: "received", label: "Received", value: (row) => row.received, render: (row) => money(row.received) }, { key: "paid", label: "Paid", value: (row) => row.paid, render: (row) => money(row.paid) }, { key: "closingBalance", label: "Closing", value: (row) => row.closingBalance, render: (row) => money(row.closingBalance) }, { key: "status", label: "Status", render: (row) => <span className={`status-badge ${row.status === "reopened" ? "warning" : "success"}`}>{titleCase(row.status || "closed")}</span> }, { key: "actions", label: "Actions", render: (row) => <div className="row-actions"><button className="secondary-btn mini" onClick={() => openPrint({ title: `${titleCase(row.period)} Closing Report`, subtitle: `${row.date} · ${businessLabel(row.business)}`, fields: [["Opening", money(row.openingBalance)], ["Received", money(row.received)], ["Paid", money(row.paid)], ["Closing", money(row.closingBalance)], ["Sales", money(row.sales || 0)], ["Expenses", money(row.expenses || 0)], ["Profit", money(row.profit || 0)], ["Status", titleCase(row.status || "closed")]] })}>Print</button>{row.status !== "reopened" ? <button className="text-danger" onClick={() => reopenClosing(row)} disabled={!isAdmin}>Reopen</button> : null}</div> }]}/></Panel> : null}
    </div>;
}
function StaffPanel({ data, commit, deleteRecord, addCashEntry, isAdmin, openPrint }) {
    const [section, setSection] = useState("staff");
    const [businessFilter, setBusinessFilter] = useState("all");
    const [staffForm, setStaffForm] = useState({ business: "feed", name: "", roleTitle: "Staff", phone: "", monthlySalary: "", joiningDate: today(), status: "active" });
    const [salaryForm, setSalaryForm] = useState({ date: today(), staffId: data.staff[0]?.id || "", month: today().slice(0, 7), amount: String(data.staff[0]?.monthlySalary || ""), status: "paid", notes: "" });
    const tabs = [["staff", "Staff"], ["salary", "Salary"], ["salary-history", "Salary History"]];
    const addStaff = (event) => {
        event.preventDefault();
        if (!staffForm.name.trim() || !staffForm.phone.trim())
            return window.alert("Staff name and phone are required.");
        if (!transactionDateIsAllowed(staffForm.joiningDate) || !positiveAmount(toNum(staffForm.monthlySalary), "Monthly salary"))
            return;
        if (data.staff.some((item) => item.phone && item.phone === staffForm.phone.trim()))
            return window.alert("A staff member with this phone number already exists.");
        const record = { id: uid(), business: staffForm.business, name: staffForm.name.trim(), roleTitle: staffForm.roleTitle.trim() || "Staff", phone: staffForm.phone.trim(), monthlySalary: toNum(staffForm.monthlySalary), joiningDate: staffForm.joiningDate, status: staffForm.status };
        commit("Staff", "Add staff member", record.name, (current) => ({ ...current, staff: [record, ...current.staff] }));
        setStaffForm({ business: "feed", name: "", roleTitle: "Staff", phone: "", monthlySalary: "", joiningDate: today(), status: "active" });
    };
    const paySalary = (event) => {
        event.preventDefault();
        const member = data.staff.find((item) => item.id === salaryForm.staffId);
        if (!member || !transactionDateIsAllowed(salaryForm.date) || !positiveAmount(toNum(salaryForm.amount), "Salary amount"))
            return;
        if (!salaryForm.month || salaryForm.month > today().slice(0, 7))
            return window.alert("Salary month cannot be in the future.");
        if (data.salaryPayments.some((item) => item.staffId === member.id && item.month === salaryForm.month && item.status === "paid") && salaryForm.status === "paid")
            return window.alert("Salary has already been paid for this employee and month.");
        const record = { id: uid(), date: salaryForm.date, staffId: salaryForm.staffId, month: salaryForm.month, amount: toNum(salaryForm.amount), status: salaryForm.status, notes: salaryForm.notes };
        commit("Staff", `${record.status === "paid" ? "Pay" : "Record pending"} salary`, `${member.name}: ${money(record.amount)}`, (current) => {
            let next = { ...current, salaryPayments: [record, ...current.salaryPayments] };
            if (record.status === "paid")
                next = addCashEntry(next, { date: record.date, type: "paid", business: member.business, category: "Salary", reference: record.id, description: `${member.name} salary ${record.month}`, amount: record.amount });
            return next;
        });
        openPrint({ title: "Salary Receipt", subtitle: record.month, fields: [["Date", record.date], ["Employee", member.name], ["Business", businessLabel(member.business)], ["Role", member.roleTitle], ["Salary Month", record.month], ["Amount", money(record.amount)], ["Status", titleCase(record.status)], ["Notes", record.notes || "—"]], footer: "PK Business ERP Suite" });
        setSalaryForm({ ...salaryForm, amount: String(member.monthlySalary), notes: "" });
    };
    const staffRows = data.staff.filter((item) => businessFilter === "all" || item.business === businessFilter);
    return <div className="screen-stack"><ModuleTabs items={tabs} active={section} onChange={(key) => setSection(key)}/>
    {section === "staff" ? <Panel title="Staff Management"><form className="form-grid wide" onSubmit={addStaff}><select value={staffForm.business} onChange={(event) => setStaffForm({ ...staffForm, business: event.target.value })}><option value="feed">Feed Unit</option><option value="chakki">Chakki</option><option value="petrol">Petrol Pump</option><option value="store">Super Store</option><option value="gas">Gas Management</option><option value="common">Common</option></select><input placeholder="Staff name" value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} required/><input placeholder="Role / designation" value={staffForm.roleTitle} onChange={(event) => setStaffForm({ ...staffForm, roleTitle: event.target.value })}/><input placeholder="Phone" value={staffForm.phone} onChange={(event) => setStaffForm({ ...staffForm, phone: event.target.value })}/><input type="number" min="0" placeholder="Monthly salary" value={staffForm.monthlySalary} onChange={(event) => setStaffForm({ ...staffForm, monthlySalary: event.target.value })} required/><input type="date" value={staffForm.joiningDate} onChange={(event) => setStaffForm({ ...staffForm, joiningDate: event.target.value })}/><select value={staffForm.status} onChange={(event) => setStaffForm({ ...staffForm, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select><button>Add Staff</button></form><DataTable rows={staffRows} filterLabel="Business" filterValue={businessFilter} filterOptions={["all", "feed", "chakki", "petrol", "store", "gas", "common"]} onFilterChange={setBusinessFilter} columns={[{ key: "business", label: "Business", render: (row) => businessLabel(row.business) }, { key: "name", label: "Name" }, { key: "roleTitle", label: "Role" }, { key: "phone", label: "Phone" }, { key: "monthlySalary", label: "Salary", value: (row) => row.monthlySalary, render: (row) => money(row.monthlySalary) }, { key: "joiningDate", label: "Joining" }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }, { key: "actions", label: "Actions", render: (row) => isAdmin ? <button className="text-danger" onClick={() => deleteRecord("staff", row.id, "Staff", "staff member")}>Delete</button> : <span className="muted-text">View only</span> }]}/></Panel> : null}
    {section === "salary" ? <Panel title="Salary"><form className="form-grid wide" onSubmit={paySalary}><input type="date" value={salaryForm.date} onChange={(event) => setSalaryForm({ ...salaryForm, date: event.target.value })}/><select value={salaryForm.staffId} onChange={(event) => { const member = data.staff.find((item) => item.id === event.target.value); setSalaryForm({ ...salaryForm, staffId: event.target.value, amount: String(member?.monthlySalary || "") }); }}>{data.staff.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {businessLabel(item.business)}</option>)}</select><input type="month" value={salaryForm.month} onChange={(event) => setSalaryForm({ ...salaryForm, month: event.target.value })}/><input type="number" min="0" placeholder="Amount" value={salaryForm.amount} onChange={(event) => setSalaryForm({ ...salaryForm, amount: event.target.value })} required/><select value={salaryForm.status} onChange={(event) => setSalaryForm({ ...salaryForm, status: event.target.value })}><option value="paid">Paid</option><option value="pending">Pending</option></select><input placeholder="Notes" value={salaryForm.notes} onChange={(event) => setSalaryForm({ ...salaryForm, notes: event.target.value })}/><button>Save & Print Salary</button></form><div className="stats-grid compact"><StatCard label="Active Monthly Payroll" value={money(data.staff.filter((item) => item.status === "active").reduce((sum, item) => sum + item.monthlySalary, 0))}/><StatCard label="Paid This Month" value={money(data.salaryPayments.filter((item) => item.month === today().slice(0, 7) && item.status === "paid").reduce((sum, item) => sum + item.amount, 0))}/><StatCard label="Pending Entries" value={fmt(data.salaryPayments.filter((item) => item.status === "pending").length)}/><StatCard label="Active Staff" value={fmt(data.staff.filter((item) => item.status === "active").length)}/></div></Panel> : null}
    {section === "salary-history" ? <Panel title="Salary History" actions={<button className="secondary-btn" onClick={() => openPrint({ title: "Salary Report", subtitle: `Generated ${today()}`, columns: ["Date", "Month", "Employee", "Business", "Amount", "Status"], rows: data.salaryPayments.map((item) => { const member = data.staff.find((staff) => staff.id === item.staffId); return [item.date, item.month, member?.name || "Unknown", member ? businessLabel(member.business) : "—", money(item.amount), titleCase(item.status)]; }), footer: `Total Paid: ${money(data.salaryPayments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0))}` })}>Print Salary Report</button>}><DataTable rows={data.salaryPayments} columns={[{ key: "date", label: "Date" }, { key: "month", label: "Month" }, { key: "staffId", label: "Employee", value: (row) => data.staff.find((item) => item.id === row.staffId)?.name || "Unknown" }, { key: "business", label: "Business", value: (row) => { const member = data.staff.find((item) => item.id === row.staffId); return member ? businessLabel(member.business) : "—"; } }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }, { key: "notes", label: "Notes" }]}/></Panel> : null}
  </div>;
}
function ReportsPanel({ data, metrics, openPrint }) {
    const [period, setPeriod] = useState("monthly");
    const [reportType, setReportType] = useState("sales");
    const [business, setBusiness] = useState("all");
    const [selectedDate, setSelectedDate] = useState(today());
    const range = useMemo(() => {
        if (period === "daily")
            return { from: selectedDate, to: selectedDate, label: selectedDate };
        if (period === "monthly") {
            const month = selectedDate.slice(0, 7);
            return { from: `${month}-01`, to: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).toISOString().slice(0, 10), label: month };
        }
        const year = selectedDate.slice(0, 4);
        return { from: `${year}-01-01`, to: `${year}-12-31`, label: year };
    }, [period, selectedDate]);
    const matchBusiness = (value) => business === "all" || value === business;
    const matchRange = (date) => inRange(date, range.from, range.to);
    const salesRows = [
        ...data.sales.filter((item) => matchRange(item.date) && matchBusiness(item.business)).map((item) => ({ id: item.id, date: item.date, business: businessLabel(item.business), reference: item.invoiceNo, party: item.customerName, detail: item.productName, total: item.total, paid: item.paidAmount, due: Math.max(item.total - item.paidAmount, 0) })),
        ...data.grindingJobs.filter((item) => matchRange(item.date) && matchBusiness("chakki")).map((item) => ({ id: item.id, date: item.date, business: "Chakki", reference: item.receiptNo, party: item.customerName, detail: `Grinding Service ${fmt(item.weightKg)} KG`, total: item.charges, paid: item.paidAmount, due: Math.max(item.charges - item.paidAmount, 0) })),
        ...data.machineReadings.filter((item) => matchRange(item.date) && matchBusiness("petrol")).map((item) => ({ id: item.id, date: item.date, business: "Petrol Pump", reference: `${item.machine}-${item.id.slice(-5)}`, party: item.customerName || "Walk-in Customer", detail: `${titleCase(item.fuelType)} ${fmt(soldLiters(item))} L`, total: readingAmount(item), paid: item.paidAmount, due: Math.max(readingAmount(item) - item.paidAmount, 0) })),
    ];
    const purchaseRows = [
        ...data.rawMaterialPurchases.filter((item) => matchRange(item.date) && matchBusiness("feed")).map((item) => ({ id: item.id, date: item.date, business: "Feed Unit", invoice: item.invoiceNo, supplier: data.suppliers.find((supplier) => supplier.id === item.supplierId)?.name || "Unknown", item: data.rawMaterials.find((product) => product.id === item.materialId)?.name || "Raw Material", quantity: `${fmt(item.quantity)} kg`, total: item.quantity * item.rate, paid: item.paidAmount })),
        ...data.fuelPurchases.filter((item) => matchRange(item.date) && matchBusiness("petrol")).map((item) => ({ id: item.id, date: item.date, business: "Petrol Pump", invoice: item.invoiceNo, supplier: data.suppliers.find((supplier) => supplier.id === item.supplierId)?.name || "Unknown", item: titleCase(item.fuelType), quantity: `${fmt(item.liters)} L`, total: item.liters * item.rate, paid: item.paidAmount })),
        ...data.storePurchases.filter((item) => matchRange(item.date) && matchBusiness("store")).map((item) => ({ id: item.id, date: item.date, business: "Super Store", invoice: item.invoiceNo, supplier: data.suppliers.find((supplier) => supplier.id === item.supplierId)?.name || "Unknown", item: data.storeProducts.find((product) => product.id === item.productId)?.name || "Product", quantity: String(item.quantity), total: item.quantity * item.rate, paid: item.paidAmount })),
        ...data.gasPurchases.filter((item) => matchRange(item.date) && matchBusiness("gas")).map((item) => ({ id: item.id, date: item.date, business: "Gas Management", invoice: item.invoiceNo, supplier: data.suppliers.find((supplier) => supplier.id === item.supplierId)?.name || "Unknown", item: data.gasProducts.find((product) => product.id === item.productId)?.name || "Cylinder", quantity: String(item.quantity), total: item.quantity * item.rate, paid: item.paidAmount })),
    ];
    const expenseRows = data.expenses.filter((item) => matchRange(item.date) && matchBusiness(item.business));
    const cashRows = data.cashEntries.filter((item) => matchRange(item.date) && (business === "all" || item.business === business));
    const creditRows = salesRows.filter((item) => item.due > 0);
    const customerLedger = data.customers.filter((item) => business === "all" || item.business === business).map((customer) => ({ id: customer.id, business: businessLabel(customer.business), name: customer.name, phone: customer.phone, opening: customer.openingBalance, recovered: data.creditPayments.filter((item) => item.customerId === customer.id).reduce((sum, item) => sum + item.amount, 0), balance: customerOutstanding(data, customer.id), creditLimit: customer.creditLimit }));
    const supplierLedger = data.suppliers.filter((item) => business === "all" || item.business === business).map((supplier) => ({ id: supplier.id, business: businessLabel(supplier.business), name: supplier.name, phone: supplier.phone, opening: supplier.openingBalance, paid: data.supplierPayments.filter((item) => item.supplierId === supplier.id).reduce((sum, item) => sum + item.amount, 0), balance: supplierOutstanding(data, supplier.id) }));
    const inventoryRows = [
        ...data.rawMaterials.map((item) => ({ id: `rm-${item.id}`, key: "feed", business: "Feed Unit", item: item.name, quantity: `${fmt(item.stock)} ${item.unit}`, value: item.stock * item.averageRate, status: item.stock <= item.reorderLevel ? "Low Stock" : "Available" })),
        ...data.bagInventory.map((item) => ({ id: `bag-${item.id}`, key: "feed", business: "Feed Unit", item: `${item.productName} ${item.bagSize} KG`, quantity: `${item.quantity} bags`, value: item.quantity * item.costRate, status: item.quantity <= item.reorderLevel ? "Low Stock" : "Available" })),
        ...data.flourProducts.map((item) => ({ id: `flour-${item.id}`, key: "chakki", business: "Chakki", item: item.name, quantity: `${item.stock} bags`, value: item.stock * item.costRate, status: item.stock <= item.reorderLevel ? "Low Stock" : "Available" })),
        ...data.storeProducts.map((item) => ({ id: `store-${item.id}`, key: "store", business: "Super Store", item: item.name, quantity: `${item.stock} pcs`, value: item.stock * item.costRate, status: item.stock <= item.reorderLevel ? "Low Stock" : "Available" })),
        ...data.gasProducts.map((item) => ({ id: `gas-${item.id}`, key: "gas", business: "Gas Management", item: item.name, quantity: `${item.stock} ${item.unit}`, value: item.stock * item.costRate, status: item.stock <= item.reorderLevel ? "Low Stock" : "Available" })),
        { id: "fuel-petrol", key: "petrol", business: "Petrol Pump", item: "Petrol Tank", quantity: `${fmt(metrics.petrolStock)} L`, value: metrics.petrolStock * latestFuelCost(data, "petrol"), status: metrics.petrolStock <= data.settings.petrolReorderLevel ? "Low Stock" : "Available" },
        { id: "fuel-diesel", key: "petrol", business: "Petrol Pump", item: "Diesel Tank", quantity: `${fmt(metrics.dieselStock)} L`, value: metrics.dieselStock * latestFuelCost(data, "diesel"), status: metrics.dieselStock <= data.settings.dieselReorderLevel ? "Low Stock" : "Available" },
    ].filter((item) => business === "all" || item.key === business);
    const productionRows = [
        ...data.productionBatches.filter((item) => matchRange(item.date) && matchBusiness("feed")).map((item) => ({ id: item.id, date: item.date, business: "Feed Unit", batch: item.batchNo, product: item.productName || data.feedFormulas.find((formula) => formula.id === item.formulaId)?.name || "Feed", output: `${fmt(item.outputKg)} KG / ${item.bagsProduced} bags`, cost: item.productionCost, status: titleCase(item.status || "completed") })),
        ...data.flourProduction.filter((item) => matchRange(item.date) && matchBusiness("chakki")).map((item) => ({ id: item.id, date: item.date, business: "Chakki", batch: item.batchNo, product: data.flourProducts.find((product) => product.id === item.productId)?.name || "Flour", output: `${item.bagsProduced} bags`, cost: item.totalCost, status: "Completed" })),
    ];
    const fuelRows = data.machineReadings.filter((item) => matchRange(item.date) && matchBusiness("petrol")).map((item) => ({ id: item.id, date: item.date, machine: item.machine, fuel: titleCase(item.fuelType), opening: item.openingReading, closing: item.closingReading, sold: soldLiters(item), rate: item.saleRate, amount: readingAmount(item), payment: titleCase(item.paymentType), rollover: item.rollover ? "Yes" : "No" }));
    const closingRows = data.closings.filter((item) => matchRange(item.date) && (business === "all" || item.business === business || item.business === "all"));
    const businessKeys = business === "all" ? ["feed", "chakki", "petrol", "store", "gas"] : [business];
    const totals = businessKeys.reduce((acc, key) => { const value = getBusinessTotals(data, key, range.from, range.to); return { sales: acc.sales + value.sales, expenses: acc.expenses + value.expenses, cogs: acc.cogs + value.cogs, profit: acc.profit + value.profit, purchases: acc.purchases + value.purchases }; }, { sales: 0, expenses: 0, cogs: 0, profit: 0, purchases: 0 });
    const reportTabs = [["sales", "Sales"], ["purchases", "Purchases"], ["expenses", "Expenses"], ["profit", "Profit"], ["inventory", "Inventory"], ["credit", "Credit"], ["customer-ledger", "Customer Ledger"], ["supplier-ledger", "Supplier Ledger"], ["cash-book", "Cash Book"], ["production", "Production"], ["fuel", "Fuel"], ["closings", "Closings"]];
    const reportData = () => {
        switch (reportType) {
            case "sales": return { title: `${titleCase(period)} Sales Report`, columns: ["Date", "Business", "Reference", "Customer", "Detail", "Total", "Paid", "Due"], rows: salesRows.map((item) => [item.date, item.business, item.reference, item.party, item.detail, money(item.total), money(item.paid), money(item.due)]), footer: `Total Sales: ${money(salesRows.reduce((sum, item) => sum + item.total, 0))}` };
            case "purchases": return { title: `${titleCase(period)} Purchase Report`, columns: ["Date", "Business", "Invoice", "Supplier", "Item", "Quantity", "Total", "Paid"], rows: purchaseRows.map((item) => [item.date, item.business, item.invoice, item.supplier, item.item, item.quantity, money(item.total), money(item.paid)]), footer: `Total Purchases: ${money(purchaseRows.reduce((sum, item) => sum + item.total, 0))}` };
            case "expenses": return { title: `${titleCase(period)} Expense Report`, columns: ["Date", "Business", "Title", "Category", "Amount", "Payment"], rows: expenseRows.map((item) => [item.date, businessLabel(item.business), item.title, item.category, money(item.amount), titleCase(item.paymentType)]), footer: `Total Expenses: ${money(expenseRows.reduce((sum, item) => sum + item.amount, 0))}` };
            case "profit": return { title: `${titleCase(period)} Profit Report`, columns: ["Metric", "Amount"], rows: [["Sales", money(totals.sales)], ["Cost of Goods Sold", money(totals.cogs)], ["Expenses", money(totals.expenses)], ["Profit", money(totals.profit)]], footer: "Profit = Sales − Cost of Goods Sold − Expenses" };
            case "inventory": return { title: "Inventory Report", columns: ["Business", "Item", "Quantity", "Value", "Status"], rows: inventoryRows.map((item) => [item.business, item.item, item.quantity, money(item.value), item.status]), footer: `Inventory Value: ${money(inventoryRows.reduce((sum, item) => sum + item.value, 0))}` };
            case "credit": return { title: "Outstanding Credit Report", columns: ["Date", "Business", "Reference", "Customer", "Detail", "Total", "Paid", "Due"], rows: creditRows.map((item) => [item.date, item.business, item.reference, item.party, item.detail, money(item.total), money(item.paid), money(item.due)]), footer: `Outstanding: ${money(creditRows.reduce((sum, item) => sum + item.due, 0))}` };
            case "customer-ledger": return { title: "Customer Ledger", columns: ["Business", "Customer", "Phone", "Opening", "Recovered", "Balance", "Credit Limit"], rows: customerLedger.map((item) => [item.business, item.name, item.phone, money(item.opening), money(item.recovered), money(item.balance), money(item.creditLimit)]) };
            case "supplier-ledger": return { title: "Supplier Ledger", columns: ["Business", "Supplier", "Phone", "Opening", "Payments", "Balance"], rows: supplierLedger.map((item) => [item.business, item.name, item.phone, money(item.opening), money(item.paid), money(item.balance)]) };
            case "cash-book": return { title: "Cash Book Report", columns: ["Date", "Business", "Type", "Category", "Reference", "Description", "Amount"], rows: cashRows.map((item) => [item.date, businessLabel(item.business), titleCase(item.type), item.category, item.reference, item.description, money(item.amount)]), footer: `Current Cash In Hand: ${money(metrics.cashBalance)}` };
            case "production": return { title: "Production Report", columns: ["Date", "Business", "Batch", "Product", "Output", "Cost", "Status"], rows: productionRows.map((item) => [item.date, item.business, item.batch, item.product, item.output, money(item.cost), item.status]) };
            case "fuel": return { title: "Fuel Report", columns: ["Date", "Machine", "Fuel", "Opening", "Closing", "Sold L", "Rate", "Amount", "Payment", "Rollover"], rows: fuelRows.map((item) => [item.date, item.machine, item.fuel, item.opening, item.closing, item.sold, money(item.rate), money(item.amount), item.payment, item.rollover]), footer: "Fuel Sold = Closing Reading − Opening Reading (or rollover formula)." };
            case "closings": return { title: "Daily / Monthly Closing Report", columns: ["Date", "Period", "Business", "Opening", "Received", "Paid", "Closing", "Sales", "Expenses", "Profit", "Status"], rows: closingRows.map((item) => [item.date, titleCase(item.period), businessLabel(item.business), money(item.openingBalance), money(item.received), money(item.paid), money(item.closingBalance), money(item.sales || 0), money(item.expenses || 0), money(item.profit || 0), titleCase(item.status || "closed")]) };
        }
    };
    const printReport = () => { const report = reportData(); openPrint({ title: report.title, subtitle: `${range.label} · ${businessLabel(business)}`, columns: report.columns, rows: report.rows.map((row) => row.map(String)), footer: report.footer }); };
    const exportReport = () => { const report = reportData(); downloadCsv(`pk-erp-${reportType}-${range.label}.csv`, report.columns, report.rows); };
    return <div className="screen-stack"><Panel title="Report Filters" actions={<div className="row-actions"><button className="secondary-btn" onClick={exportReport}>Export Excel (CSV)</button><button className="primary-btn" onClick={printReport}>Print / Save PDF</button></div>}><div className="report-filters"><label>Period<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="daily">Daily</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label><label>Reference Date<input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}/></label><label>Business<select value={business} onChange={(event) => setBusiness(event.target.value)}><option value="all">All Businesses</option><option value="feed">Feed Unit</option><option value="chakki">Chakki</option><option value="petrol">Petrol Pump</option><option value="store">Super Store</option><option value="gas">Gas Management</option></select></label></div></Panel><ModuleTabs items={reportTabs} active={reportType} onChange={(key) => setReportType(key)}/>
        {reportType === "sales" || reportType === "credit" ? <Panel title={reportType === "sales" ? "Sales Report" : "Outstanding Credit Report"}><DataTable rows={reportType === "sales" ? salesRows : creditRows} columns={[{ key: "date", label: "Date" }, { key: "business", label: "Business" }, { key: "reference", label: "Reference" }, { key: "party", label: "Customer" }, { key: "detail", label: "Detail" }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "paid", label: "Paid", value: (row) => row.paid, render: (row) => money(row.paid) }, { key: "due", label: "Due", value: (row) => row.due, render: (row) => money(row.due) }]}/></Panel> : null}
        {reportType === "purchases" ? <Panel title="Purchase Report"><DataTable rows={purchaseRows} columns={[{ key: "date", label: "Date" }, { key: "business", label: "Business" }, { key: "invoice", label: "Invoice" }, { key: "supplier", label: "Supplier" }, { key: "item", label: "Item" }, { key: "quantity", label: "Quantity" }, { key: "total", label: "Total", value: (row) => row.total, render: (row) => money(row.total) }, { key: "paid", label: "Paid", value: (row) => row.paid, render: (row) => money(row.paid) }]}/></Panel> : null}
        {reportType === "expenses" ? <Panel title="Expense Report"><DataTable rows={expenseRows} columns={[{ key: "date", label: "Date" }, { key: "business", label: "Business", render: (row) => businessLabel(row.business) }, { key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "paymentType", label: "Payment", render: (row) => titleCase(row.paymentType) }]}/></Panel> : null}
        {reportType === "profit" ? <div className="stats-grid compact"><StatCard label="Sales" value={money(totals.sales)}/><StatCard label="COGS" value={money(totals.cogs)}/><StatCard label="Expenses" value={money(totals.expenses)} tone="danger"/><StatCard label="Profit" value={money(totals.profit)} tone={totals.profit >= 0 ? "success" : "danger"}/></div> : null}
        {reportType === "inventory" ? <Panel title="Inventory Report"><DataTable rows={inventoryRows} columns={[{ key: "business", label: "Business" }, { key: "item", label: "Item" }, { key: "quantity", label: "Quantity" }, { key: "value", label: "Value", value: (row) => row.value, render: (row) => money(row.value) }, { key: "status", label: "Status", render: (row) => <span className={`status-badge ${row.status === "Low Stock" ? "danger" : "success"}`}>{row.status}</span> }]}/></Panel> : null}
        {reportType === "customer-ledger" ? <Panel title="Customer Ledger"><DataTable rows={customerLedger} columns={[{ key: "business", label: "Business" }, { key: "name", label: "Customer" }, { key: "phone", label: "Phone" }, { key: "opening", label: "Opening", value: (row) => row.opening, render: (row) => money(row.opening) }, { key: "recovered", label: "Recovered", value: (row) => row.recovered, render: (row) => money(row.recovered) }, { key: "balance", label: "Balance", value: (row) => row.balance, render: (row) => money(row.balance) }, { key: "creditLimit", label: "Credit Limit", value: (row) => row.creditLimit, render: (row) => money(row.creditLimit) }]}/></Panel> : null}
        {reportType === "supplier-ledger" ? <Panel title="Supplier Ledger"><DataTable rows={supplierLedger} columns={[{ key: "business", label: "Business" }, { key: "name", label: "Supplier" }, { key: "phone", label: "Phone" }, { key: "opening", label: "Opening", value: (row) => row.opening, render: (row) => money(row.opening) }, { key: "paid", label: "Payments", value: (row) => row.paid, render: (row) => money(row.paid) }, { key: "balance", label: "Balance", value: (row) => row.balance, render: (row) => money(row.balance) }]}/></Panel> : null}
        {reportType === "cash-book" ? <Panel title="Cash Book Report"><DataTable rows={cashRows} columns={[{ key: "date", label: "Date" }, { key: "business", label: "Business", render: (row) => businessLabel(row.business) }, { key: "type", label: "Type", render: (row) => titleCase(row.type) }, { key: "category", label: "Category" }, { key: "reference", label: "Reference" }, { key: "description", label: "Description" }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }]}/></Panel> : null}
        {reportType === "production" ? <Panel title="Production Report"><DataTable rows={productionRows} columns={[{ key: "date", label: "Date" }, { key: "business", label: "Business" }, { key: "batch", label: "Batch" }, { key: "product", label: "Product" }, { key: "output", label: "Output" }, { key: "cost", label: "Cost", value: (row) => row.cost, render: (row) => money(row.cost) }, { key: "status", label: "Status" }]}/></Panel> : null}
        {reportType === "fuel" ? <Panel title="Fuel Report"><DataTable rows={fuelRows} columns={[{ key: "date", label: "Date" }, { key: "machine", label: "Machine" }, { key: "fuel", label: "Fuel" }, { key: "opening", label: "Opening", value: (row) => row.opening }, { key: "closing", label: "Closing", value: (row) => row.closing }, { key: "sold", label: "Sold L", value: (row) => row.sold }, { key: "rate", label: "Rate", value: (row) => row.rate, render: (row) => money(row.rate) }, { key: "amount", label: "Amount", value: (row) => row.amount, render: (row) => money(row.amount) }, { key: "payment", label: "Payment" }]}/></Panel> : null}
        {reportType === "closings" ? <Panel title="Closing Report"><DataTable rows={closingRows} columns={[{ key: "date", label: "Date" }, { key: "period", label: "Period", render: (row) => titleCase(row.period) }, { key: "business", label: "Business", render: (row) => businessLabel(row.business) }, { key: "openingBalance", label: "Opening", value: (row) => row.openingBalance, render: (row) => money(row.openingBalance) }, { key: "closingBalance", label: "Closing", value: (row) => row.closingBalance, render: (row) => money(row.closingBalance) }, { key: "profit", label: "Profit", value: (row) => row.profit || 0, render: (row) => money(row.profit || 0) }, { key: "status", label: "Status", render: (row) => titleCase(row.status || "closed") }]}/></Panel> : null}
    </div>;
}
function SettingsPanel({ data, setData, commit, deleteRecord, isAdmin }) {
    const [section, setSection] = useState("activity");
    const [settingsForm, setSettingsForm] = useState({ businessName: data.settings.businessName, openingCashBalance: String(data.settings.openingCashBalance), openingPetrolLiters: String(data.settings.openingPetrolLiters), openingDieselLiters: String(data.settings.openingDieselLiters), petrolReorderLevel: String(data.settings.petrolReorderLevel), dieselReorderLevel: String(data.settings.dieselReorderLevel), darkMode: data.settings.darkMode, sessionTimeoutMinutes: String(data.settings.sessionTimeoutMinutes), meterMaximum: String(data.settings.meterMaximum) });
    const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "staff", status: "active", businessAccess: ["feed"] });
    const [roleForm, setRoleForm] = useState({ name: "", permissions: ["dashboard.view", "records.create"] });
    const restoreRef = useRef(null);
    const tabs = [["activity", "Activity Logs"], ["audit", "Audit Logs"], ["notifications", "Notifications"], ["backup", "Backup"], ["restore", "Restore"], ["settings", "Settings"], ["users", "Users"], ["roles", "Roles"], ["permissions", "Permissions"], ["demo", "Demo Guide"]];
    const allPermissions = ["dashboard.view", "records.create", "records.edit", "records.delete", "reports.view", "reports.print", "closings.manage", "locked.edit", "settings.manage", "users.manage", "backup.manage"];
    const assignableBusinesses = ["feed", "chakki", "petrol", "store", "gas", "common"];
    const metrics = calculateMetrics(data);
    const currentMonth = today().slice(0, 7);
    const notifications = [
        ...metrics.lowStockItems.map((item) => ({ id: item.id, category: "Low Stock", title: item.item, detail: `${item.business}: ${item.stock} available; reorder at ${item.reorder}.`, priority: "High" })),
        ...(metrics.outstandingCredit > 0 ? [{ id: "credit", category: "Credit Due", title: "Outstanding customer credit", detail: `${money(metrics.outstandingCredit)} is currently outstanding.`, priority: "High" }] : []),
        ...(data.staff.some((member) => member.status === "active" && !data.salaryPayments.some((payment) => payment.staffId === member.id && payment.month === currentMonth && payment.status === "paid")) ? [{ id: "salary", category: "Salary Due", title: "Monthly salary pending", detail: "At least one active staff member has no paid salary entry for this month.", priority: "Medium" }] : []),
        ...(!data.closings.some((item) => item.period === "monthly" && item.date.startsWith(currentMonth) && item.status !== "reopened") ? [{ id: "closing", category: "Closing Reminder", title: "Monthly closing pending", detail: "Complete Daily Closing and Monthly Closing from the Cash Book module.", priority: "Medium" }] : []),
        ...(Math.floor((Date.now() - new Date(data.settings.lastBackupAt).getTime()) / 86400000) >= 7 ? [{ id: "backup", category: "Backup Reminder", title: "Create a fresh backup", detail: `Last backup: ${data.settings.lastBackupAt}.`, priority: "Medium" }] : []),
    ];
    const saveSettings = (event) => {
        event.preventDefault();
        if (!isAdmin)
            return window.alert("Only Admin can change system settings.");
        const values = [toNum(settingsForm.openingCashBalance), toNum(settingsForm.openingPetrolLiters), toNum(settingsForm.openingDieselLiters), toNum(settingsForm.petrolReorderLevel), toNum(settingsForm.dieselReorderLevel), toNum(settingsForm.sessionTimeoutMinutes), toNum(settingsForm.meterMaximum)];
        if (values.some((value) => value < 0) || toNum(settingsForm.sessionTimeoutMinutes) < 5 || toNum(settingsForm.meterMaximum) <= 0)
            return window.alert("Settings contain an invalid value. Session timeout must be at least 5 minutes and meter maximum must be positive.");
        commit("Settings", "Update system settings", settingsForm.businessName, (current) => ({ ...current, settings: { ...current.settings, businessName: settingsForm.businessName.trim() || "PK Business ERP Suite", openingCashBalance: toNum(settingsForm.openingCashBalance), openingPetrolLiters: toNum(settingsForm.openingPetrolLiters), openingDieselLiters: toNum(settingsForm.openingDieselLiters), petrolReorderLevel: toNum(settingsForm.petrolReorderLevel), dieselReorderLevel: toNum(settingsForm.dieselReorderLevel), darkMode: settingsForm.darkMode, sessionTimeoutMinutes: toNum(settingsForm.sessionTimeoutMinutes), meterMaximum: toNum(settingsForm.meterMaximum) } }));
    };
    const addUser = (event) => {
        event.preventDefault();
        if (!isAdmin)
            return window.alert("Only Admin can manage users.");
        if (!userForm.name.trim() || !userForm.email.trim() || userForm.password.length < 6)
            return window.alert("Name, email and a password of at least 6 characters are required.");
        if (data.users.some((item) => item.email.toLowerCase() === userForm.email.toLowerCase()))
            return window.alert("A user with this email already exists.");
        if (!userForm.businessAccess.length && userForm.role !== "admin")
            return window.alert("Select at least one business unit for this user.");
        const record = { id: uid(), name: userForm.name.trim(), email: userForm.email.trim().toLowerCase(), password: userForm.password, role: userForm.role, status: userForm.status, businessAccess: userForm.role === "admin" ? assignableBusinesses : userForm.businessAccess };
        commit("Users", "Add user", record.email, (current) => ({ ...current, users: [record, ...current.users] }));
        setUserForm({ name: "", email: "", password: "", role: "staff", status: "active", businessAccess: ["feed"] });
    };
    const toggleBusinessAccess = (business) => setUserForm((current) => ({ ...current, businessAccess: current.businessAccess.includes(business) ? current.businessAccess.filter((item) => item !== business) : [...current.businessAccess, business] }));
    const addRole = (event) => {
        event.preventDefault();
        if (!isAdmin)
            return window.alert("Only Admin can manage roles.");
        if (!roleForm.name.trim())
            return window.alert("Role name is required.");
        if (data.roles.some((item) => item.name.toLowerCase() === roleForm.name.trim().toLowerCase()))
            return window.alert("A role with this name already exists.");
        const record = { id: uid(), name: roleForm.name.trim(), permissions: roleForm.permissions };
        commit("Roles", "Add role", record.name, (current) => ({ ...current, roles: [record, ...current.roles] }));
        setRoleForm({ name: "", permissions: ["dashboard.view", "records.create"] });
    };
    const togglePermission = (permission) => setRoleForm((current) => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission] }));
    const backup = () => {
        if (!isAdmin)
            return window.alert("Only Admin can create a backup.");
        const backupData = { application: "PK Business ERP Suite", version: data.settings.version, exportedAt: new Date().toISOString(), data };
        downloadTextFile(`pk-business-erp-backup-${today()}.json`, JSON.stringify(backupData, null, 2), "application/json");
        commit("Backup", "Create backup", today(), (current) => ({ ...current, settings: { ...current.settings, lastBackupAt: today() } }));
    };
    const restore = (event) => {
        const file = event.target.files?.[0];
        if (!file || !isAdmin)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result));
                const restored = normalizeData("data" in parsed && parsed.data ? parsed.data : parsed);
                const restoreLog = { id: uid(), dateTime: new Date().toLocaleString(), user: "Admin Demo", area: "Restore", action: "Restore backup", detail: file.name, sensitive: true };
                setData({ ...restored, auditLogs: [restoreLog, ...restored.auditLogs], activityLogs: [restoreLog, ...restored.activityLogs] });
                window.alert("Backup restored successfully.");
            }
            catch {
                window.alert("The selected file is not a valid PK Business ERP backup.");
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    };
    const resetDemo = () => {
        if (!isAdmin)
            return;
        if (window.confirm("Reset all LocalStorage demo data to the original Version 2 sample data?"))
            setData(normalizeData(seedData));
    };
    const protectedEmails = ["admin@demo.com", "manager@demo.com", "operator@demo.com", "staff@demo.com", "viewer@demo.com"];
    return <div className="screen-stack"><ModuleTabs items={tabs} active={section} onChange={(key) => setSection(key)}/>
        {section === "activity" ? <Panel title="Activity Logs"><InlineNotice>General actions from every module are recorded with user, date, area and detail.</InlineNotice><DataTable rows={data.activityLogs} columns={[{ key: "dateTime", label: "Date & Time" }, { key: "user", label: "User" }, { key: "area", label: "Area" }, { key: "action", label: "Action" }, { key: "detail", label: "Detail" }]}/></Panel> : null}
        {section === "audit" ? <Panel title="Audit Logs"><InlineNotice tone="warning">Sensitive actions such as delete, settings, users, roles, backup, restore and closing changes are stored here. This screen does not provide delete controls.</InlineNotice><DataTable rows={data.auditLogs} columns={[{ key: "dateTime", label: "Date & Time" }, { key: "user", label: "User" }, { key: "area", label: "Area" }, { key: "action", label: "Sensitive Action" }, { key: "detail", label: "Detail" }]}/></Panel> : null}
        {section === "notifications" ? <Panel title="Notifications"><DataTable rows={notifications} columns={[{ key: "category", label: "Category" }, { key: "title", label: "Notification" }, { key: "detail", label: "Detail" }, { key: "priority", label: "Priority", render: (row) => <span className={`status-badge ${row.priority === "High" ? "danger" : "warning"}`}>{row.priority}</span> }]} empty="No active notifications."/></Panel> : null}
        {section === "backup" ? <Panel title="Backup"><div className="backup-card"><div><strong>Download complete LocalStorage backup</strong><span>Includes all businesses, settings, users, inventory, ledgers, closings and audit records.</span><small>Last backup: {data.settings.lastBackupAt}</small></div><button className="primary-btn" onClick={backup} disabled={!isAdmin}>Download Backup</button></div>{!isAdmin ? <p className="locked">Backup management is available to administrators only.</p> : null}</Panel> : null}
        {section === "restore" ? <Panel title="Restore"><div className="backup-card"><div><strong>Restore a Version 2 JSON backup</strong><span>The selected data is normalized for backward compatibility before replacing current browser data.</span></div><button className="primary-btn" onClick={() => restoreRef.current?.click()} disabled={!isAdmin}>Select Backup File</button><input ref={restoreRef} className="hidden-input" type="file" accept="application/json,.json" onChange={restore}/></div><InlineNotice tone="warning">Restore affects this browser only because this client demo uses LocalStorage.</InlineNotice></Panel> : null}
        {section === "settings" ? <Panel title="Business & Opening Settings"><form className="form-grid wide" onSubmit={saveSettings}><input placeholder="Business name" value={settingsForm.businessName} onChange={(event) => setSettingsForm({ ...settingsForm, businessName: event.target.value })}/><input type="number" min="0" placeholder="Opening cash" value={settingsForm.openingCashBalance} onChange={(event) => setSettingsForm({ ...settingsForm, openingCashBalance: event.target.value })}/><input type="number" min="0" placeholder="Opening petrol L" value={settingsForm.openingPetrolLiters} onChange={(event) => setSettingsForm({ ...settingsForm, openingPetrolLiters: event.target.value })}/><input type="number" min="0" placeholder="Opening diesel L" value={settingsForm.openingDieselLiters} onChange={(event) => setSettingsForm({ ...settingsForm, openingDieselLiters: event.target.value })}/><input type="number" min="0" placeholder="Petrol reorder L" value={settingsForm.petrolReorderLevel} onChange={(event) => setSettingsForm({ ...settingsForm, petrolReorderLevel: event.target.value })}/><input type="number" min="0" placeholder="Diesel reorder L" value={settingsForm.dieselReorderLevel} onChange={(event) => setSettingsForm({ ...settingsForm, dieselReorderLevel: event.target.value })}/><input type="number" min="5" placeholder="Session timeout minutes" value={settingsForm.sessionTimeoutMinutes} onChange={(event) => setSettingsForm({ ...settingsForm, sessionTimeoutMinutes: event.target.value })}/><input type="number" min="1" placeholder="Fuel meter maximum" value={settingsForm.meterMaximum} onChange={(event) => setSettingsForm({ ...settingsForm, meterMaximum: event.target.value })}/><label className="checkbox-field"><input type="checkbox" checked={settingsForm.darkMode} onChange={(event) => setSettingsForm({ ...settingsForm, darkMode: event.target.checked })}/> Enable Dark Mode</label><button disabled={!isAdmin}>Save Settings</button></form>{!isAdmin ? <p className="locked">System settings are Admin-only.</p> : null}<button className="danger-btn" onClick={resetDemo} disabled={!isAdmin}>Reset Demo Data</button></Panel> : null}
        {section === "users" ? <Panel title="Users"><form className="form-grid wide" onSubmit={addUser}><input placeholder="Full name" value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} required/><input type="email" placeholder="Email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} required/><input type="text" placeholder="Password (minimum 6 characters)" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} required/><select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}><option value="admin">Admin</option><option value="manager">Manager</option><option value="operator">Operator</option><option value="staff">Staff</option><option value="viewer">Viewer</option></select><select value={userForm.status} onChange={(event) => setUserForm({ ...userForm, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select><div className="business-access-grid">{assignableBusinesses.map((business) => <label className="checkbox-field" key={business}><input type="checkbox" disabled={userForm.role === "admin"} checked={userForm.role === "admin" || userForm.businessAccess.includes(business)} onChange={() => toggleBusinessAccess(business)}/>{businessLabel(business)}</label>)}</div><button disabled={!isAdmin}>Add User</button></form><DataTable rows={data.users} columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role", render: (row) => titleCase(row.role) }, { key: "businessAccess", label: "Business Access", value: (row) => row.businessAccess.join(" "), render: (row) => row.businessAccess.map(businessLabel).join(", ") }, { key: "status", label: "Status", render: (row) => titleCase(row.status) }, { key: "actions", label: "Actions", render: (row) => isAdmin && !protectedEmails.includes(row.email) ? <button className="text-danger" onClick={() => deleteRecord("users", row.id, "Users", "user")}>Delete</button> : <span className="muted-text">Protected</span> }]}/></Panel> : null}
        {section === "roles" ? <Panel title="Roles"><form className="form-grid wide" onSubmit={addRole}><input placeholder="Role name" value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} required/><div className="permission-checkboxes">{allPermissions.map((permission) => <label className="checkbox-field" key={permission}><input type="checkbox" checked={roleForm.permissions.includes(permission)} onChange={() => togglePermission(permission)}/>{permission}</label>)}</div><button disabled={!isAdmin}>Add Role</button></form><DataTable rows={data.roles} columns={[{ key: "name", label: "Role" }, { key: "permissions", label: "Permissions", value: (row) => row.permissions.join(" "), render: (row) => row.permissions.join(", ") }, { key: "actions", label: "Actions", render: (row) => isAdmin && !row.roleKey ? <button className="text-danger" onClick={() => deleteRecord("roles", row.id, "Roles", "role")}>Delete</button> : <span className="muted-text">System Role</span> }]}/></Panel> : null}
        {section === "permissions" ? <Panel title="Permission Matrix"><div className="permission-grid">{data.roles.map((role) => <div key={role.id}><strong>{role.name}</strong>{allPermissions.map((permission) => <span key={permission} className={role.permissions.includes(permission) ? "allowed" : "denied"}>{role.permissions.includes(permission) ? "✓" : "—"} {permission}</span>)}</div>)}</div></Panel> : null}
        {section === "demo" ? <Panel title="Client Demo Guide"><div className="demo-guide"><ol><li>Open the Main Dashboard and show combined KPIs, business cards, charts, notifications and low stock.</li><li>In Feed Unit, add a raw material purchase, create a formula, start/complete a batch, then sell finished bags.</li><li>In Chakki, show that Grinding Service records income only and never adds customer wheat to inventory; then show Flour Bag production and sale separately.</li><li>In Petrol Pump, enter opening/closing readings and demonstrate automatic Fuel Sold calculation and tank deduction.</li><li>In Super Store and Gas, record a purchase and sale to demonstrate automatic stock movement.</li><li>Recover customer credit, pay a supplier, run Daily Closing, then generate reports and print previews.</li><li>Show Admin, Manager, Operator, Staff and Viewer access differences using the demo accounts.</li></ol><div className="demo-credential-grid">{data.users.filter((item) => protectedEmails.includes(item.email)).map((item) => <div key={item.id}><strong>{titleCase(item.role)}</strong><span>{item.email}</span><code>{item.password}</code></div>)}</div></div></Panel> : null}
    </div>;
}
function PrintPreview({ document, onClose }) {
    return <div className="print-overlay"><div className="print-modal"><div className="print-actions no-print"><button className="secondary-btn" onClick={onClose}>Close</button><button className="primary-btn" onClick={() => window.print()}>Print</button></div><article className="print-preview"><header><div className="brand-mark small">PK</div><div><h1>{document.title}</h1><p>{document.subtitle}</p></div></header>{document.fields ? <div className="print-fields">{document.fields.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> : null}{document.columns && document.rows ? <div className="table-wrap"><table><thead><tr>{document.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{document.rows.length ? document.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={document.columns.length} className="empty-row">No records for this report.</td></tr>}</tbody></table></div> : null}<footer>{document.footer || "Generated by PK Business ERP Suite Version 2.0"}</footer></article></div></div>;
}

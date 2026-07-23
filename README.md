# PK Business ERP Suite

## Version 2.0
 
A fully clickable, browser-based Business ERP demo built with Next.js, React, TypeScript, CSS, JavaScript behavior and LocalStorage. No backend is required.

### Included business modules

- Main Dashboard with sales, expenses, profit, collection, cash/credit, outstanding credit, inventory, low stock, recent activity, quick actions, notifications and monthly charts.
- Feed Unit: partners, investments, suppliers, raw material purchase/inventory, formulas, production batches, cost, finished goods, bags, sales, customers, expenses, staff, salary, reports and settings.
- Chakki: separate Grinding Service and company Flour Bag Production/Sales businesses.
- Petrol Pump: fuel purchase, tank stock, Machine 1/2 readings, automatic fuel sold calculation, customers, cash/credit/temporary credit, expenses, salary, reports and closings.
- Super Store: products, categories, suppliers, purchase, returns, inventory, cash/credit sales, customers, expenses and reports.
- Gas Management: products, purchase, stock, sales, customers, expenses and reports.
- Cash Book: opening balance, cash received, cash paid, expenses, closing balance, daily closing and monthly closing.
- Common modules: activity logs, notifications, backup, restore, settings, users, roles and permissions.
- Reports: daily, monthly and yearly sales, expenses, profit, inventory, customer ledger, supplier ledger and cash book.
- Print previews: invoices, receipts, grinding receipts, fuel reports, monthly reports, expense reports, salary receipts and closing reports.

### Demo logins

Admin:
- Email: `admin@demo.com`
- Password: `admin123`

Staff:
- Email: `staff@demo.com`
- Password: `staff123`

### Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Production build

```bash
npm run build
npm start
```

### Deploy on GitHub and Vercel

1. Push the complete project folder to GitHub.
2. Import the repository in Vercel.
3. Vercel detects Next.js automatically.
4. Deploy without environment variables.

### Data storage

All records are saved in browser LocalStorage under `pk-erp-v2-data`. Existing Version 1 partner and staff LocalStorage records are imported automatically the first time Version 2 loads. Backup exports a complete JSON file; Restore imports the JSON back into the current browser.

# PK Business ERP Suite — Version 2.0 BRD Demo

A clickable, browser-based ERP demonstration built by upgrading the existing Version 1 project. It preserves the original visual language and single-page Next.js structure while implementing the approved BRD workflows with realistic LocalStorage data.

## Demo accounts

| Role | Email | Password | Example access |
|---|---|---|---|
| Admin | `admin@demo.com` | `admin123` | Full system and settings |
| Manager | `manager@demo.com` | `manager123` | Feed, Chakki and Petrol operational access |
| Operator | `operator@demo.com` | `operator123` | Petrol Pump and Super Store data entry |
| Staff | `staff@demo.com` | `staff123` | Limited operational entry |
| Viewer | `viewer@demo.com` | `viewer123` | Read-only dashboards and reports |

## Implemented business systems

- Main ERP Dashboard with combined KPIs, business quick-access cards, notifications, low-stock items, recent activity, top products/customers, quick actions and monthly sales/expense/profit charts.
- Feed Unit: partners, investment/withdrawals, supplier ledger, raw-material purchasing and returns, formulas, batch production, ingredient consumption, traceability, finished goods/bags, bag sales, customer ledger, expenses and reports.
- Chakki: separate Grinding Service and company-owned Flour Bag Production/Sales. Customer wheat is never added to company inventory.
- Petrol Pump: fuel purchases/returns, tank stock, machine readings, rollover handling, automatic fuel-sold calculation, fuel-rate history, customer/supplier ledgers and reports.
- Super Store: products/categories, purchase and purchase return, automatic inventory, cash/credit sales, customer/supplier ledgers, expenses and reports.
- Gas Management: cylinder types, purchases/returns, automatic stock, cash/credit sales, customer/supplier ledgers, expenses and reports.
- Cash Book: cash received/paid/expenses, daily closing, monthly closing, record locking, Admin reopen reason and Feed Unit partner profit sharing.
- Common features: staff/salary, five roles, business-scoped access, permissions matrix, activity/audit logs, notifications, backup/restore, dark mode, print preview and CSV export.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production verification

```bash
npm run build
npm start
```

## Vercel deployment

1. Push the complete folder to a GitHub repository.
2. In Vercel, select **Add New → Project** and import that repository.
3. Framework preset: **Next.js**.
4. Keep build command `npm run build` and output settings at the Vercel defaults.
5. Deploy.

No environment variables or backend services are required for this clickable demonstration. All records are stored in the current browser's LocalStorage.

## Demo data warning

This is a client demonstration, not the final production backend. Data is browser-specific and can be reset, exported as JSON, and restored from the Settings module. Production implementation should replace LocalStorage credentials and records with a secured database/API and server-side authentication.


## Vercel build fix (Version 2.0.1)

The deployment entrypoint is intentionally small:

- `app/page.jsx` — route entrypoint only
- `app/erp-client.jsx` — complete clickable ERP client application
- `app/layout.jsx` — root layout
- `app/globals.css` — existing ERP styles

This structure prevents the TSX parser error previously reported around `app/page.tsx` during Vercel compilation. There are no Git merge-conflict markers in the project files.

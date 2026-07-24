# Changelog

## 2.0.0 — BRD Client Demo

- Preserved the Version 1 project structure, navigation style, layout and color system.
- Added combined Main ERP dashboard KPIs, business cards, charts, top products/customers, low stock, notifications, activity and quick actions.
- Completed Feed Unit production flow with formula consumption, unique batch numbers, manufacturing/expiry traceability, finished feed and automatic bag inventory.
- Added partner withdrawals, remaining investment, monthly profit distribution and printable receipts.
- Added separate Chakki Grinding Service and Flour Bag Production/Sales workflows.
- Added Petrol Pump tank stock, fuel rate history, machine rollover validation and automatic `Closing Reading - Opening Reading` calculation.
- Added complete Super Store and Gas purchase-to-sale stock automation.
- Added global supplier payments, supplier statements, customer credit recovery and customer ledgers.
- Added purchase returns linked to original invoices with automatic stock/payable impact.
- Added Cash Book, Daily Closing, Monthly Closing, period locking and Admin reopen audit reason.
- Added daily/monthly/yearly and specialized reports, print previews and CSV export.
- Added Admin, Manager, Operator, Staff and Viewer demo users with business-scoped access.
- Added activity logs, tamper-style audit display, notifications, backup/restore, session timeout and dark mode.
- Added BRD/UAT demonstration checklist and deployment guide.

## 2.0.1 — Vercel build correction

- Replaced the large TSX route entrypoint with a small `app/page.jsx` wrapper.
- Moved the complete client application to `app/erp-client.jsx`.
- Removed duplicate root route/layout files and TypeScript-only deployment config.
- Added Vercel fix notes and conflict-marker verification.
- No ERP UI, workflow, LocalStorage, navigation, or BRD module functionality was removed.

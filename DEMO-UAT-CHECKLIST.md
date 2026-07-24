# PK Business ERP Suite — Client Demo & UAT Checklist

Use the Admin account for the full presentation, then sign in with the other accounts to demonstrate role restrictions.

## 1. Main Dashboard

- [ ] Combined Total Investment, Today's Sales, Cash/Credit Sales, Collection, Credit Recovery, Expenses, Profit, Cash In Hand, Outstanding Credit, Supplier Payables and Inventory Value are visible.
- [ ] Four business cards open Feed Unit, Petrol Pump, Super Store and Gas Management; Feed card notes Chakki.
- [ ] Monthly Sales, Expense and Profit charts render.
- [ ] Low Stock, Notifications, Recent Activities, Top Products, Top Customers and Quick Actions render.

## 2. Feed Production end-to-end

- [ ] Add a Feed supplier and raw-material purchase; inventory increases and supplier payable updates.
- [ ] Create a Feed Formula with ingredient quantities.
- [ ] Create a production batch with unique Batch Number, Manufacturing Date and optional Expiry Date.
- [ ] System blocks production when ingredient stock is insufficient.
- [ ] Starting/completing production consumes raw material and increases Finished Feed/Bag Inventory.
- [ ] Sell bags from a completed batch; stock decreases and invoice prints with traceability.
- [ ] Record partner investment/withdrawal and verify Remaining Investment.

## 3. Chakki workflows remain separate

- [ ] Grinding Service stores customer, phone, wheat weight, rate, calculated charges, payment type and remarks.
- [ ] Grinding receipt prints.
- [ ] Customer wheat never appears in company inventory.
- [ ] Produce company flour bags in 10/20/40/50 KG products.
- [ ] Flour Bag Sale decreases company flour stock and prints an invoice.

## 4. Petrol Pump

- [ ] Add fuel purchase and verify tank stock increases.
- [ ] Record Machine 1/2 Opening and Closing readings.
- [ ] Fuel Sold calculates automatically from Closing minus Opening.
- [ ] Closing lower than Opening is blocked unless Meter Rollover is selected.
- [ ] Sale exceeding available tank stock is blocked.
- [ ] Cash/Credit/Temporary Credit and customer ledger are visible.
- [ ] Fuel Rate History and Daily/Monthly Fuel Reports print.

## 5. Super Store and Gas

- [ ] Product/cylinder purchase increases stock and supplier balance.
- [ ] Purchase Return references original invoice and reduces stock/payable.
- [ ] Sale blocks insufficient stock and decreases stock automatically.
- [ ] Credit Sale requires a registered customer and updates outstanding balance.
- [ ] Invoice and ledger print previews work.

## 6. Cash Book and Closings

- [ ] Cash Book shows Opening, Received, Paid/Expenses and Closing balance.
- [ ] Daily Closing calculates summary, locks the date and cannot be duplicated.
- [ ] Normal users cannot add transactions to a closed date.
- [ ] Admin can reopen with a mandatory reason, recorded in Audit Logs.
- [ ] Monthly Closing blocks when transaction dates are not daily-closed.
- [ ] Feed Unit monthly closing creates partner profit-share records.

## 7. Reports and Printing

- [ ] Daily, Monthly and Yearly filters work.
- [ ] Sales, Purchases, Expenses, Profit, Inventory, Credit, Customer/Supplier Ledger, Cash Book, Production, Fuel and Closing reports render.
- [ ] Search, sorting and filters work on tables.
- [ ] Print / Save PDF opens matching print preview.
- [ ] Export Excel (CSV) downloads the displayed report dataset.

## 8. Security and Common Features

- [ ] Admin sees all businesses and Settings.
- [ ] Manager/Operator/Staff see only assigned business modules and permitted actions.
- [ ] Viewer cannot save records.
- [ ] Users, roles and permission matrix are available to Admin.
- [ ] Activity Logs and sensitive Audit Logs record actions.
- [ ] Backup downloads complete data; Restore returns the saved state.
- [ ] Low Stock, Credit, Salary, Monthly Closing and Backup reminders appear.
- [ ] Dark Mode and responsive layouts work.

# BookLogex - Project Context & Documentation

## 📋 Project Overview

**Name:** BookLogex  
**Description:** AI-Powered Bookkeeping & Payroll SaaS for Australian Small Businesses  
**Target Market:** Australian sole traders, small businesses (1-50 employees)  
**Status:** MVP Development Phase

## 🛠 Tech Stack

### Frontend

- **Framework:** Next.js 15 (App Router, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Charts:** Recharts (bar, pie charts)
- **Icons:** Lucide React
- **Notifications:** Sonner (toast notifications)

### Backend & Database

- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Real-time:** Supabase Realtime subscriptions
- **Storage:** Supabase Storage (planned for documents)

### PDF Generation & Export

- **PDF:** jsPDF + jsPDF-AutoTable
- **CSV:** FileSaver.js
- **Date handling:** date-fns

## 📁 Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx              # Main dashboard with analytics
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Desktop navigation
│   │   │   └── Topbar.tsx        # Header with mobile menu
│   │   ├── employees/
│   │   │   ├── page.tsx          # Employee list
│   │   │   ├── [id]/page.tsx    # Employee detail view
│   │   │   └── new/page.tsx     # Add employee (4-step wizard)
│   │   ├── payroll/
│   │   │   ├── page.tsx          # Payroll runs list with delete
│   │   │   ├── new/page.tsx      # NEW: Setup wizard with validation
│   │   │   ├── [id]/page.tsx    # Edit payroll run (fixed flow)
│   │   │   └── _components/      # Payroll sub-components
│   │   ├── transactions/
│   │   │   └── page.tsx          # Income/expense tracking with view/edit/delete
│   │   ├── bas/
│   │   │   └── page.tsx          # BAS quarterly reports
│   │   └── settings/
│   │       └── page.tsx          # Organisation settings
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── TransactionModals.tsx     # NEW: All transaction modals (add/view/edit/delete)
│   ├── ConfirmDeleteModal.tsx
│   └── PayrollRunDetailsDrawer.tsx
├── lib/
│   ├── supabaseClient.ts         # Client-side Supabase
│   ├── supabaseServer.ts         # Server-side Supabase
│   ├── tax-calculator.ts         # Australian tax calculations
│   ├── payroll.ts                # Payroll utilities
│   └── notify.ts                 # Toast notification wrapper
├── types/
│   ├── employee.ts               # Employee types
│   ├── payroll.ts                # Payroll types
│   ├── organisation.ts           # Org settings types
│   └── transaction.ts            # Transaction types
└── context/
    └── OrgSettingsContext.tsx    # Global org settings
```

## 🗄 Database Schema

### employees

```sql
- id (uuid, PK)
- org_id (uuid, FK)
- full_name (text) *required
- first_name (generated)
- last_name (generated)
- email (text)
- phone (text)
- address (text)
- date_of_birth (date)
- position (text)
- employment_type (full_time|part_time|casual|contractor)
- department (text)
- start_date (date)
- end_date (date)
- base_salary (numeric)
- hourly_rate (numeric)
- pay_frequency (weekly|fortnightly|monthly)
- hours_worked (numeric, default: 38)
- tfn (text) - Tax File Number
- tax_rate (numeric, default: 0.15)
- tax_free_threshold (boolean, default: true)
- help_debt (boolean, default: false)
- super_rate (numeric, default: 11.5)
- super_fund (text)
- super_member_number (text)
- bank_bsb (text)
- bank_account (text)
- active (boolean, default: true)
- notes (text)
- created_at (timestamp)
```

### payroll_runs

```sql
- id (uuid, PK)
- org_id (uuid, FK)
- frequency (WEEKLY|FORTNIGHTLY|MONTHLY)
- pay_period_start (date)
- pay_period_end (date)
- pay_date (date)
- status (draft|finalized|completed)
- total_gross (numeric)
- total_tax (numeric)
- total_super (numeric)
- total_net (numeric)
- idempotency_key (text, unique)
- finalized_at (timestamp)
- created_at (timestamp)
```

### payroll_items

```sql
- id (uuid, PK)
- payroll_run_id (uuid, FK)
- employee_id (uuid, FK)
- gross (numeric)
- tax (numeric)
- super (numeric)
- net (numeric)
- hours_worked (numeric)
- created_at (timestamp)
```

### transactions

```sql
- id (uuid, PK)
- org_id (uuid, FK)
- txn_date (date)
- description (text)
- amount (numeric) - excludes GST
- gst_amount (numeric)
- type (income|expense)
- category (text) - NEW: Income/expense category
- payment_method (text) - NEW: How payment was made
- reference (text) - NEW: Invoice/receipt number
- notes (text) - NEW: Additional information
- updated_at (timestamp) - NEW: Auto-updated timestamp
- created_at (timestamp)
```

### organisation_settings

```sql
- id (uuid, PK)
- user_id (uuid, unique)
- business_name (text)
- abn (text) - 11 digits
- contact_email (text)
- contact_phone (text)
- business_address (text)
- gst_registered (boolean, default: false)
- gst_cycle (monthly|quarterly|annual)
- financial_year_start_month (int, default: 7)
- default_super_rate (numeric, default: 11.5)
- default_pay_frequency (weekly|fortnightly|monthly)
- default_pay_day (text)
- bank_bsb (text)
- bank_account (text)
- bank_account_name (text)
- created_at (timestamp)
- updated_at (timestamp)
```

### organisations

```sql
- id (uuid, PK)
- name (text)
- created_at (timestamp)
```

## 🎨 Design System

### Colors

- **Primary:** Blue (#3b82f6, #2563eb) - Trust, professionalism
- **Success:** Green (#10b981, #059669) - Positive actions, income
- **Error:** Red (#ef4444, #dc2626) - Warnings, expenses
- **Warning:** Amber (#f59e0b, #d97706) - Alerts, due dates
- **Info:** Purple (#8b5cf6, #7c3aed) - Neutral info
- **Gray:** Slate scale for text and borders

### Component Patterns

```tsx
// Card with gradient
<div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all">

// Section header
<div className="border-b pb-6">
  <h1 className="text-4xl font-bold text-gray-900">Title</h1>
  <p className="text-gray-600 mt-2">Description</p>
</div>

// Summary card
<div className="bg-white border rounded-lg shadow-sm p-6">
  <div className="flex items-center gap-2 mb-4">
    <Icon size={20} className="text-gray-600" />
    <h3 className="text-lg font-semibold text-gray-900">Section Title</h3>
  </div>
  {/* Content */}
</div>

// Status badge
<span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
  Active
</span>
```

### Typography Scale

- **Page Title:** `text-4xl font-bold`
- **Section Header:** `text-lg font-semibold`
- **Card Title:** `text-base font-medium`
- **Body Text:** `text-sm`
- **Caption:** `text-xs`

### Spacing

- **Page wrapper:** `max-w-7xl mx-auto space-y-6`
- **Card padding:** `p-6`
- **Section gaps:** `space-y-6`
- **Form fields:** `space-y-4`

## ✅ Features Implemented

### Dashboard (/)

- ✅ Summary cards (income, expenses, GST, profit)
- ✅ Action items (upcoming pay runs, BAS due)
- ✅ Quick stats (employees, PAYG, super)
- ✅ Financial charts (bar chart, pie chart)
- ✅ Payroll summary section
- ✅ Quick action buttons
- ✅ Period filtering (month, quarter, FY, all time)
- ✅ CSV/PDF export

### Employees (/dashboard/employees)

- ✅ Employee list with cards
- ✅ Stats overview (total, full-time, contractors, avg salary)
- ✅ Search by name/email/position
- ✅ Filter by status (active, inactive, contractors)
- ✅ Employee detail view
- ✅ Add employee (4-step wizard: Personal → Employment → Payment → Review)
- ✅ Edit employee (multi-step modal)
- ✅ Delete employee (with confirmation)
- ✅ Real-time sync
- ✅ Empty states

### Payroll (/dashboard/payroll)

- ✅ List all pay runs with stats
- ✅ **NEW: Delete draft pay runs** with confirmation
- ✅ **NEW: Setup wizard** (/payroll/new) with smart date calculation
- ✅ **NEW: Overlap detection** prevents duplicate periods
- ✅ **NEW: Improved flow** - Setup → Employees → Review → Complete
- ✅ **FIXED: Contractor calculation** - properly handles hourly contractors
- ✅ Create pay run with validation
- ✅ Edit employee pay items
- ✅ Review & validation panel
- ✅ Finalize pay run
- ✅ Pay run detail drawer
- ✅ Automatic totals calculation
- ✅ Status tracking (draft, finalized, completed)
- ✅ Contractor badges and special treatment

### Transactions (/dashboard/transactions)

- ✅ **NEW: View transaction modal** - detailed view with all fields
- ✅ **NEW: Edit transaction modal** - update existing transactions
- ✅ **NEW: Delete transaction modal** - safe deletion with confirmation
- ✅ **NEW: Enhanced add modal** - category, payment method, reference, notes
- ✅ Transaction list with table view
- ✅ Summary cards (income, expenses, GST, net)
- ✅ Search transactions (by description, category, reference)
- ✅ Filter by period (month, quarter, all time)
- ✅ Filter by type (income, expense)
- ✅ CSV export with new fields
- ✅ Real-time sync
- ✅ Empty states

### BAS (/dashboard/bas)

- ✅ Quarterly GST summaries
- ✅ Summary cards (quarters, GST collected, GST paid, net)
- ✅ Quarter selection
- ✅ Detailed quarter breakdown
- ✅ CSV/PDF export with org branding
- ✅ BAS information panel
- ✅ Real-time calculation from transactions

### Settings (/dashboard/settings)

- ✅ Business information (name, ABN, contact)
- ✅ Tax & compliance (GST registration, reporting cycle, FY start)
- ✅ Payroll defaults (super rate, pay frequency, pay day)
- ✅ Banking information (BSB, account)
- ✅ Validation (ABN, email)
- ✅ Unsaved changes warning
- ✅ Last updated timestamp

### Navigation

- ✅ Desktop sidebar (fixed, with logo and tip section)
- ✅ Mobile menu (slide-out with backdrop)
- ✅ Topbar (org info, search, notifications, user menu)
- ✅ Active state highlighting
- ✅ Sign out functionality

## 🚧 Recent Updates (October 2025)

### **Transactions Module Enhancements**

**What Changed:**

- Consolidated all transaction modals into single file (`TransactionModals.tsx`)
- Added full CRUD operations for transactions
- Enhanced data capture with new fields
- Improved user experience with better modals

**New Features:**

1. **View Transaction Modal**
   - Beautiful detail view with color-coded badges
   - Complete breakdown (amount excl GST, GST, total)
   - Shows all fields: category, payment method, reference, notes
   - Quick edit/delete actions

2. **Edit Transaction Modal**
   - Pre-filled form with existing data
   - All fields editable
   - Live GST calculation preview
   - Validation and error handling

3. **Delete Transaction Modal**
   - Confirmation dialog with transaction summary
   - Shows amount being deleted
   - Loading states

4. **Enhanced Add Transaction Modal**
   - 7 income categories + 14 expense categories
   - 8 payment methods
   - Reference/invoice number field
   - Notes field for additional info
   - Live amount summary with GST calculation

**Database Changes:**

```sql
ALTER TABLE transactions
ADD COLUMN category VARCHAR(100),
ADD COLUMN payment_method VARCHAR(50),
ADD COLUMN reference VARCHAR(100),
ADD COLUMN notes TEXT,
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_payment_method ON transactions(payment_method);
```

**Files Updated:**

- `src/components/TransactionModals.tsx` (NEW - consolidated)
- `src/app/dashboard/transactions/page.tsx` (enhanced with modals)
- Deleted: `src/components/AddTransactionModal.tsx` (merged into TransactionModals)

---

### **Payroll Module Improvements**

**What Changed:**

- Added delete functionality for draft pay runs
- Created setup wizard for better UX
- Fixed contractor calculation bug
- Added overlap detection for pay periods
- Improved step flow navigation

**New Features:**

1. **Delete Draft Pay Runs**
   - Inline confirmation (no modal)
   - Cascading delete (items → run)
   - Loading states with feedback
   - Success/error notifications

2. **Setup Wizard** (`/payroll/new`)
   - Smart date auto-calculation based on frequency
   - Visual frequency selection cards
   - Real-time overlap detection (500ms debounce)
   - Date validation (start < end, pay >= end)
   - Period duration display
   - Summary preview before creation
   - Clear visual feedback (checking → success/error)

3. **Improved Flow**
   - **Before:** Click "Create" → Jump to Review (confusing)
   - **After:** Click "Create" → Setup Wizard → Setup Step → Employees → Review → Complete
   - URL parameter (`?step=setup`) controls initial step
   - Can navigate between steps freely
   - Progress indicator updates correctly

4. **Fixed Contractor Handling**
   - **Bug:** Contractors showed $0 for everything
   - **Root Cause:** Only checked base_salary, ignored hourly_rate
   - **Fix:** Now checks hourly_rate first, then base_salary
   - Contractors: No tax withholding ($0 tax)
   - Contractors: No super contributions ($0 super)
   - Net = Gross for contractors (they manage own tax/super)
   - Purple "Contractor" badge for clarity
   - Info message explaining contractor treatment

5. **Overlap Detection**
   - Checks existing pay runs in real-time
   - Prevents creating overlapping periods
   - Clear error messages
   - Visual feedback (checking/success/error states)

**Files Changed:**

- `src/app/dashboard/payroll/page.tsx` (added delete, better navigation)
- `src/app/dashboard/payroll/new/page.tsx` (NEW - setup wizard)
- `src/app/dashboard/payroll/[id]/page.tsx` (fixed step flow with URL params)
- `src/app/dashboard/payroll/[id]/_components/EmployeesStep.tsx` (fixed contractor calc)

**Bug Fixes:**

1. ✅ Skipping employee selection step
2. ✅ Contractor showing $0 for all values
3. ✅ No way to delete draft pay runs
4. ✅ Duplicate pay period prevention

**Example - Contractor Calculation:**

```typescript
// George Sattsaev (Contractor)
// Hourly: $26/hr, Hours: 38/week, Frequency: Fortnightly

BEFORE (Bug):
Gross: $0.00  Tax: $0.00  Super: $0.00  Net: $0.00  ❌

AFTER (Fixed):
Gross: $1,976.00  // 26 × (38 × 2) = 26 × 76
Tax: $0.00        // Contractors manage own
Super: $0.00      // Contractors manage own
Net: $1,976.00    // Same as gross
✅ Purple "Contractor" badge shown
```

---

### **Database Migrations**

**Setup Approach:** Using remote-only migrations (no local database needed)

**Migration for Transactions:**

```sql
-- See database/migrations/add_transaction_fields.sql
-- Adds: category, payment_method, reference, notes, updated_at
-- Creates indexes for performance
-- Adds auto-update trigger for updated_at
```

**How to Apply:**

1. **Option 1 (Quick):** Run SQL directly in Supabase Dashboard SQL Editor
2. **Option 2 (Proper):** Set up Supabase CLI and use migrations

**Supabase CLI Setup (Optional):**

```bash
# Install
brew install supabase/tap/supabase

# Initialize
supabase init

# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Pull current schema
supabase db pull

# Create new migration
supabase migration new migration_name

# Apply to remote
supabase db push
```

## 🐛 Known Issues

- None currently! 🎉

## 📝 Code Patterns & Conventions

### Data Fetching

```tsx
const loadData = useCallback(async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setData(data || []);
  } catch (error) {
    console.error('Error:', error);
    notify.error('Error', 'Failed to load data');
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  loadData();
}, [loadData]);
```

### Real-time Subscriptions

```tsx
useEffect(() => {
  const channel = supabase
    .channel('table-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, (payload) => {
      // Handle INSERT, UPDATE, DELETE
      loadData();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [loadData]);
```

### Modal Pattern

```tsx
const [showModal, setShowModal] = useState(false);

// In JSX
{
  showModal && (
    <ModalComponent
      onClose={() => setShowModal(false)}
      onSuccess={() => {
        loadData();
        setShowModal(false);
      }}
    />
  );
}
```

### Notifications

```tsx
import { notify } from '@/lib/notify';

// Success
notify.success('Title', 'Description');

// Error - use type guard for error handling
try {
  // operation
} catch (error) {
  notify.error('Error', error instanceof Error ? error.message : 'Failed');
}

// Info
notify.info('Title', 'Info message');
```

### Type Safety

```tsx
// Always import types
import type { Employee, EmploymentType } from '@/types/employee';
import type { Transaction } from '@/types/transaction';

// Use proper typing for state
const [employee, setEmployee] = useState<Employee | null>(null);

// Type function parameters
const updateEmployee = (id: string, updates: Partial<Employee>) => {
  // ...
};

// Avoid explicit 'any' - use type guards
catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
}
```

## 🎯 Australian Compliance Features

### Tax Calculations

- PAYG tax withholding (tax tables 2024-25)
- Tax-free threshold support
- HELP/HECS debt handling
- Medicare levy (2%)

### Superannuation

- Current SG rate: 11.5% (July 2024)
- Automatic calculation on gross wages
- Quarterly payment tracking
- Super fund details storage
- **Special handling for contractors** (they manage own super)

### Contractor vs Employee Treatment

**Employees:**

- PAYG tax withheld
- Employer super contributions (11.5%)
- Leave entitlements
- Workers compensation

**Contractors:**

- No tax withholding (they lodge own BAS/returns)
- No employer super (they arrange own)
- No leave entitlements
- Provide ABN instead of TFN
- Gross payment only

### Single Touch Payroll (STP)

- Status: Planned
- Auto-lodgement to ATO on finalize
- Real-time reporting

### BAS Reporting

- Quarterly GST calculation
- G1 (Total sales), G2 (Export sales), G3 (Other GST-free)
- 1A (GST on sales), 1B (GST on purchases)
- Net GST payable/refundable

### Fair Work

- National Minimum Wage tracking ($23.23/hr as of July 2024)
- Leave entitlements (planned)
- Award rates (planned)

## 📜 Roadmap / Missing Features

### High Priority (Quick Wins)

1. **Attachments/Receipts** - Upload invoices/receipts for transactions
2. **Payslip PDF generation** - Auto-generate with jsPDF
3. **Leave balance tracking** - Annual, sick, personal leave
4. **Better date range picker** - Calendar-based selection
5. **Audit log** - Track all changes
6. **Recurring transactions** - Auto-create monthly expenses

### Medium Priority

7. **Document uploads** - Contracts, IDs, receipts
8. **Email payslips** - Send to employees automatically
9. **ABA file export** - Bank batch payment file
10. **Employee portal** - View own payslips/details
11. **Timesheets** - For hourly employees
12. **Bulk operations** - Select multiple transactions
13. **Transaction templates** - Save common transactions

### Advanced Features

14. **Bank feeds** - Auto-import transactions
15. **Receipt OCR** - Scan and extract data
16. **Xero/MYOB sync** - Export to accounting software
17. **Multi-user support** - Team members with roles
18. **Super clearing house** - Auto-pay super
19. **STP Phase 2 lodgement** - Direct to ATO
20. **Mobile app** - React Native or PWA
21. **Advanced reporting** - P&L, Balance Sheet, Cash Flow
22. **Forecasting** - Predict cash flow

## 🛠 Debugging Tips

### Common Issues

1. **Real-time not working:** Check Supabase channel subscriptions
2. **Type errors:** Ensure all types are properly imported
3. **Modal not closing:** Check state management in parent
4. **Calculations wrong:** Verify GST exclusion logic
5. **Empty states:** Check loading and data conditions
6. **Contractor shows $0:** Check hourly_rate calculation before base_salary

### Useful Commands

```bash
# Check for TypeScript errors
npm run build

# Check for linting issues
npm run lint

# View Supabase logs (if using CLI)
supabase logs

# Reset local database (if using CLI)
supabase db reset
```

## 📚 Key Dependencies

```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "typescript": "^5.0.0",
  "@supabase/supabase-js": "^2.39.0",
  "tailwindcss": "^3.4.0",
  "recharts": "^2.10.0",
  "lucide-react": "^0.263.1",
  "date-fns": "^3.0.0",
  "jspdf": "^2.5.1",
  "jspdf-autotable": "^3.8.0",
  "file-saver": "^2.0.5",
  "sonner": "^1.0.0"
}
```

## 📁 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 📖 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [ATO Business Portal](https://www.ato.gov.au/business)
- [Fair Work Ombudsman](https://www.fairwork.gov.au)

## 💡 Quick Start for New Chat

When starting a new conversation about BookLogex:

1. Upload this context file
2. Attach any specific files you're working on (max 2-3)
3. Clearly state your current task or question

Example:

```
I'm working on BookLogex (context attached).

Files: [employee.ts, EditEmployeeModal.tsx]

Task: Add validation for Australian mobile numbers in the employee form.
```

---

**Last Updated:** October 16, 2025  
**Version:** 1.1.0  
**Status:** MVP Development Phase  
**Recent Work:** Transaction CRUD operations, Payroll improvements, Contractor fixes

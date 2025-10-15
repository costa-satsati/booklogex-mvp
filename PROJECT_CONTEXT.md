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
│   │   │   ├── page.tsx          # Payroll runs list
│   │   │   ├── [id]/page.tsx    # Edit payroll run
│   │   │   └── _components/      # Payroll sub-components
│   │   ├── transactions/
│   │   │   └── page.tsx          # Income/expense tracking
│   │   ├── bas/
│   │   │   └── page.tsx          # BAS quarterly reports
│   │   └── settings/
│   │       └── page.tsx          # Organisation settings
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── AddEmployeeModal.tsx
│   ├── EditEmployeeModal.tsx
│   ├── ConfirmDeleteModal.tsx
│   ├── AddTransactionModal.tsx
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
- status (draft|finalized)
- total_gross (numeric)
- total_tax (numeric)
- total_super (numeric)
- total_net (numeric)
- idempotency_key (text, unique)
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

- ✅ List all pay runs
- ✅ Create pay run wizard (setup, validation)
- ✅ Edit employee pay items
- ✅ Review & validation panel
- ✅ Finalize pay run
- ✅ Pay run detail drawer
- ✅ Automatic totals calculation
- ✅ Status tracking (draft, finalized)

### Transactions (/dashboard/transactions)

- ✅ Transaction list with table view
- ✅ Summary cards (income, expenses, GST, net)
- ✅ Search transactions
- ✅ Filter by period (month, quarter, all time)
- ✅ Filter by type (income, expense)
- ✅ Add transaction modal
- ✅ CSV export
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

## 🚧 Known Issues

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

// Error
notify.error('Title', 'Error message');

// Info
notify.info('Title', 'Info message');
```

### Type Safety

```tsx
// Always import types
import type { Employee, EmploymentType } from '@/types/employee';

// Use proper typing for state
const [employee, setEmployee] = useState<Employee | null>(null);

// Type function parameters
const updateEmployee = (id: string, updates: Partial<Employee>) => {
  // ...
};
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

## 🔜 Roadmap / Missing Features

### High Priority (Quick Wins)

1. **Transaction editing/deleting** - Modal with form validation
2. **Payslip PDF generation** - Auto-generate with jsPDF
3. **Leave balance tracking** - Annual, sick, personal leave
4. **Transaction categories** - Categorize income/expenses
5. **Better date range picker** - Calendar-based selection
6. **Audit log** - Track all changes

### Medium Priority

7. **Document uploads** - Contracts, IDs, receipts
8. **Email payslips** - Send to employees automatically
9. **ABA file export** - Bank batch payment file
10. **Recurring transactions** - Auto-create monthly expenses
11. **Employee portal** - View own payslips/details
12. **Timesheets** - For hourly employees
13. **Bulk operations** - Select multiple transactions

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

## 🐛 Debugging Tips

### Common Issues

1. **Real-time not working:** Check Supabase channel subscriptions
2. **Type errors:** Ensure all types are properly imported
3. **Modal not closing:** Check state management in parent
4. **Calculations wrong:** Verify GST exclusion logic
5. **Empty states:** Check loading and data conditions

### Useful Commands

```bash
# Check for TypeScript errors
npm run build

# Check for linting issues
npm run lint

# View Supabase logs
supabase logs

# Reset local database
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

## 🔐 Environment Variables

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

**Last Updated:** October 15, 2025  
**Version:** 1.0.0  
**Status:** MVP Development Phase

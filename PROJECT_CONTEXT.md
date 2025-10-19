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
- **Auth:** Supabase Auth (Email/Password + Google OAuth)
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
│   ├── login/
│   │   └── page.tsx              # Email/password + Google OAuth (magic links removed)
│   ├── reset-password/
│   │   └── page.tsx              # Password reset flow
│   ├── update-password/
│   │   └── page.tsx              # Set new password
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # Auth callback (handles OAuth + creates missing profiles)
│   ├── setup/
│   │   └── page.tsx              # Fallback profile creation (if trigger fails)
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
│   │   │   ├── new/page.tsx      # Setup wizard with validation
│   │   │   ├── [id]/page.tsx    # Edit payroll run (fixed flow)
│   │   │   └── _components/      # Payroll sub-components
│   │   ├── transactions/
│   │   │   └── page.tsx          # Income/expense tracking with view/edit/delete
│   │   ├── bas/
│   │   │   └── page.tsx          # BAS quarterly reports
│   │   └── settings/
│   │       └── page.tsx          # Organisation + Profile settings (tabbed)
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── TransactionModals.tsx     # All transaction modals (add/view/edit/delete)
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
│   ├── organisation.ts           # Organisation types (updated)
│   └── transaction.ts            # Transaction types
├── context/
│   └── OrgContext.tsx            # Global organisation context (renamed from OrgSettingsContext)
└── middleware.ts                 # Auth middleware (checks profile exists)
```

## 🗄 Database Schema

### Core Tables

#### **organisations** (Single source of truth for business data)

```sql
- id (uuid, PK)
- owner_id (uuid, FK to auth.users) *required
- name (text, nullable)                    # User fills during onboarding
- abn (text, nullable)                     # 11 digits, no UNIQUE constraint
- contact_email (text, nullable)
- contact_phone (text, nullable)
- business_address (text, nullable)
- gst_registered (boolean, default: false) *required
- gst_cycle (text, default: 'quarterly')   *required
- financial_year_start_month (int, default: 7) *required
- default_super_rate (numeric, default: 11.5) *required
- default_pay_frequency (text, default: 'fortnightly') *required
- default_pay_day (text, nullable)
- bank_bsb (text, nullable)
- bank_account (text, nullable)
- bank_account_name (text, nullable)
- created_at (timestamp) *required
- updated_at (timestamp, default: now())
```

**Indexes:**

- `idx_organisations_owner_id` on `owner_id`

**Notes:**

- One organisation per user (single-owner model)
- `name` is nullable to allow onboarding flow
- `abn` is nullable and has NO UNIQUE constraint (allows empty signups)
- All business settings consolidated here (no separate settings table)

---

#### **user_profiles** (Links users to organisations)

```sql
- id (uuid, PK, FK to auth.users)
- org_id (uuid, FK to organisations) *required
- full_name (text, nullable)
- phone (text, nullable)
- avatar_url (text, nullable)
- role (text, default: 'owner') *required
- is_active (boolean, default: true) *required
- created_at (timestamp) *required
- updated_at (timestamp with time zone, default: now())
```

**Indexes:**

- `idx_user_profiles_org_id` on `org_id`

**Notes:**

- Links `auth.users` to `organisations`
- Created automatically on signup via trigger
- Ready for multi-user feature (future)

---

#### **employees**

```sql
- id (uuid, PK)
- org_id (uuid, FK to organisations) *required
- full_name (text) *required
- first_name (text, generated)
- last_name (text, generated)
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
- pay_frequency (weekly|fortnightly|monthly)  # Per-employee override
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

**Indexes:**

- `idx_employees_org_id` on `org_id`
- `idx_employees_active` on `active`

**Notes:**

- `pay_frequency` on employee overrides `default_pay_frequency` on organisation
- Both are needed for flexibility (casuals weekly, contractors monthly, etc.)

---

#### **payroll_runs**

```sql
- id (uuid, PK)
- org_id (uuid, FK to organisations)
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

**Indexes:**

- `idx_payroll_runs_org_id` on `org_id`
- `idx_payroll_runs_status` on `status`

---

#### **payroll_items**

```sql
- id (uuid, PK)
- payroll_run_id (uuid, FK to payroll_runs)
- employee_id (uuid, FK to employees)
- gross (numeric)
- tax (numeric)
- super (numeric)
- net (numeric)
- hours_worked (numeric)
- created_at (timestamp)
```

**Indexes:**

- `idx_payroll_items_payroll_run_id` on `payroll_run_id`
- `idx_payroll_items_employee_id` on `employee_id`

---

#### **transactions**

```sql
- id (uuid, PK)
- org_id (uuid, FK to organisations)
- txn_date (date)
- description (text)
- amount (numeric) - excludes GST
- gst_amount (numeric)
- type (income|expense)
- category (text) - Income/expense category
- payment_method (text) - How payment was made
- reference (text) - Invoice/receipt number
- notes (text) - Additional information
- updated_at (timestamp) - Auto-updated timestamp
- created_at (timestamp)
```

**Indexes:**

- `idx_transactions_org_id` on `org_id`
- `idx_transactions_txn_date` on `txn_date`
- `idx_transactions_type` on `type`
- `idx_transactions_category` on `category`
- `idx_transactions_payment_method` on `payment_method`

**Notes:**

- `user_id` column removed (redundant with org_id in single-owner model)

---

### Auth Flow Tables

#### **auth.users** (Supabase managed)

- Handles authentication
- Cannot be modified directly
- Trigger fires on INSERT to create profile/org

#### **~~public.users~~** (REMOVED)

- Was a redundant mirror of auth.users
- Dropped to simplify schema

#### **~~organisation_settings~~** (REMOVED)

- Was duplicate of organisations table
- All fields moved to organisations table
- Table dropped completely

---

## 🔄 Auth & Signup Flow

### **Current Flow (Working ✅):**

1. User signs up via:
   - Email/password (with confirmation email)
   - Google OAuth

2. `auth.users` record created by Supabase

3. Trigger `on_auth_user_created_profiles` fires

4. `handle_new_user()` function executes:

```sql
   - Creates organisations record (name=NULL, abn=NULL, owner_id=user.id)
   - Creates user_profiles record (id=user.id, org_id=new_org_id, role='owner')
```

5. User confirms email (if password signup)

6. Auth callback (`/auth/callback`) checks for profile:
   - If missing, creates org + profile manually (fallback)
   - Redirects to `/dashboard`

7. User completes onboarding (fills in business name, ABN, etc.)

### **Removed:**

- ❌ Magic link authentication (simplified to email/password + OAuth only)
- ❌ `public.users` table (redundant)
- ❌ `organisation_settings` table (consolidated into organisations)
- ❌ `create_default_org_settings()` function (no longer needed)

### **Database Trigger:**

```sql
CREATE TRIGGER on_auth_user_created_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Function:** Creates organisation (with sensible defaults) + user_profile on signup

---

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


// Section header

  Title
  Description


// Summary card



    Section Title

  {/* Content */}


// Status badge

  Active

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

---

## ✅ Features Implemented

### Authentication (/login)

- ✅ Email/password signup with confirmation email
- ✅ Email/password signin
- ✅ Google OAuth
- ✅ Password reset flow
- ✅ Automatic org + profile creation on signup
- ✅ Auth callback with fallback profile creation
- ✅ Middleware to check profile exists
- ❌ Magic links removed (simplified)

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
- ✅ Delete draft pay runs with confirmation
- ✅ Setup wizard (/payroll/new) with smart date calculation
- ✅ Overlap detection prevents duplicate periods
- ✅ Improved flow - Setup → Employees → Review → Complete
- ✅ Fixed contractor calculation - properly handles hourly contractors
- ✅ Create pay run with validation
- ✅ Edit employee pay items
- ✅ Review & validation panel
- ✅ Finalize pay run
- ✅ Pay run detail drawer
- ✅ Automatic totals calculation
- ✅ Status tracking (draft, finalized, completed)
- ✅ Contractor badges and special treatment

### Transactions (/dashboard/transactions)

- ✅ View transaction modal - detailed view with all fields
- ✅ Edit transaction modal - update existing transactions
- ✅ Delete transaction modal - safe deletion with confirmation
- ✅ Enhanced add modal - category, payment method, reference, notes
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

- ✅ **Tabbed interface** - Organisation Settings + My Profile
- ✅ **Organisation Tab:**
  - Business information (name, ABN, contact)
  - Tax & compliance (GST registration, reporting cycle, FY start)
  - Payroll defaults (super rate, pay frequency, pay day)
  - Banking information (BSB, account)
- ✅ **Profile Tab:**
  - Personal information (full name, phone)
  - Account security (password change link)
  - Role display
- ✅ Validation (ABN, email)
- ✅ Unsaved changes warning
- ✅ Last updated timestamp
- ✅ Onboarding alert if business name is NULL
- ✅ Saves to `organisations` table (not org_settings)

### Navigation

- ✅ Desktop sidebar (fixed, with logo and tip section)
- ✅ Mobile menu (slide-out with backdrop)
- ✅ Topbar (org info, search, notifications, user menu)
- ✅ Active state highlighting
- ✅ Sign out functionality

---

## 🚧 Recent Updates (October 2025)

### **Authentication & Database Restructuring**

**What Changed:**

- Removed magic link authentication
- Consolidated `organisation_settings` into `organisations` table
- Removed redundant `public.users` table
- Fixed auth trigger to create org + profile on signup
- Added auth callback with fallback profile creation
- Added middleware to check profile exists

**New Auth Flow:**

1. Email/password or Google OAuth signup
2. Confirmation email sent (for password signups)
3. Trigger creates `organisations` + `user_profiles`
4. Auth callback verifies profile exists (creates if missing)
5. Middleware blocks dashboard access if no profile
6. Fallback `/setup` page for manual profile creation

**Database Changes:**

```sql
-- Removed tables
DROP TABLE organisation_settings;
DROP TABLE public.users;

-- Updated organisations
ALTER TABLE organisations
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN abn DROP NOT NULL,
ADD COLUMN bank_bsb text,
ADD COLUMN bank_account text,
ADD COLUMN bank_account_name text,
ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- Updated trigger
CREATE OR REPLACE FUNCTION handle_new_user() ...
-- Creates organisations with NULL name/abn
-- Creates user_profiles with org_id
```

**Files Created:**

- `src/app/auth/callback/route.ts` - OAuth callback + profile creation
- `src/app/setup/page.tsx` - Fallback profile creation
- `src/middleware.ts` - Profile existence check

**Files Updated:**

- `src/app/login/page.tsx` - Removed magic links, improved signup flow
- `src/app/dashboard/settings/page.tsx` - Tabbed interface, uses organisations table
- `src/context/OrgContext.tsx` - Renamed from OrgSettingsContext, uses organisations

---

### **Settings Page Redesign**

**What Changed:**

- Split into 2 tabs: Organisation Settings + My Profile
- Organisation tab contains all business data
- Profile tab contains user-specific settings
- Clear separation of concerns
- Ready for future features (notifications, 2FA, team management)

**Structure:**

```
Settings Page
├── Organisation Settings Tab
│   ├── Business Information
│   ├── Tax & Compliance
│   ├── Payroll Defaults
│   └── Banking Information
│
└── My Profile Tab
    ├── Personal Information
    ├── Account Security
    └── Notifications (coming soon)
```

**Benefits:**

- Clear data ownership (business vs personal)
- Scalable for multi-user (future)
- Matches industry standards (Xero, MYOB)
- Mobile-friendly tabbed interface

---

### **Payroll Module Improvements**

**What Changed:**

- Added delete functionality for draft pay runs
- Created setup wizard for better UX
- Fixed contractor calculation bug
- Added overlap detection for pay periods
- Improved step flow navigation

**Bug Fixes:**

1. ✅ Skipping employee selection step
2. ✅ Contractor showing $0 for all values
3. ✅ No way to delete draft pay runs
4. ✅ Duplicate pay period prevention

**Example - Contractor Calculation:**

```typescript
// George (Contractor)
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

### **Transactions Module Enhancements**

**What Changed:**

- Consolidated all transaction modals into single file
- Added full CRUD operations for transactions
- Enhanced data capture with new fields
- Improved user experience with better modals

**New Features:**

1. View Transaction Modal - detailed view with color-coded badges
2. Edit Transaction Modal - pre-filled form with validation
3. Delete Transaction Modal - confirmation with summary
4. Enhanced Add Modal - categories, payment methods, reference, notes

**Database Changes:**

```sql
ALTER TABLE transactions
ADD COLUMN category VARCHAR(100),
ADD COLUMN payment_method VARCHAR(50),
ADD COLUMN reference VARCHAR(100),
ADD COLUMN notes TEXT,
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW(),
DROP COLUMN user_id;  -- Redundant with org_id

CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_payment_method ON transactions(payment_method);
```

---

## 🛠 Known Issues

- None currently! 🎉

---

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
const [employee, setEmployee] = useState(null);

// Type function parameters
const updateEmployee = (id: string, updates: Partial) => {
  // ...
};

// Avoid explicit 'any' - use type guards
catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
}
```

### Organisation Context Usage

```tsx
import { useOrgContext } from '@/context/OrgContext';

// In component
const { organisation, loading, refetch } = useOrgContext();

// Access organisation data
const businessName = organisation?.name;
const defaultPayFreq = organisation?.default_pay_frequency;

// Refresh after updates
await refetch();
```

---

## 🎯 Australian Compliance Features

### Tax Calculations

- PAYG tax withholding (tax tables 2024-25)
- Tax-free threshold support
- HELP/HECS debt handling
- Medicare levy (2%)

### Superannuation

- Current SG rate: 11.5% (July 2024)
- Increasing to 12% from July 2025
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

---

## 📜 Roadmap / Missing Features

### High Priority (Quick Wins)

1. **Onboarding flow** - Banner/wizard to complete business setup
2. **Attachments/Receipts** - Upload invoices/receipts for transactions
3. **Payslip PDF generation** - Auto-generate with jsPDF
4. **Leave balance tracking** - Annual, sick, personal leave
5. **Better date range picker** - Calendar-based selection
6. **Audit log** - Track all changes
7. **Recurring transactions** - Auto-create monthly expenses

### Medium Priority

8. **Document uploads** - Contracts, IDs, receipts
9. **Email payslips** - Send to employees automatically
10. **ABA file export** - Bank batch payment file
11. **Employee portal** - View own payslips/details
12. **Timesheets** - For hourly employees
13. **Bulk operations** - Select multiple transactions
14. **Transaction templates** - Save common transactions
15. **2FA Authentication** - Two-factor auth for security
16. **Notification preferences** - Email alerts, reminders

### Advanced Features

17. **Multi-user support** - Team members with roles (accountants, managers)
18. **Bank feeds** - Auto-import transactions
19. **Receipt OCR** - Scan and extract data
20. **Xero/MYOB sync** - Export to accounting software
21. **Super clearing house** - Auto-pay super
22. **STP Phase 2 lodgement** - Direct to ATO
23. **Mobile app** - React Native or PWA
24. **Advanced reporting** - P&L, Balance Sheet, Cash Flow
25. **Forecasting** - Predict cash flow
26. **Team management** - Invite users, manage permissions

---

## 🛠 Debugging Tips

### Common Issues

1. **Real-time not working:** Check Supabase channel subscriptions
2. **Type errors:** Ensure all types are properly imported
3. **Modal not closing:** Check state management in parent
4. **Calculations wrong:** Verify GST exclusion logic
5. **Empty states:** Check loading and data conditions
6. **Contractor shows $0:** Check hourly_rate calculation before base_salary
7. **Auth trigger not firing:** Check trigger exists on auth.users
8. **Profile missing on signup:** Check auth callback route exists
9. **Organisation context empty:** Ensure OrgProvider wraps app

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

### Supabase Debugging Queries

```sql
-- Check if trigger exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- Find users without profiles
SELECT au.id, au.email, au.created_at,
  CASE WHEN up.id IS NULL THEN '❌ Missing' ELSE '✅ Has profile' END
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id;

-- Find organisations without names (onboarding incomplete)
SELECT o.id, o.owner_id, au.email, o.created_at
FROM organisations o
JOIN auth.users au ON au.id = o.owner_id
WHERE o.name IS NULL;

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 📚 Key Dependencies

```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "typescript": "^5.0.0",
  "@supabase/supabase-js": "^2.39.0",
  "@supabase/auth-helpers-nextjs": "^0.8.0",
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

---

## 📁 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000RetryKContinue

🔐 Row Level Security (RLS)
Current Status:
RLS policies need to be implemented for production security.
Recommended Policies:
sql-- Enable RLS on all tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- organisations: Users can only see/update their own org
CREATE POLICY "Users can view own organisation"
  ON organisations FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can update own organisation"
  ON organisations FOR UPDATE
  USING (owner_id = auth.uid());

-- user_profiles: Users can view/update own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- employees: Users can access their org's employees
CREATE POLICY "Users can view own org employees"
  ON employees FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own org employees"
  ON employees FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org employees"
  ON employees FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own org employees"
  ON employees FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

-- payroll_runs: Users can access their org's payroll
CREATE POLICY "Users can view own org payroll runs"
  ON payroll_runs FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own org payroll runs"
  ON payroll_runs FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org payroll runs"
  ON payroll_runs FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own org payroll runs"
  ON payroll_runs FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

-- payroll_items: Users can access via payroll_runs
CREATE POLICY "Users can view own org payroll items"
  ON payroll_items FOR SELECT
  USING (
    payroll_run_id IN (
      SELECT id FROM payroll_runs
      WHERE org_id IN (
        SELECT org_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert own org payroll items"
  ON payroll_items FOR INSERT
  WITH CHECK (
    payroll_run_id IN (
      SELECT id FROM payroll_runs
      WHERE org_id IN (
        SELECT org_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own org payroll items"
  ON payroll_items FOR UPDATE
  USING (
    payroll_run_id IN (
      SELECT id FROM payroll_runs
      WHERE org_id IN (
        SELECT org_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own org payroll items"
  ON payroll_items FOR DELETE
  USING (
    payroll_run_id IN (
      SELECT id FROM payroll_runs
      WHERE org_id IN (
        SELECT org_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- transactions: Users can access their org's transactions
CREATE POLICY "Users can view own org transactions"
  ON transactions FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own org transactions"
  ON transactions FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org transactions"
  ON transactions FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own org transactions"
  ON transactions FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

🔧 Database Indexes
Performance Optimization:
sql-- Organisations
CREATE INDEX IF NOT EXISTS idx_organisations_owner_id ON organisations(owner_id);

-- User Profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON user_profiles(org_id);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_employees_employment_type ON employees(employment_type);

-- Payroll Runs
CREATE INDEX IF NOT EXISTS idx_payroll_runs_org_id ON payroll_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_pay_date ON payroll_runs(pay_date);

-- Payroll Items
CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll_run_id ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee_id ON payroll_items(employee_id);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_txn_date ON transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
```

---

## 📖 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [ATO Business Portal](https://www.ato.gov.au/business)
- [Fair Work Ombudsman](https://www.fairwork.gov.au)
- [Single Touch Payroll](https://www.ato.gov.au/business/single-touch-payroll)

---

## 💡 Quick Start for New Chat

When starting a new conversation about BookLogex:

1. Upload this context file
2. Attach any specific files you're working on (max 2-3)
3. Clearly state your current task or question

**Example:**

```
I'm working on BookLogex (context attached).

Files: [employee.ts, EditEmployeeModal.tsx]

Task: Add validation for Australian mobile numbers in the employee form.

🔄 Migration Guide
From organisation_settings to organisations
If you have existing code using the old structure:
Find and replace:
typescript// OLD
import { useOrgSettings } from '@/context/OrgSettingsContext';
const { settings: orgSettings } = useOrgSettings();
const businessName = orgSettings?.business_name;

// NEW
import { useOrgContext } from '@/context/OrgContext';
const { organisation } = useOrgContext();
const businessName = organisation?.name;
Field mappings:
Old (organisation_settings)New (organisations)business_namenameabnabncontact_emailcontact_emailcontact_phonecontact_phonebusiness_addressbusiness_addressgst_registeredgst_registeredgst_cyclegst_cyclefinancial_year_start_monthfinancial_year_start_monthdefault_super_ratedefault_super_ratedefault_pay_frequencydefault_pay_frequencydefault_pay_daydefault_pay_daybank_bsbbank_bsbbank_accountbank_accountbank_account_namebank_account_name
Query changes:
typescript// OLD
const { data } = await supabase
  .from('organisation_settings')
  .select('*')
  .eq('user_id', userId)
  .single();

// NEW
const { data } = await supabase
  .from('organisations')
  .select('*')
  .eq('owner_id', userId)
  .single();
```

---

## 🎯 Architecture Decisions

### **Why Single Owner Model?**

**Current:** One user = One organisation

**Rationale:**

- 95% of target market (sole traders, micro businesses) don't need multi-user
- Simpler onboarding (no complex permission system)
- Easier to understand for non-technical users
- Can add multi-user later without major refactor

**Future:** Ready for multi-user

- `organisations` table already supports multiple `user_profiles`
- Just need to add invitation system and role-based permissions

---

### **Why No Magic Links?**

**Removed:** Magic link (OTP) authentication

**Rationale:**

- Not standard in payroll/accounting SaaS (Xero, MYOB, QuickBooks don't use it)
- Adds complexity (separate confirmation flow)
- Users prefer familiar password + Google OAuth
- Simpler auth flow = fewer edge cases

**Current:** Email/password + Google OAuth only

---

### **Why Nullable Organisation Name?**

**Design:** `organisations.name` is nullable on signup

**Rationale:**

- Allows immediate signup without friction
- Users can complete onboarding after exploring dashboard
- Progressive disclosure (don't ask for everything upfront)
- Can show onboarding prompts when name is NULL

**Onboarding Flow:**

1. Sign up (name=NULL)
2. Explore dashboard
3. See "Complete setup" banner
4. Fill in business details
5. Start using payroll features

---

### **Why Keep pay_frequency on Both Tables?**

**Design:** `organisations.default_pay_frequency` AND `employees.pay_frequency`

**Rationale:**

- Real businesses have mixed frequencies:
  - Full-time: Fortnightly
  - Casuals: Weekly
  - Contractors: Monthly
  - Executives: Monthly
- Organisation default = smart default for new employees
- Employee-level = per-person override when needed
- Flexibility without forcing all employees to same schedule

---

## 📊 Data Model Relationships

```
auth.users (Supabase Auth)
    ↓ id (owner_id)
organisations
    ↓ id (org_id)
    ├─→ user_profiles (org_id → organisations.id)
    ├─→ employees (org_id → organisations.id)
    ├─→ payroll_runs (org_id → organisations.id)
    │       ↓ id (payroll_run_id)
    │       └─→ payroll_items (payroll_run_id → payroll_runs.id)
    │               └─→ employees (employee_id → employees.id)
    └─→ transactions (org_id → organisations.id)
Key Points:

Everything scoped to organisations via org_id
user_profiles links users to their organisation
Ready for multi-user (multiple profiles pointing to same org)
Cascade deletes handled at database level


🧪 Testing Strategy
Manual Testing Checklist:
Auth Flow:

 Sign up with email/password
 Confirm email
 Profile + org created automatically
 Sign in with password
 Sign in with Google OAuth
 Password reset flow works

Organisation Setup:

 Dashboard shows "Complete setup" if name is NULL
 Settings page loads with correct tabs
 Can save business name + ABN
 Validation works (ABN, email)
 Unsaved changes warning appears

Employees:

 Can add employee with wizard
 Default pay frequency comes from org
 Can override pay frequency per employee
 Search and filters work
 Real-time updates on changes

Payroll:

 Can create pay run with setup wizard
 Overlap detection prevents duplicates
 Contractors calculated correctly (hourly rate)
 Can delete draft pay runs
 Cannot delete finalized runs

Transactions:

 Can add transaction with category
 Can view transaction details
 Can edit transaction
 Can delete transaction
 Search and filters work

Settings:

 Organisation tab saves to organisations table
 Profile tab saves to user_profiles table
 Tab switching preserves unsaved changes warning
 Last updated timestamp shows correctly


🚀 Deployment Checklist
Before Production:
Security:

 Enable RLS on all tables
 Test RLS policies work correctly
 Remove any console.log with sensitive data
 Set up proper CORS in Supabase
 Enable 2FA for Supabase admin account

Environment:

 Set NEXT_PUBLIC_SITE_URL to production domain
 Configure custom SMTP for emails
 Set up proper error tracking (Sentry)
 Configure analytics (PostHog, Mixpanel)

Database:

 Run all indexes creation
 Enable connection pooling
 Set up automated backups
 Test database performance under load

Auth:

 Configure OAuth redirect URLs for production
 Set up custom email templates
 Test password reset flow in production
 Verify email confirmation works

Performance:

 Enable Next.js production build optimizations
 Set up CDN for static assets
 Configure caching headers
 Run Lighthouse audit

Compliance:

 Add Terms of Service page
 Add Privacy Policy page
 Set up GDPR-compliant data export
 Add cookie consent banner (if using analytics)


🐛 Common Errors & Solutions
Error: "null value in column 'name' violates not-null constraint"
Cause: organisations.name has NOT NULL constraint but trigger inserts NULL
Solution:
sqlALTER TABLE organisations ALTER COLUMN name DROP NOT NULL;

Error: "No organisation found for user"
Cause: Profile created but organisation missing
Solution: Check trigger is working:
sqlSELECT trigger_name FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';
If missing, recreate trigger.

Error: "User not authorized" on queries
Cause: RLS blocking queries
Solution: Check RLS policies exist:
sqlSELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
Temporarily disable RLS for testing:
sqlALTER TABLE organisations DISABLE ROW LEVEL SECURITY;

Error: "useOrgContext must be used within OrgProvider"
Cause: Component using context outside provider
Solution: Wrap app in provider:
typescript// app/layout.tsx
import { OrgProvider } from '@/context/OrgContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OrgProvider>
          {children}
        </OrgProvider>
      </body>
    </html>
  );
}

Error: Contractor shows $0 for gross pay
Cause: Only checking base_salary, ignoring hourly_rate
Solution: Check hourly_rate first:
typescriptconst grossPay = employee.hourly_rate
  ? employee.hourly_rate * hoursWorked
  : employee.base_salary;

📈 Performance Optimization Tips
Database Query Optimization:
typescript// BAD: Multiple queries
const employees = await getEmployees();
for (const emp of employees) {
  const payroll = await getPayroll(emp.id);
}

// GOOD: Single query with join
const { data } = await supabase
  .from('employees')
  .select(`
    *,
    payroll_items (*)
  `)
  .eq('org_id', orgId);
React Performance:
typescript// Use memo for expensive calculations
const totalGross = useMemo(() => {
  return payrollItems.reduce((sum, item) => sum + item.gross, 0);
}, [payrollItems]);

// Use callback for functions passed as props
const handleDelete = useCallback((id: string) => {
  deleteEmployee(id);
}, []);
Supabase Real-time:
typescript// Unsubscribe when component unmounts
useEffect(() => {
  const channel = supabase
    .channel('changes')
    .on('postgres_changes', { ... }, handler)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

🎓 Learning Resources
Recommended Reading:

Next.js App Router: Understanding server/client components
Supabase Auth: Row Level Security best practices
TypeScript: Advanced types for better safety
Australian Tax: ATO guidelines for payroll

Useful Supabase Queries:
sql-- Get all tables and row counts
SELECT schemaname, tablename,
  (SELECT count(*) FROM schemaname.tablename) as row_count
FROM pg_tables
WHERE schemaname = 'public';

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

Last Updated: October 18, 2025
Version: 2.0.0
Status: MVP Development Phase
Recent Work: Auth restructuring, Settings redesign, Database consolidation

Need help? Check the troubleshooting sections above or reference the Supabase/Next.js docs! 🚀

---

## ✅ Summary of Updates

The PROJECT_CONTEXT.md file has been comprehensively updated with:

1. **✅ Auth Flow Restructuring**
   - Removed magic links
   - Documented new signup/login flow
   - Added auth callback and middleware sections

2. **✅ Database Schema Changes**
   - Consolidated `organisation_settings` into `organisations`
   - Removed `public.users` table
   - Updated all field mappings and constraints
   - Added indexes and RLS policies

3. **✅ Settings Page Redesign**
   - Documented new tabbed interface
   - Separated Organisation vs Profile settings
   - Added future enhancement plans

4. **✅ Architecture Decisions**
   - Explained why single-owner model
   - Rationale for removing magic links
   - Why organisation name is nullable
   - Why keep pay_frequency on both tables

5. **✅ Migration Guide**
   - Find/replace patterns for code updates
   - Field mapping table
   - Query changes

6. **✅ Troubleshooting**
   - Common errors and solutions
   - Debugging queries
   - Performance optimization tips

7. **✅ Complete Context**
   - Updated file structure
   - Current feature status
   - Recent updates summary
   - Testing checklists
   - Deployment checklist

The document is now a comprehensive reference for the entire project state! 🎉
```

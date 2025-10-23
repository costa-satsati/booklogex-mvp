# BookLogex - Project Context & Documentation

## 📋 Project Overview

**Name:** BookLogex  
**Description:** AI-Powered Bookkeeping & Payroll SaaS for Australian Small Businesses  
**Target Market:** Australian sole traders, small businesses (1-50 employees)  
**Status:** MVP Development Phase - Leave Tracking Implementation Complete ✅

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

---

## 📁 Project Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx              # Email/password + Google OAuth
│   ├── reset-password/
│   │   └── page.tsx              # Password reset flow
│   ├── update-password/
│   │   └── page.tsx              # Set new password
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # Auth callback (handles OAuth + creates profiles)
│   ├── setup/
│   │   └── page.tsx              # Fallback profile creation
│   ├── dashboard/
│   │   ├── page.tsx              # Main dashboard with analytics & leave alerts
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Desktop navigation
│   │   │   └── Topbar.tsx        # Header with mobile menu
│   │   ├── employees/
│   │   │   ├── page.tsx          # Employee list (PRODUCTION READY)
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx      # Employee detail with leave tracking (COMPLETE)
│   │   │   │   └── _components/
│   │   │   │       ├── LeaveBalanceCard.tsx       # Leave balance display
│   │   │   │       ├── LeaveHistoryTable.tsx      # Leave transaction history
│   │   │   │       └── LeaveAdjustmentModal.tsx   # Manual leave adjustments
│   │   │   └── new/page.tsx     # Add employee wizard (UPDATED)
│   │   ├── payroll/
│   │   │   ├── page.tsx          # Payroll runs list with delete
│   │   │   ├── new/page.tsx      # Setup wizard (FIXED HOOKS)
│   │   │   ├── [id]/page.tsx    # Edit payroll run with leave accrual
│   │   │   └── _components/      # Payroll sub-components
│   │   │       ├── SetupStep.tsx
│   │   │       ├── EmployeesStep.tsx
│   │   │       ├── ReviewStep.tsx         # Shows leave accruals
│   │   │       ├── CompleteStep.tsx       # Payslip downloads with YTD
│   │   │       └── PayrollSteps.tsx
│   │   ├── transactions/
│   │   │   └── page.tsx          # Income/expense tracking
│   │   ├── bas/
│   │   │   └── page.tsx          # BAS quarterly reports
│   │   └── settings/
│   │       └── page.tsx          # Organisation + Profile settings
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── TransactionModals.tsx     # Transaction CRUD modals
│   ├── ConfirmDeleteModal.tsx    # Delete confirmation (FIXED BACKGROUND)
│   ├── EditEmployeeModal.tsx     # Edit employee (FIXED BACKGROUND)
│   ├── OnboardingBanner.tsx      # Progressive onboarding
│   └── PayrollRunDetailsDrawer.tsx
├── lib/
│   ├── supabaseClient.ts         # Client-side Supabase
│   ├── supabaseServer.ts         # Server-side Supabase
│   ├── tax-calculator.ts         # Australian tax calculations
│   ├── payroll.ts                # Payroll utilities
│   ├── employee-utils.ts         # Employee validations & calculations
│   ├── payslip-generator.ts      # PDF payslip generation with leave balances
│   ├── ytd-calculator.ts         # Year-to-date earnings calculations
│   ├── leave-calculator.ts       # ✅ NEW: Leave entitlements & accruals
│   ├── leave-accrual.ts          # ✅ NEW: Auto-accrue leave on payroll
│   ├── leave-alerts.ts           # ✅ NEW: Leave balance warnings
│   └── notify.ts                 # Toast notification wrapper
├── types/
│   ├── employee.ts               # Employee types (UPDATED with leave fields)
│   ├── payroll.ts                # Payroll types
│   ├── organisation.ts           # Organisation types
│   └── transaction.ts            # Transaction types
├── context/
│   └── OrgContext.tsx            # Global organisation context (PRODUCTION READY)
└── middleware.ts                 # Auth middleware
```

---

## 🗄️ Database Schema

### Core Tables

#### **organisations** (Single source of truth)

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
- updated_at (timestamp, default: now())
```

**Indexes:**

- `idx_user_profiles_org_id` on `org_id`

---

#### **employees** (UPDATED - Production Ready with Leave Tracking)

```sql
- id (uuid, PK)
- org_id (uuid, FK to organisations) *required
- full_name (text) *required
- first_name (text, generated from full_name)
- last_name (text, generated from full_name)
- email (text)
- phone (text)
- address (text)
- date_of_birth (date)
- position (text)
- employment_type (full_time|part_time|casual|contractor)
- department (text)
- start_date (date)
- end_date (date)
- base_salary (numeric)                    # Stores hourly/daily/annual rate
- rate_type (text: hourly|daily|annual)    # Indicates what base_salary is
- hours_per_week (numeric, default: 38)    # Expected weekly hours
- hourly_rate (numeric, deprecated)        # Kept for backward compatibility
- pay_frequency (weekly|fortnightly|monthly)
- tfn (text) - Tax File Number
- tax_rate (numeric, default: 0.15)
- tax_free_threshold (boolean, default: true)
- help_debt (boolean, default: false)
- super_rate (numeric, default: 11.5)
- super_fund (text)
- super_member_number (text)
- bank_bsb (text)
- bank_account (text)

# ✅ NEW: Leave Balance Fields
- annual_leave_hours (numeric, default: 0)
- sick_leave_hours (numeric, default: 0)
- personal_leave_hours (numeric, default: 0)
- long_service_leave_hours (numeric, default: 0)
- leave_loading_rate (numeric, default: 17.5)

- active (boolean, default: true)
- notes (text)
- created_at (timestamp)
```

**Indexes:**

- `idx_employees_org_id` on `org_id`
- `idx_employees_active` on `active`

**Constraints:**

- `employees_rate_type_check` CHECK (rate_type IN ('hourly', 'daily', 'annual'))

---

#### **leave_transactions** ✅ NEW

```sql
- id (uuid, PK)
- employee_id (uuid, FK to employees) *required
- org_id (uuid, FK to organisations) *required
- transaction_type (accrual|taken|adjustment|payout|carryover) *required
- leave_type (annual|sick|personal|long_service) *required
- hours (numeric) *required                # Positive for accrual, negative for taken
- balance_after (numeric) *required        # Balance after this transaction
- payroll_run_id (uuid, FK to payroll_runs)
- reference (text)
- notes (text)
- created_by (uuid, FK to auth.users)
- created_at (timestamp) *required
```

**Indexes:**

- `idx_leave_transactions_employee_id` on `employee_id`
- `idx_leave_transactions_org_id` on `org_id`
- `idx_leave_transactions_created_at` on `created_at`
- `idx_leave_transactions_payroll_run_id` on `payroll_run_id`
- `idx_leave_transactions_type` on `transaction_type, leave_type`

**RLS Policies:**

- Users can view/insert/update/delete own org leave transactions

---

#### **leave_requests** ✅ NEW (Optional - for future workflow)

```sql
- id (uuid, PK)
- employee_id (uuid, FK to employees) *required
- org_id (uuid, FK to organisations) *required
- leave_type (annual|sick|personal|long_service|unpaid) *required
- start_date (date) *required
- end_date (date) *required
- hours_requested (numeric) *required
- status (pending|approved|rejected|cancelled) *required
- reason (text)
- notes (text)
- reviewed_by (uuid, FK to auth.users)
- reviewed_at (timestamp)
- leave_transaction_id (uuid, FK to leave_transactions)
- created_at (timestamp) *required
- updated_at (timestamp) *required
```

**Indexes:**

- `idx_leave_requests_employee_id` on `employee_id`
- `idx_leave_requests_org_id` on `org_id`
- `idx_leave_requests_status` on `status`
- `idx_leave_requests_dates` on `start_date, end_date`

**RLS Policies:**

- Users can view/insert/update/delete own org leave requests

---

#### **payroll_runs**

```sql
- id (uuid, PK)
- org_id (uuid, FK to organisations) *required
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

**Constraints:**

- `unique_org_period` UNIQUE (org_id, pay_period_start, pay_period_end)
- `unique_idempotency_key` UNIQUE (idempotency_key)
- `check_period_order` CHECK (pay_period_start < pay_period_end)
- `check_pay_date` CHECK (pay_date >= pay_period_end)

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
- org_id (uuid, FK to organisations) *required
- txn_date (date)
- description (text)
- amount (numeric) - excludes GST
- gst_amount (numeric)
- type (income|expense)
- category (text)
- payment_method (text)
- reference (text)
- notes (text)
- updated_at (timestamp)
- created_at (timestamp)
```

**Indexes:**

- `idx_transactions_org_id` on `org_id`
- `idx_transactions_txn_date` on `txn_date`
- `idx_transactions_type` on `type`
- `idx_transactions_category` on `category`
- `idx_transactions_payment_method` on `payment_method`

---

## 🔄 Auth & Signup Flow

### **Current Flow (Production Ready ✅):**

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

7. User completes onboarding via banner prompts

---

## 🎯 Context System (OrgContext)

### **Implementation:**

```typescript
// src/context/OrgContext.tsx
export function OrgProvider({ children }) {
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);

  // Loads organisation once at app level
  // Listens for updates via event listener
  // Provides refetch() method
}

// Usage in components:
import { useOrgContext } from '@/context/OrgContext';

const { organisation, loading, refetch } = useOrgContext();

// Access data:
const orgId = organisation?.id;
const businessName = organisation?.name;
```

**Benefits:**

- ✅ Single API call for organisation data
- ✅ Shared across all components
- ✅ Automatic updates propagate
- ✅ Performance optimization

**IMPORTANT:** Always use `organisation.id` for queries:

```typescript
// ✅ CORRECT
const { data } = await supabase.from('employees').select('*').eq('org_id', organisation.id);

// ❌ WRONG (missing org_id filter)
const { data } = await supabase.from('employees').select('*');
```

---

## 🍃 Leave Tracking System ✅ NEW

### **Australian Leave Entitlements:**

- **Annual Leave:** 4 weeks per year (152 hours for full-time)
- **Sick/Personal Leave:** 10 days per year (76 hours for full-time)
- **Long Service Leave:** 8.67 weeks after 10 years of service
- **Leave Loading:** 17.5% on annual leave payouts
- **Pro-rata:** Part-time employees receive pro-rated leave based on hours worked

### **Key Features:**

1. **Automatic Accrual**
   - Leave accrues automatically on every payroll run
   - Calculates based on pay frequency (weekly/fortnightly/monthly)
   - Pro-rata for part-time employees
   - No accrual for casual/contractor employees

2. **Leave Balance Tracking**
   - Real-time balance display on employee detail page
   - Shows hours and days
   - Visual progress indicators
   - Leave balance cards with color coding

3. **Leave History & Audit Trail**
   - All transactions logged in `leave_transactions` table
   - Shows accruals, adjustments, leave taken
   - Complete audit trail for compliance
   - Filterable and sortable history table

4. **Manual Adjustments**
   - Modal for adding/subtracting leave hours
   - Requires reason for audit purposes
   - Prevents negative balances
   - Records adjustment in transaction history

5. **Leave Alerts**
   - Dashboard warnings for low balances (<5 days)
   - Alerts for negative balances (error state)
   - Warnings for excessive accrual (>40 days)
   - Configurable alert thresholds

6. **Payslip Integration**
   - Leave balances automatically shown on payslips
   - Displays annual, sick, and personal leave
   - Shows in both hours and days
   - Only for eligible employees (not casual/contractor)

### **Leave Calculator Functions:**

```typescript
// src/lib/leave-calculator.ts
-calculateAnnualLeaveAccrual() - // Per pay period
  calculateSickLeaveAccrual() - // Per pay period
  calculateLongServiceLeave() - // After 10 years
  calculateYearsOfService() - // From start date
  hoursToDays() / daysToHours() - // Conversions
  formatLeaveBalance() - // Display formatting
  isEligibleForLeave(); // Eligibility checks
```

### **Leave Accrual Process:**

```typescript
// src/lib/leave-accrual.ts
1. Triggered on payroll finalization
2. Calculates accrual per employee based on:
   - Employment type (full-time/part-time)
   - Pay frequency (weekly/fortnightly/monthly)
   - Hours per week
3. Updates employee leave balances
4. Records transactions for audit trail
5. Returns success/failure status for each employee
```

---

## 🧮 Leave Calculation Reference

### **Standard Entitlements:**

```typescript
ANNUAL_LEAVE_FULL_TIME = 152 hours (4 weeks × 38 hours)
SICK_LEAVE_FULL_TIME = 76 hours (10 days × 7.6 hours)
LONG_SERVICE_LEAVE = 8.67 weeks (after 10 years)
LEAVE_LOADING = 17.5%
```

### **Accrual Per Pay Period:**

```typescript
// Weekly
annual_accrual = 152 / 52 = 2.92 hours per week
sick_accrual = 76 / 52 = 1.46 hours per week

// Fortnightly
annual_accrual = 152 / 26 = 5.85 hours per fortnight
sick_accrual = 76 / 26 = 2.92 hours per fortnight

// Monthly
annual_accrual = 152 / 12 = 12.67 hours per month
sick_accrual = 76 / 12 = 6.33 hours per month
```

### **Pro-rata for Part-time:**

```typescript
part_time_annual = (hours_per_week / 38) × 152
part_time_sick = (hours_per_week / 38) × 76

// Example: 20 hours per week
annual = (20 / 38) × 152 = 80 hours per year
sick = (20 / 38) × 76 = 40 hours per year
```

---

## ✅ Features Implemented

### Employee Module (PRODUCTION READY 🚀)

- ✅ **Complete CRUD Operations**
- ✅ **Simplified Rate Entry:** Single field for hourly/daily/annual rate
- ✅ **Automatic Calculations:** System calculates all derived rates
- ✅ **Hours Per Week Tracking:** Accurate pay calculations
- ✅ **TFN Validation:** Australian TFN with checksum verification
- ✅ **Phone Validation:** Australian mobile and landline validation
- ✅ **Auto-formatting:** TFN and phone auto-format on blur
- ✅ **4-Step Wizard:** Personal → Employment → Payment → Review
- ✅ **Pay Breakdown Display:** Shows hourly, daily, weekly, annual rates
- ✅ **Employee List:** Cards with search and filters
- ✅ **Employee Detail:** Comprehensive view with tabbed interface
- ✅ **Leave Tracking:** Balance cards, history table, adjustments
- ✅ **Edit Employee:** Modal with validation
- ✅ **Delete Employee:** Confirmation modal
- ✅ **Real-time Sync:** Auto-updates across pages

### Leave Tracking (PRODUCTION READY 🚀) ✅ NEW

- ✅ **Automatic Leave Accrual:** On every payroll run
- ✅ **Leave Balance Display:** Cards showing annual, sick, personal leave
- ✅ **Leave History Table:** Complete transaction audit trail
- ✅ **Manual Adjustments:** Modal for corrections with reason tracking
- ✅ **Leave Alerts:** Dashboard warnings for low/negative balances
- ✅ **Payslip Integration:** Leave balances on generated payslips
- ✅ **Eligibility Checks:** Different rules for full-time/part-time/casual/contractor
- ✅ **Pro-rata Calculations:** Accurate accruals for part-time employees
- ✅ **Hours & Days Conversion:** Display in both units
- ✅ **Australian Compliance:** Fair Work Act compliant calculations

### Payroll Module (PRODUCTION READY 🚀)

- ✅ **List all pay runs** with stats and delete functionality
- ✅ **Setup wizard** with smart date calculation
- ✅ **Overlap detection** prevents duplicate periods
- ✅ **Contractor handling:** Properly handles hourly contractors (no tax/super)
- ✅ **Employee selection** with validation
- ✅ **Review & validation** panel
- ✅ **Leave accrual integration:** Auto-accrues leave on finalization
- ✅ **Finalize pay run** with status tracking
- ✅ **Payslip generation:** Professional PDF with company branding
- ✅ **YTD calculations:** Real year-to-date earnings from database
- ✅ **Leave balances on payslips:** Automatic display for eligible employees
- ✅ **Bulk download:** All payslips or individual downloads
- ✅ **Status tracking:** draft → finalized → completed

### Dashboard (/)

- ✅ Summary cards (income, expenses, GST, profit)
- ✅ Action items (upcoming pay runs, BAS due)
- ✅ Quick stats (employees, PAYG, super)
- ✅ **Leave overview widget:** Top 5 employees with leave balances ✅ NEW
- ✅ **Leave alerts:** Dashboard warnings for low leave ✅ NEW
- ✅ Financial charts (bar chart, pie chart)
- ✅ Payroll summary section
- ✅ Quick action buttons
- ✅ Period filtering (month, quarter, FY, all time)
- ✅ **Fixed date range logic:** Proper month-end handling
- ✅ **Status filtering:** Only shows finalized payroll runs
- ✅ CSV/PDF export
- ✅ OnboardingBanner integration
- ✅ Handles new users without organisation

### Transactions (/dashboard/transactions)

- ✅ View transaction modal
- ✅ Edit transaction modal
- ✅ Delete transaction modal
- ✅ Enhanced add modal (category, payment method, reference, notes)
- ✅ Transaction list with table view
- ✅ Summary cards
- ✅ Search and filters
- ✅ CSV export
- ✅ Real-time sync

### BAS (/dashboard/bas)

- ✅ Quarterly GST summaries
- ✅ Summary cards
- ✅ Quarter selection
- ✅ Detailed quarter breakdown
- ✅ CSV/PDF export with org branding
- ✅ Real-time calculation from transactions

### Settings (/dashboard/settings)

- ✅ **Tabbed interface** - Organisation Settings + My Profile
- ✅ **Organisation Tab:** Business info, tax, payroll defaults, banking
- ✅ **Profile Tab:** Personal info, account security
- ✅ Validation (ABN, email)
- ✅ Unsaved changes warning
- ✅ Last updated timestamp
- ✅ Onboarding alert if business name is NULL
- ✅ Saves to `organisations` table

### Onboarding

- ✅ OnboardingBanner component
- ✅ Progressive disclosure (3 steps)
- ✅ Dismissible and non-intrusive
- ✅ Tracks completion status
- ✅ Auto-hides when complete

---

## 🛠 Recent Fixes (December 2024)

### **1. Leave Tracking Implementation** ✅ NEW

- Complete Australian leave entitlement system
- Automatic accrual on payroll finalization
- Leave balance tracking and display
- Manual adjustment capability
- Leave history and audit trail
- Dashboard leave alerts
- Payslip integration

### **2. YTD Calculations** ✅

- Real year-to-date calculations from database
- Australian financial year support (July 1 - June 30)
- Proper date filtering and aggregation
- Employee-specific YTD tracking
- Display on payslips

### **3. Payslip Generation** ✅

- Professional PDF generation with jsPDF
- Company branding (name, ABN, contact)
- Payment breakdown with tables
- YTD summaries (accurate calculations)
- Leave balances (for eligible employees)
- Contractor-specific handling (no tax/super)
- Banking details footer
- Confidentiality notice

### **4. Dashboard Date Range Fix** ✅

- Fixed "This Month" filtering logic
- Proper month-end date handling
- Date-only comparison (removes time component)
- Timezone-safe ISO string conversion
- Status filtering (only finalized payroll runs)

### **5. TypeScript Fixes** ✅

- Removed all `any` types
- Proper type assertions for events
- Type-safe leave type handling
- Employee property access with switch statements
- Null checks for payroll run

### **6. Employee Module Polish** ✅

- Simplified rate entry (single base_salary field)
- Added rate_type (hourly/daily/annual)
- Added hours_per_week for calculations
- TFN validation with checksum
- Phone validation (AU format)
- Auto-formatting for better UX
- Fixed modal backgrounds (gray instead of black)

### **7. React Hooks Error** ✅

- Fixed: "Hooks called in different order"
- Moved all hooks to top of component
- Conditional rendering after hooks
- Added proper loading states

### **8. RLS Policies** ✅

- Added INSERT policy for employees
- Complete CRUD policies on all tables
- Leave transactions RLS policies
- Leave requests RLS policies

### **9. Payroll Constraints** ✅

- Fixed: "duplicate key violates unique constraint"
- Changed to org-scoped uniqueness
- `unique_org_period` on (org_id, pay_period_start, pay_period_end)
- `unique_idempotency_key` for extra safety

### **10. Dashboard Loading** ✅

- Fixed: Infinite loading for new users
- Added proper org checks
- Set empty summary when no org
- Added setup prompt UI
- Fixed employees array initialization
- Proper leave alerts handling

### **11. Context Implementation** ✅

- Migrated from hook to context provider
- Single org query at app level
- Performance optimization
- Shared state across components

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
- **Special handling for contractors** (they manage own super)

### Leave Entitlements ✅ NEW

- **Annual Leave:** 4 weeks per year (152 hours full-time)
- **Sick/Personal Leave:** 10 days per year (76 hours full-time)
- **Long Service Leave:** 8.67 weeks after 10 years
- **Pro-rata:** Part-time employees get proportional leave
- **Leave Loading:** 17.5% on annual leave payouts
- **Automatic Accrual:** On every payroll run
- **Audit Trail:** Complete transaction history

### Contractor vs Employee Treatment

**Employees:**

- PAYG tax withheld
- Employer super contributions (11.5%)
- Leave entitlements (annual, sick, personal)
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

---

## 📜 Roadmap / Next Features

### High Priority

1. ~~Payslip PDF generation~~ ✅ **COMPLETE**
2. ~~Leave balance tracking~~ ✅ **COMPLETE**
3. **Email payslips** - Send to employees automatically (2-3 days)
4. **STP export/lodgement** - XML/CSV file or API integration (1-2 weeks)
5. **Super payment file** - ABA or SuperStream (1 week)
6. **Leave requests workflow** - Employee request, manager approve (1 week)
7. **Leave payout calculations** - When employee leaves (2-3 days)

### Medium Priority

8. **Document uploads** - Contracts, IDs, receipts
9. **Attachments/Receipts** - Upload invoices/receipts
10. **Better date range picker** - Calendar-based selection
11. **Audit log** - Track all changes
12. **Recurring transactions** - Auto-create monthly expenses
13. **Timesheets** - For hourly employees
14. **Bulk operations** - Select multiple items
15. **2FA Authentication** - Two-factor auth
16. **Notification preferences** - Email alerts

### Advanced Features

17. **Multi-user support** - Team members with roles
18. **Bank feeds** - Auto-import
    transactions
19. **Receipt OCR** - Scan and extract data
20. **Xero/MYOB sync** - Export to accounting software
21. **Super clearing house** - Auto-pay super
22. **STP Phase 2 lodgement** - Direct to ATO
23. **Mobile app** - React Native or PWA
24. **Leave carry-over** - End of financial year processing
25. **Leave forecasting** - Predict future liability

---

## 🔧 Debugging Tips

### Common Issues

1. **Organisation context empty:** Ensure OrgProvider wraps app in layout.tsx
2. **RLS blocking queries:** Check INSERT policies exist
3. **Hooks error:** All hooks must be at top, before any returns
4. **Duplicate payroll runs:** Check unique_org_period constraint
5. **Dashboard infinite loading:** Check orgLoading and organisation states
6. **Employee creation fails:** Verify RLS INSERT policy exists
7. **Leave not accruing:** Check payroll status is 'finalized'
8. **Dashboard shows zeros:** Check date range and status filter

### Useful Commands

```bash
# TypeScript check
npm run build

# Linting
npm run lint

# View Supabase logs (if using CLI)
supabase logs

# Reset local database (if using CLI)
supabase db reset
```

### Supabase Debugging Queries

```sql
-- Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Find users without profiles
SELECT au.id, au.email,
  CASE WHEN up.id IS NULL THEN '❌ Missing' ELSE '✅ Has profile' END
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id;

-- Check constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'payroll_runs'::regclass;

-- Check leave balances
SELECT
  e.full_name,
  e.employment_type,
  e.annual_leave_hours,
  e.sick_leave_hours,
  COUNT(lt.id) as transaction_count
FROM employees e
LEFT JOIN leave_transactions lt ON lt.employee_id = e.id
GROUP BY e.id, e.full_name, e.employment_type, e.annual_leave_hours, e.sick_leave_hours
ORDER BY e.full_name;

-- Check leave accruals for a payroll run
SELECT
  pr.id,
  pr.pay_period_start,
  pr.pay_period_end,
  pr.status,
  COUNT(DISTINCT lt.id) as leave_transactions,
  SUM(CASE WHEN lt.leave_type = 'annual' THEN lt.hours ELSE 0 END) as annual_accrued,
  SUM(CASE WHEN lt.leave_type = 'sick' THEN lt.hours ELSE 0 END) as sick_accrued
FROM payroll_runs pr
LEFT JOIN leave_transactions lt ON lt.payroll_run_id = pr.id
WHERE pr.org_id = 'your-org-id'
GROUP BY pr.id, pr.pay_period_start, pr.pay_period_end, pr.status
ORDER BY pr.created_at DESC;

-- Find organisations without names
SELECT o.id, o.owner_id, au.email
FROM organisations o
JOIN auth.users au ON au.id = o.owner_id
WHERE o.name IS NULL;

-- Check dashboard data for debugging
SELECT
  'Transactions' as table_name,
  COUNT(*) as count,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
FROM transactions
WHERE org_id = 'your-org-id'
UNION ALL
SELECT
  'Payroll Runs' as table_name,
  COUNT(*) as count,
  SUM(total_gross) as income,
  SUM(total_tax) as expenses
FROM payroll_runs
WHERE org_id = 'your-org-id' AND status IN ('finalized', 'completed');

-- Find employees with negative leave balances
SELECT
  full_name,
  employment_type,
  annual_leave_hours,
  sick_leave_hours,
  personal_leave_hours
FROM employees
WHERE (annual_leave_hours < 0 OR sick_leave_hours < 0 OR personal_leave_hours < 0)
  AND active = true
ORDER BY annual_leave_hours ASC;

-- Verify leave accrual calculations
SELECT
  e.full_name,
  e.employment_type,
  e.hours_per_week,
  e.pay_frequency,
  lt.transaction_type,
  lt.leave_type,
  lt.hours,
  lt.balance_after,
  lt.created_at
FROM employees e
JOIN leave_transactions lt ON lt.employee_id = e.id
WHERE e.org_id = 'your-org-id'
ORDER BY e.full_name, lt.created_at DESC
LIMIT 50;
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

## 🎓 Code Patterns

### Data Fetching with Context

```typescript
import { useOrgContext } from '@/context/OrgContext';

const { organisation, loading: orgLoading } = useOrgContext();

const loadData = async () => {
  if (!organisation?.id) return;

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('org_id', organisation.id) // ← Always filter by org_id
    .order('created_at', { ascending: false });

  // Handle data...
};

useEffect(() => {
  if (organisation?.id) {
    loadData();
  }
}, [organisation?.id]);
```

### Leave Accrual on Payroll Finalization

```typescript
import { accrueLeaveForPayrollRun } from '@/lib/leave-accrual';

const handleFinalize = async () => {
  if (!payrollRun) {
    notify.error('Error', 'Payroll run not found');
    return;
  }

  try {
    // 1. Accrue leave for all employees
    const leaveResults = await accrueLeaveForPayrollRun(payrollRun, allEmployees);

    const failedAccruals = leaveResults.filter((r) => !r.success);
    if (failedAccruals.length > 0) {
      notify.warning('Leave Accrual Warning', `${failedAccruals.length} failed`);
    }

    // 2. Finalize payroll
    const { error } = await supabase
      .from('payroll_runs')
      .update({ status: 'finalized', finalized_at: new Date().toISOString() })
      .eq('id', payrollRun.id);

    if (error) throw error;

    notify.success('Success', 'Pay run finalized with leave accruals');
  } catch (error) {
    notify.error('Error', 'Failed to finalize pay run');
  }
};
```

### Real-time Subscriptions

```typescript
useEffect(() => {
  loadData();

  const channel = supabase
    .channel('changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'employees',
      },
      () => {
        loadData();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### Modal Pattern with Fixed Background

```typescript
return (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Backdrop - GRAY not BLACK */}
    <div
      className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
      onClick={onClose}
    />

    {/* Modal */}
    <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
      {/* Content */}
    </div>
  </div>
);
```

### Type Safety

```typescript
import type { Employee, RateType, LeaveType } from '@/types/employee';

const [employee, setEmployee] = useState<Employee | null>(null);
const [leaveType, setLeaveType] = useState<LeaveType>('annual');

const updateRate = (rate: number, type: RateType) => {
  // TypeScript ensures type safety
};
```

### Leave Balance Calculations

```typescript
import {
  calculateAnnualLeaveAccrual,
  calculateSickLeaveAccrual,
  hoursToDays,
  formatLeaveBalance,
} from '@/lib/leave-calculator';

// Calculate accrual for this pay period
const annualAccrual = calculateAnnualLeaveAccrual(employee, 'fortnightly');
const sickAccrual = calculateSickLeaveAccrual(employee, 'fortnightly');

// Convert and format for display
const days = hoursToDays(employee.annual_leave_hours || 0, 7.6);
const formatted = formatLeaveBalance(employee.annual_leave_hours || 0);
// Returns: "152.0h (20.0 days)"
```

### Dashboard Date Range Handling

```typescript
const getDateRange = useCallback(() => {
  const now = new Date();
  let start: Date | null = null;
  let end: Date | null = null;

  switch (period) {
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
      break;
    case 'allTime':
      start = null;
      end = null;
      break;
  }
  return { start, end };
}, [period]);

// Use date-only strings for queries
if (start && end) {
  const startDate = start.toISOString().split('T')[0]; // "2025-11-01"
  const endDate = end.toISOString().split('T')[0]; // "2025-11-30"

  query = query.gte('pay_period_end', startDate).lte('pay_period_end', endDate);
}
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
- [Fair Work - Leave Entitlements](https://www.fairwork.gov.au/leave)
- [ATO - Single Touch Payroll](https://www.ato.gov.au/business/single-touch-payroll)

---

## 💡 Quick Start for New Chat

When starting a new conversation about BookLogex:

1. Upload this context file
2. Attach specific files you're working on (max 2-3)
3. Clearly state your task or question

**Example:**

```
I'm working on BookLogex (context attached).

Files: [leave-calculator.ts, page.tsx]

Task: Add leave payout calculation when employee is terminated.
```

---

## 🎉 Summary of Recent Session

**Date:** December 2024  
**Focus:** Leave Tracking Implementation  
**Status:** ✅ **PRODUCTION READY**

### **What We Implemented:**

1. ✅ **Database Schema Updates**
   - Added leave balance columns to employees table
   - Created leave_transactions table for audit trail
   - Created leave_requests table (optional, for future)
   - Added complete RLS policies

2. ✅ **Leave Calculation System**
   - Australian leave entitlement calculations
   - Pro-rata for part-time employees
   - Automatic accrual on payroll runs
   - Years of service calculations
   - Hours to days conversions

3. ✅ **Leave Accrual Integration**
   - Automatic accrual on payroll finalization
   - Per-employee accrual based on employment type
   - Transaction logging for audit trail
   - Error handling and reporting

4. ✅ **User Interface Components**
   - Leave balance cards (annual, sick, personal)
   - Leave history table with transactions
   - Leave adjustment modal for corrections
   - Leave tab on employee detail page
   - Leave overview widget on dashboard
   - Leave alerts for low/negative balances

5. ✅ **Payslip Integration**
   - Leave balances automatically shown
   - Hours and days format
   - Only for eligible employees
   - Professional formatting

6. ✅ **Bug Fixes**
   - Dashboard date range logic (month-end handling)
   - Status filtering for payroll runs
   - TypeScript `any` types removed
   - Employee array initialization
   - Null checks for payroll finalization
   - Modal background colors (gray not black)

### **Key Files Created/Modified:**

**New Files:**

- `src/lib/leave-calculator.ts` - Leave calculations and conversions
- `src/lib/leave-accrual.ts` - Automatic accrual logic
- `src/lib/leave-alerts.ts` - Alert generation for dashboard
- `src/lib/ytd-calculator.ts` - Year-to-date earnings
- `src/app/dashboard/employees/[id]/_components/LeaveBalanceCard.tsx`
- `src/app/dashboard/employees/[id]/_components/LeaveHistoryTable.tsx`
- `src/app/dashboard/employees/[id]/_components/LeaveAdjustmentModal.tsx`

**Modified Files:**

- `src/app/dashboard/employees/[id]/page.tsx` - Complete rewrite with tabs
- `src/app/dashboard/page.tsx` - Added leave overview and alerts
- `src/app/dashboard/payroll/[id]/page.tsx` - Leave accrual integration
- `src/app/dashboard/payroll/[id]/_components/ReviewStep.tsx` - Show accruals
- `src/app/dashboard/payroll/[id]/_components/CompleteStep.tsx` - YTD fix
- `src/lib/payslip-generator.ts` - Added leave balances section
- `src/types/employee.ts` - Added leave fields and types
- `src/components/EditEmployeeModal.tsx` - TypeScript fixes
- `src/components/LeaveAdjustmentModal.tsx` - TypeScript fixes

### **Testing Completed:**

✅ Leave accrual on payroll finalization  
✅ Leave balance display on employee page  
✅ Leave history tracking  
✅ Manual leave adjustments  
✅ Leave alerts on dashboard  
✅ Payslip generation with leave balances  
✅ Pro-rata calculations for part-time  
✅ Contractor exclusion (no leave)  
✅ YTD calculations (real from database)  
✅ Dashboard date filtering

### **What's Next:**

Priority items for production launch:

1. **Email Payslips** (2-3 days)
   - SMTP integration
   - Email templates
   - Batch sending

2. **STP Export** (1-2 weeks)
   - XML/CSV format
   - ATO schema compliance
   - Manual lodgement instructions

3. **Super Payment File** (1 week)
   - ABA format generation
   - SuperStream integration
   - Payment instructions

4. **Leave Request Workflow** (1 week)
   - Employee portal
   - Manager approval
   - Auto-deduction on approval

5. **Testing & Polish** (1 week)
   - End-to-end testing
   - Mobile responsiveness
   - Error handling
   - User documentation

---

## 🚀 Launch Readiness

### **✅ Ready for Production:**

- ✅ Employee management (CRUD operations)
- ✅ Payroll processing (with leave accrual)
- ✅ Leave tracking (balances, history, adjustments)
- ✅ Payslip generation (with leave balances)
- ✅ Tax calculations (PAYG, super)
- ✅ BAS reporting (GST summaries)
- ✅ Transaction management
- ✅ Dashboard analytics
- ✅ Organisation settings
- ✅ User authentication
- ✅ RLS security
- ✅ Real-time updates

### **⚠️ Required for Launch:**

- ⚠️ Email payslips
- ⚠️ STP export/lodgement
- ⚠️ Super payment file
- ⚠️ Comprehensive testing
- ⚠️ User documentation

### **🔜 Post-Launch Enhancements:**

- Leave request workflow
- Document uploads
- Bank feeds
- Timesheets
- Multi-user support
- Mobile app

---

**Last Updated:** October 2025
**Version:** 2.2.0  
**Status:** Leave Tracking Complete, Ready for Launch Preparation

**The leave tracking system is now fully implemented and production-ready!** 🎊 The app now handles Australian leave entitlements, automatic accrual, balance tracking, and compliance requirements. Next steps are email payslips and STP integration for full production launch.

---

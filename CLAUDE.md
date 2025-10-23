# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookLogex is an AI-powered bookkeeping and payroll application for Australian and New Zealand businesses. Built with Next.js 15, it handles financial transactions, employee management, payroll processing, leave entitlements, and BAS reporting.

## Development Commands

### Essential Commands
- `pnpm install` - Install dependencies
- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production bundle with Turbopack
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Environment Setup
- Copy `.env.local` and configure:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Resend API key for email notifications

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS 4
- **UI Components**: shadcn/ui with Radix UI primitives
- **Database**: Supabase/PostgreSQL
- **Auth**: Supabase Auth with SSR
- **Forms**: React Hook Form + Zod validation
- **State**: React Context (OrgContext), TanStack Query
- **Email**: Resend API
- **PDF Generation**: jsPDF + jspdf-autotable for payslips

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Main authenticated app
│   │   ├── transactions/   # Income/expense tracking
│   │   ├── employees/      # Employee management & leave
│   │   ├── payroll/        # Payroll runs (wizard flow)
│   │   ├── bas/            # BAS reporting
│   │   └── settings/       # Organisation settings
│   ├── api/email/          # Email API routes (Resend)
│   ├── login/              # Auth pages
│   └── onboarding/         # Organisation setup
├── components/             # Shared UI components
│   └── ui/                 # shadcn/ui components
├── lib/                    # Business logic & utilities
│   ├── supabaseServer.ts   # Server-side Supabase client (SSR)
│   ├── supabaseClient.ts   # Client-side Supabase client
│   ├── tax-calculator.ts   # Australian PAYG tax (2024-25)
│   ├── leave-calculator.ts # Leave accrual calculations
│   ├── leave-accrual.ts    # Automatic leave accrual logic
│   ├── payslip-generator.ts# PDF payslip generation
│   ├── ytd-calculator.ts   # Year-to-date totals
│   └── email/              # Email templates
├── types/                  # TypeScript type definitions
│   ├── employee.ts         # Employee, LeaveTransaction, LeaveRequest
│   ├── payroll.ts          # PayrollRun, PayrollItem
│   ├── organisation.ts     # Organisation settings
│   └── transaction.ts      # Financial transactions
├── context/
│   └── OrgContext.tsx      # Organisation state provider
└── middleware.ts           # Auth & redirect middleware
```

### Key Patterns

#### Authentication Flow
- Middleware (`src/middleware.ts`) handles auth redirects:
  - Unauthenticated users → `/login`
  - Authenticated users from `/login` or `/` → `/dashboard`
- Uses Supabase SSR for server-side auth (`createClient()` from `lib/supabaseServer.ts`)
- Client-side auth via `supabase` from `lib/supabaseClient.ts`

#### Organisation Context
- All dashboard pages access current org via `useOrgContext()` hook
- Provides: `{ organisation, loading, refetch }`
- Automatically reloads on `'org-settings-updated'` window event
- Organisation linked to users via `user_profiles.org_id`

#### Supabase Client Usage
- **Server Components/API Routes**: Use `await createClient()` from `lib/supabaseServer.ts`
- **Client Components**: Use `supabase` from `lib/supabaseClient.ts`
- Server client handles cookie-based auth with SSR support

#### Database Schema
Core tables (see `supabase/migrations/`):
- `organisations` - Business entity (ABN, GST settings, defaults)
- `user_profiles` - Links users to organisations
- `employees` - Employee records with tax, super, leave balances
- `payroll_runs` - Payroll period records (draft → finalized)
- `payroll_items` - Individual employee pay records per run
- `leave_transactions` - Leave accrual/taken/adjustment history
- `leave_requests` - Leave request workflow
- `transactions` - Income/expense records for bookkeeping

### Australian Compliance

#### Payroll & Tax (2024-25 FY)
- **Tax Calculation**: `lib/tax-calculator.ts` implements ATO PAYG withholding
  - Supports weekly, fortnightly, monthly frequencies
  - Tax-free threshold option
  - Medicare levy (2%)
  - Superannuation Guarantee: 11.5%
- **Leave Entitlements**: `lib/leave-calculator.ts`
  - Annual leave: 152 hours/year (full-time), pro-rata for part-time
  - Sick/personal leave: 76 hours/year
  - Long service leave: 8.67 weeks after 10 years
  - Leave loading: 17.5% (configurable)
- **Automatic Accruals**: Leave accrues automatically when payroll finalized
- **YTD Tracking**: `lib/ytd-calculator.ts` for PAYG summaries

#### GST & BAS
- Organisation settings: `gst_registered`, `gst_cycle` (monthly/quarterly/annual)
- Transaction-level GST tracking (`gst_amount` field)
- Financial year starts configurable (`financial_year_start_month`)

### Payroll Wizard Flow
Located in `src/app/dashboard/payroll/[id]/`:
1. **SetupStep**: Configure pay period, frequency, pay date
2. **EmployeesStep**: Select employees, enter hours/amounts
3. **ReviewStep**: Preview calculations (gross, tax, super, net)
4. **CompleteStep**: Finalize run, generate payslips, send emails

- Uses `PayrollSteps` component to manage wizard state
- Calculations done via `lib/tax-calculator.ts`
- Payslips generated via `lib/payslip-generator.ts` (jsPDF)
- Emails sent via `/api/email/send-batch` and `/api/email/send-payslip`

### Leave Management
Located in `src/app/dashboard/employees/[id]/`:
- **LeaveBalanceCard**: Display current balances
- **LeaveHistoryTable**: Transaction history
- **LeaveAdjustmentModal**: Manual adjustments
- Accruals calculated per pay period and recorded in `leave_transactions`
- Alert system (`lib/leave-alerts.ts`) for low/negative balances

## Important Notes

### Path Aliases
- Use `@/` prefix for all imports (maps to `./src/*`)
- Example: `import { supabase } from '@/lib/supabaseClient'`

### Type Safety
- All database entities have TypeScript interfaces in `src/types/`
- Strict mode enabled (`tsconfig.json`)
- Zod schemas for form validation

### Multi-Tenancy
- All database operations must filter by `org_id`
- Organisation context provided by `OrgProvider` in dashboard layout
- Row-level security policies enforce org isolation in Supabase

### Email System
- Uses Resend API for transactional emails
- Templates in `src/lib/email/`
- Payslip emails include PDF attachment
- Batch sending supported for payroll runs

### Employment Types
- `full_time`: Accrues all leave, standard calculations
- `part_time`: Pro-rata leave accruals based on `hours_per_week`
- `casual`: No leave accruals, may have loading rates
- `contractor`: No tax withholding, no super, no leave

### Rate Types
- `hourly`: Calculate gross from `hourly_rate × hours`
- `daily`: Daily rate calculation
- `annual`: Divide `base_salary` by pay frequency periods

## Common Workflows

### Adding a New Employee
1. Create record in `employees` table with `org_id`
2. Set employment type, tax settings, super details
3. Initialize leave balances (or set to 0 for new accrual)
4. If full-time/part-time, leave will accrue automatically on payroll runs

### Running Payroll
1. Create `payroll_runs` record with status `'draft'`
2. Add `payroll_items` for each employee
3. Calculate tax via `calculatePayroll()` from `lib/tax-calculator.ts`
4. Generate payslips via `generatePayslip()` from `lib/payslip-generator.ts`
5. Update status to `'finalized'` → triggers leave accrual
6. Send payslip emails via API routes

### Managing Leave
- Accruals: Automatic on payroll finalization (see `lib/leave-accrual.ts`)
- Taking leave: Create `leave_requests` → approve → deduct from balance
- Adjustments: Use `LeaveAdjustmentModal` to manually adjust balances
- All changes recorded in `leave_transactions` for audit trail

## Database Migrations

- Supabase migrations in `supabase/migrations/`
- Schema managed via Supabase CLI
- Test migrations locally before pushing to production

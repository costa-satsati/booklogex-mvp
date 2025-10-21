// src/lib/payslip-generator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency } from './tax-calculator';
import type { PayrollRun, PayrollItem } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import type { Organisation } from '@/types/organisation';
import { supabase } from './supabaseClient';
import type { YTDTotals } from './ytd-calculator';
import { hoursToDays } from './leave-calculator';

interface PayslipData {
  payrollRun: PayrollRun;
  payrollItem: PayrollItem;
  employee: Employee;
  OrgContext: Organisation;
  ytdTotals?: YTDTotals; // Optional YTD data
}

export class PayslipGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private margin = 20;
  private yPos = 20;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.width;
  }

  generate(data: PayslipData): jsPDF {
    this.addHeader(data.OrgContext);
    this.addEmployeeInfo(data.employee, data.payrollRun);
    this.addPaymentSummary(data.payrollItem);
    this.addDeductionsBreakdown(data.payrollItem);
    this.addLeaveBalances(data.employee);
    this.addYTDSummary(data.payrollItem, data.ytdTotals);
    this.addFooter(data.OrgContext);

    return this.doc;
  }

  private addHeader(org: Organisation) {
    // Company name with fallback
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    const businessName = org.name || 'Business Name';
    this.doc.text(businessName, this.margin, this.yPos);

    // ABN with fallback
    this.yPos += 8;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const abn = org.abn || 'ABN not provided';
    this.doc.text(`ABN: ${abn}`, this.margin, this.yPos);

    // Contact details
    if (org.contact_email || org.contact_phone) {
      this.yPos += 5;
      const contact = [org.contact_email, org.contact_phone].filter(Boolean).join(' • ');
      if (contact) {
        this.doc.text(contact, this.margin, this.yPos);
      }
    }

    // PAYSLIP title
    this.yPos = 20;
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    const title = 'PAYSLIP';
    const titleWidth = this.doc.getTextWidth(title);
    this.doc.text(title, this.pageWidth - this.margin - titleWidth, this.yPos);

    // Horizontal line
    this.yPos += 10;
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.yPos, this.pageWidth - this.margin, this.yPos);

    this.yPos += 10;
  }

  private addEmployeeInfo(employee: Employee, payrollRun: PayrollRun) {
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    const leftCol = this.margin;
    const rightCol = this.pageWidth / 2 + 10;

    // Employee details (left column)
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Employee', leftCol, this.yPos);
    this.doc.setFont('helvetica', 'normal');

    this.yPos += 6;
    this.doc.text(employee.full_name, leftCol, this.yPos);

    this.yPos += 5;
    if (employee.position) {
      this.doc.text(employee.position, leftCol, this.yPos);
      this.yPos += 5;
    }

    if (employee.email) {
      this.doc.text(employee.email, leftCol, this.yPos);
      this.yPos += 5;
    }

    // Reset yPos for right column
    this.yPos -= (employee.position ? 11 : 6) + (employee.email ? 5 : 0);

    // Pay period details (right column)
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Pay Period', rightCol, this.yPos);
    this.doc.setFont('helvetica', 'normal');

    this.yPos += 6;
    const periodText =
      payrollRun.pay_period_start && payrollRun.pay_period_end
        ? `${format(new Date(payrollRun.pay_period_start), 'd MMM yyyy')} - ${format(new Date(payrollRun.pay_period_end), 'd MMM yyyy')}`
        : 'Not specified';
    this.doc.text(periodText, rightCol, this.yPos);

    this.yPos += 5;
    this.doc.text(
      `Pay Date: ${payrollRun.pay_date ? format(new Date(payrollRun.pay_date), 'd MMMM yyyy') : 'Not specified'}`,
      rightCol,
      this.yPos
    );

    this.yPos += 5;
    this.doc.text(`Frequency: ${payrollRun.frequency || 'Not specified'}`, rightCol, this.yPos);

    this.yPos += 10;
  }

  private addPaymentSummary(item: PayrollItem) {
    // Payment summary box
    const boxY = this.yPos;
    const boxHeight = 40;

    // Background
    this.doc.setFillColor(59, 130, 246); // Blue
    this.doc.rect(this.margin, boxY, this.pageWidth - 2 * this.margin, boxHeight, 'F');

    // White text
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');

    this.yPos = boxY + 10;
    this.doc.text('GROSS PAY', this.margin + 5, this.yPos);

    this.yPos += 8;
    this.doc.setFontSize(20);
    this.doc.text(formatCurrency(item.gross), this.margin + 5, this.yPos);

    // Net pay on right
    this.yPos = boxY + 10;
    this.doc.setFontSize(12);
    const netLabel = 'NET PAY';
    const netLabelWidth = this.doc.getTextWidth(netLabel);
    this.doc.text(netLabel, this.pageWidth - this.margin - netLabelWidth - 5, this.yPos);

    this.yPos += 8;
    this.doc.setFontSize(20);
    const netAmount = formatCurrency(item.net);
    const netAmountWidth = this.doc.getTextWidth(netAmount);
    this.doc.text(netAmount, this.pageWidth - this.margin - netAmountWidth - 5, this.yPos);

    // Reset text color
    this.doc.setTextColor(0, 0, 0);
    this.yPos = boxY + boxHeight + 10;
  }

  private addDeductionsBreakdown(item: PayrollItem) {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Payment Breakdown', this.margin, this.yPos);

    this.yPos += 5;

    // Table data
    const tableData = [
      ['Gross Earnings', formatCurrency(item.gross)],
      ['PAYG Tax Withheld', `-${formatCurrency(item.tax)}`],
      ['Employer Superannuation', formatCurrency(item.super)],
    ];

    // Calculate if contractor (no tax/super)
    const isContractor = item.tax === 0 && item.super === 0;

    if (isContractor) {
      tableData[1] = ['PAYG Tax Withheld', '$0.00 (Contractor)'];
      tableData[2] = ['Employer Superannuation', '$0.00 (Contractor)'];
    }

    autoTable(this.doc, {
      startY: this.yPos,
      head: [],
      body: tableData,
      foot: [['Net Pay', formatCurrency(item.net)]],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: {
        fillColor: [16, 185, 129],
        fontStyle: 'bold',
        fontSize: 11,
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { fontStyle: 'normal' },
        1: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: this.margin, right: this.margin },
    });

    // Get the final Y position after the table
    const autoTableDoc = this.doc as unknown as { lastAutoTable?: { finalY: number } };
    this.yPos = (autoTableDoc.lastAutoTable?.finalY || this.yPos) + 15;

    // Add contractor note if applicable
    if (isContractor) {
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(107, 114, 128); // Gray
      const note =
        '* As a contractor, you are responsible for your own tax and superannuation contributions.';
      this.doc.text(note, this.margin, this.yPos);
      this.doc.setTextColor(0, 0, 0);
      this.yPos += 10;
    }
  }

  private addLeaveBalances(employee: Employee) {
    // Only show for employees eligible for leave
    if (!['full_time', 'part_time'].includes(employee.employment_type)) {
      return;
    }

    this.yPos += 5;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Leave Balances', this.margin, this.yPos);

    this.yPos += 5;

    const hoursPerDay = employee.hours_per_week ? employee.hours_per_week / 5 : 7.6;

    const leaveData: [string, string][] = [];

    if (employee.annual_leave_hours !== undefined) {
      const days = hoursToDays(employee.annual_leave_hours, hoursPerDay);
      leaveData.push([
        'Annual Leave',
        `${employee.annual_leave_hours.toFixed(1)}h (${days.toFixed(1)} days)`,
      ]);
    }

    if (employee.sick_leave_hours !== undefined) {
      const days = hoursToDays(employee.sick_leave_hours, hoursPerDay);
      leaveData.push([
        'Sick/Personal Leave',
        `${employee.sick_leave_hours.toFixed(1)}h (${days.toFixed(1)} days)`,
      ]);
    }

    if (employee.long_service_leave_hours && employee.long_service_leave_hours > 0) {
      const days = hoursToDays(employee.long_service_leave_hours, hoursPerDay);
      leaveData.push([
        'Long Service Leave',
        `${employee.long_service_leave_hours.toFixed(1)}h (${days.toFixed(1)} days)`,
      ]);
    }

    if (leaveData.length === 0) {
      return; // No leave to show
    }

    autoTable(this.doc, {
      startY: this.yPos,
      head: [],
      body: leaveData,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'normal', textColor: [107, 114, 128] },
        1: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: this.margin, right: this.margin },
    });

    // Get the final Y position after the table
    const autoTableDoc = this.doc as unknown as { lastAutoTable?: { finalY: number } };
    this.yPos = (autoTableDoc.lastAutoTable?.finalY || this.yPos) + 10;

    // Add note about leave accrual
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setTextColor(107, 114, 128);
    this.doc.text(
      'Leave balances shown are as at the end of this pay period.',
      this.margin,
      this.yPos
    );
    this.doc.setTextColor(0, 0, 0);
    this.yPos += 10;
  }

  private addYTDSummary(item: PayrollItem, ytdTotals?: YTDTotals) {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Year to Date Summary', this.margin, this.yPos);

    this.yPos += 5;

    // Use real YTD data if provided, otherwise use current item * 10 as fallback
    const ytdGross = ytdTotals?.gross ?? item.gross * 10;
    const ytdTax = ytdTotals?.tax ?? item.tax * 10;
    const ytdSuper = ytdTotals?.super ?? item.super * 10;

    // FIXED: Renamed to avoid conflict and properly typed
    const ytdTableData: [string, string][] = [
      ['Gross Earnings YTD', formatCurrency(ytdGross)],
      ['PAYG Tax YTD', formatCurrency(ytdTax)],
      ['Superannuation YTD', formatCurrency(ytdSuper)],
    ];

    autoTable(this.doc, {
      startY: this.yPos,
      head: [],
      body: ytdTableData, // Now properly typed as [string, string][]
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'normal', textColor: [107, 114, 128] },
        1: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: this.margin, right: this.margin },
    });

    // Get the final Y position after the table
    const autoTableDoc = this.doc as unknown as { lastAutoTable?: { finalY: number } };
    this.yPos = (autoTableDoc.lastAutoTable?.finalY || this.yPos) + 10;

    // Add note if using estimated data
    if (!ytdTotals) {
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(107, 114, 128);
      this.doc.text(
        '* YTD figures are estimates. Contact payroll for exact values.',
        this.margin,
        this.yPos
      );
      this.doc.setTextColor(0, 0, 0);
      this.yPos += 10;
    }
  }

  private addFooter(org: Organisation) {
    const pageHeight = this.doc.internal.pageSize.height;
    const footerY = pageHeight - 30;

    // Banking details if available
    if (org.bank_bsb && org.bank_account) {
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(107, 114, 128);

      this.doc.text(
        `Banking: BSB ${org.bank_bsb} • Account ${org.bank_account}${org.bank_account_name ? ` • ${org.bank_account_name}` : ''}`,
        this.margin,
        footerY
      );
    }

    // Business address
    if (org.business_address) {
      this.doc.text(org.business_address, this.margin, footerY + 5);
    }

    // Confidentiality notice
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    const notice = 'This document is private and confidential. Please keep it secure.';
    const noticeWidth = this.doc.getTextWidth(notice);
    this.doc.text(notice, (this.pageWidth - noticeWidth) / 2, footerY + 12);

    // Generated timestamp
    const timestamp = `Generated: ${format(new Date(), 'd MMM yyyy h:mm a')}`;
    const timestampWidth = this.doc.getTextWidth(timestamp);
    this.doc.text(timestamp, this.pageWidth - this.margin - timestampWidth, footerY + 12);

    this.doc.setTextColor(0, 0, 0);
  }

  download(filename: string) {
    this.doc.save(filename);
  }

  getBlob(): Blob {
    return this.doc.output('blob');
  }

  getBase64(): string {
    return this.doc.output('dataurlstring');
  }
}

// Helper function to generate a single payslip
export async function generatePayslip(data: PayslipData): Promise<jsPDF> {
  const generator = new PayslipGenerator();
  return generator.generate(data);
}

// Helper function to generate multiple payslips (one PDF per employee)
export async function generatePayslipsForRun(
  payrollRun: PayrollRun,
  payrollItems: PayrollItem[],
  OrgContext: Organisation,
  ytdTotalsMap?: Map<string, YTDTotals> // Optional YTD data for all employees
): Promise<Map<string, jsPDF>> {
  const payslips = new Map<string, jsPDF>();

  for (const item of payrollItems) {
    if (!item.employees) continue;

    const employee = item.employees as Employee;
    const ytdTotals = ytdTotalsMap?.get(employee.id);

    const generator = new PayslipGenerator();
    const pdf = generator.generate({
      payrollRun,
      payrollItem: item,
      employee,
      OrgContext,
      ytdTotals, // Pass YTD data if available
    });

    const filename = `payslip_${employee.full_name.replace(/\s+/g, '_')}_${format(new Date(payrollRun.pay_date || new Date()), 'yyyy-MM-dd')}.pdf`;
    payslips.set(filename, pdf);
  }

  return payslips;
}

export async function downloadAllPayslips(
  payrollRun: PayrollRun,
  payrollItems: PayrollItem[],
  OrgContext: Organisation
): Promise<void> {
  const payslips = await generatePayslipsForRun(payrollRun, payrollItems, OrgContext);

  payslips.forEach((pdf, filename) => {
    pdf.save(filename);
  });
}

export async function downloadEmployeePayslip(
  payrollRun: PayrollRun,
  payrollItem: PayrollItem,
  employee: Employee,
  OrgContext: Organisation,
  ytdTotals?: YTDTotals // Optional YTD data
): Promise<void> {
  const generator = new PayslipGenerator();
  const pdf = generator.generate({
    payrollRun,
    payrollItem,
    employee,
    OrgContext,
    ytdTotals, // Pass YTD data
  });

  const filename = `payslip_${employee.full_name.replace(/\s+/g, '_')}_${format(new Date(payrollRun.pay_date || new Date()), 'yyyy-MM-dd')}.pdf`;
  pdf.save(filename);
}

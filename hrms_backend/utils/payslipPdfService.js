import PDFDocument from 'pdfkit';
import { pool } from '../config/db.js';
import { SystemSetting } from '../models/SystemSetting.js';

/**
 * Generate PDF payslip for an employee
 * @param {Object} payslip - Payslip data from database
 * @param {Object} employee - Employee/user data
 * @param {Object} payrollRun - Payroll run data
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generatePayslipPDF(payslip, employee, payrollRun) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                size: 'A4',
                margin: 50,
                bufferPages: true
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            // Get company name from settings
            const companyName = 'WorkZen Pvt. Ltd.'; // Default, can be fetched from settings

            // Header
            doc.fontSize(20).font('Helvetica-Bold')
                .text(companyName, { align: 'center' });
            
            doc.moveDown(0.5);
            doc.fontSize(14).font('Helvetica-Bold')
                .text(`Employee Payslip – ${getMonthName(payrollRun.month)} ${payrollRun.year}`, { align: 'center' });
            
            doc.moveDown(1);
            doc.fontSize(10).font('Helvetica')
                .text('─'.repeat(60), { align: 'center' });

            // Employee Information
            doc.moveDown(1);
            doc.fontSize(10).font('Helvetica')
                .text(`Employee: ${employee.first_name} ${employee.last_name}`, { continued: true })
                .text(`ID: ${employee.employee_id}`, { align: 'right' });
            
            doc.moveDown(0.3);
            const department = employee.department_name || 'N/A';
            const designation = employee.designation || 'N/A';
            doc.text(`Department: ${department}`, { continued: true })
                .text(`Designation: ${designation}`, { align: 'right' });
            
            doc.moveDown(0.3);
            const startDate = `01-${getMonthName(payrollRun.month)}-${payrollRun.year}`;
            const endDate = `${new Date(payrollRun.year, payrollRun.month, 0).getDate()}-${getMonthName(payrollRun.month)}-${payrollRun.year}`;
            doc.text(`Pay Period: ${startDate} to ${endDate}`);

            doc.moveDown(1);
            doc.fontSize(10).font('Helvetica')
                .text('─'.repeat(60), { align: 'center' });

            // Earnings and Deductions Section
            doc.moveDown(0.5);
            const leftX = 50;
            const rightX = 300;
            const lineHeight = 15;

            // Headers
            doc.fontSize(10).font('Helvetica-Bold')
                .text('EARNINGS:', leftX, doc.y)
                .text('DEDUCTIONS:', rightX, doc.y);

            doc.moveDown(1);
            doc.fontSize(9).font('Helvetica');

            // Earnings
            let earningsY = doc.y;
            let currentY = earningsY;

            // Basic Salary
            doc.text('Basic Salary', leftX, currentY = doc.y, { width: 200 })
                .text(formatCurrency(payslip.basic_salary), { align: 'right' });
            
            currentY = doc.y;
            // HRA
            if (payslip.hra > 0) {
                doc.text(`HRA (${calculatePercentage(payslip.hra, payslip.basic_salary)}%)`, leftX, currentY, { width: 200 })
                    .text(formatCurrency(payslip.hra), { align: 'right' });
                currentY += lineHeight;
            }

            // Transport Allowance
            if (payslip.transport_allowance > 0) {
                doc.text('Transport Allowance', leftX, currentY, { width: 200 })
                    .text(formatCurrency(payslip.transport_allowance), { align: 'right' });
                currentY += lineHeight;
            }

            // Medical Allowance
            if (payslip.medical_allowance > 0) {
                doc.text('Medical Allowance', leftX, currentY, { width: 200 })
                    .text(formatCurrency(payslip.medical_allowance), { align: 'right' });
                currentY += lineHeight;
            }

            // Other Allowances (split into Performance Bonus, LTA, etc. if needed)
            if (payslip.other_allowances > 0) {
                doc.text('Other Allowances', leftX, currentY, { width: 200 })
                    .text(formatCurrency(payslip.other_allowances), { align: 'right' });
                currentY += lineHeight;
            }

            // Deductions
            let deductionsY = earningsY;
            currentY = deductionsY;

            // PF Employee
            if (payslip.pf_employee > 0) {
                const pfPercentage = calculatePercentage(payslip.pf_employee, payslip.basic_salary);
                doc.text(`Provident Fund (${pfPercentage}%)`, rightX, currentY, { width: 200 })
                    .text(formatCurrency(payslip.pf_employee), { align: 'right' });
                currentY += lineHeight;
            }

            // Professional Tax
            if (payslip.professional_tax > 0) {
                doc.text('Professional Tax', rightX, currentY, { width: 200 })
                    .text(formatCurrency(payslip.professional_tax), { align: 'right' });
                currentY += lineHeight;
            }

            // Other Deductions
            if (payslip.other_deductions > 0) {
                doc.text('Other Deductions', rightX, currentY, { width: 200 })
                    .text(formatCurrency(payslip.other_deductions), { align: 'right' });
                currentY += lineHeight;
            }

            // Move to the maximum Y position
            doc.y = Math.max(earningsY + (lineHeight * 6), deductionsY + (lineHeight * 4));

            doc.moveDown(1);
            doc.fontSize(10).font('Helvetica')
                .text('─'.repeat(60), { align: 'center' });

            // Summary Section
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');

            // Gross Salary (full amount before adjustment)
            const fullGrossSalary = payslip.basic_salary + payslip.hra + payslip.transport_allowance + 
                                   payslip.medical_allowance + payslip.other_allowances;
            doc.text('GROSS SALARY:', { continued: true })
                .font('Helvetica-Bold')
                .text(formatCurrency(fullGrossSalary), { align: 'right' });

            // Attendance Adjustment
            const daysInMonth = payslip.working_days || new Date(payrollRun.year, payrollRun.month, 0).getDate();
            const unpaidDays = payslip.absent_days;
            
            if (unpaidDays > 0) {
                const dailyRate = fullGrossSalary / daysInMonth;
                const attendanceAdjustment = -(dailyRate * unpaidDays);
                doc.moveDown(0.3);
                doc.font('Helvetica')
                    .text(`ATTENDANCE ADJUSTMENT:`, { continued: true })
                    .text(`${formatCurrency(attendanceAdjustment)} (${unpaidDays} unpaid days)`, { align: 'right' });
            }

            // Total Deductions
            doc.moveDown(0.3);
            doc.font('Helvetica')
                .text('TOTAL DEDUCTIONS:', { continued: true })
                .font('Helvetica-Bold')
                .text(formatCurrency(payslip.total_deductions), { align: 'right' });

            doc.moveDown(1);
            doc.fontSize(10).font('Helvetica')
                .text('─'.repeat(60), { align: 'center' });

            // Net Salary
            doc.moveDown(0.5);
            doc.fontSize(12).font('Helvetica-Bold')
                .text('NET SALARY (IN HAND):', { continued: true })
                .text(formatCurrency(payslip.net_salary), { align: 'right' });

            doc.moveDown(1);
            doc.fontSize(10).font('Helvetica')
                .text('─'.repeat(60), { align: 'center' });

            // Attendance Summary
            doc.moveDown(1);
            doc.fontSize(10).font('Helvetica-Bold')
                .text('Attendance Summary:');
            
            doc.moveDown(0.5);
            doc.fontSize(9).font('Helvetica')
                .text(`Total Working Days: ${daysInMonth}`)
                .text(`Present: ${payslip.present_days} | Paid Leave: ${payslip.leave_days} | Absent: ${payslip.absent_days}`);

            // Payroll Status
            doc.moveDown(1);
            doc.fontSize(9).font('Helvetica')
                .text(`Payroll Status: ${payrollRun.status === 'paid' ? 'Paid' : payrollRun.status === 'completed' ? 'Processed' : 'Pending'}`);

            if (payrollRun.processed_by_name) {
                doc.text(`Processed By: ${payrollRun.processed_by_name}`);
            }
            
            if (payrollRun.processed_at) {
                const processedDate = new Date(payrollRun.processed_at);
                doc.text(`Processed On: ${formatDate(processedDate)}`);
            }

            doc.moveDown(1);
            doc.fontSize(10).font('Helvetica')
                .text('─'.repeat(60), { align: 'center' });

            // Footer
            doc.moveDown(2);
            doc.fontSize(8).font('Helvetica')
                .text('This is a system generated payslip.', { align: 'center' })
                .text('For any discrepancies, please contact the HR department.', { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Format currency to Indian Rupee format
 */
function formatCurrency(amount) {
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get month name from month number
 */
function getMonthName(month) {
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1] || 'Unknown';
}

/**
 * Calculate percentage
 */
function calculatePercentage(part, whole) {
    if (whole === 0) return 0;
    return Math.round((part / whole) * 100);
}

/**
 * Format date to DD-MMM-YYYY
 */
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = getMonthName(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}


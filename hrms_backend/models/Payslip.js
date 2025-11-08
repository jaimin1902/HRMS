import { pool } from '../config/db.js';

export class Payslip {
    static async findAll(filters = {}) {
        let query = `
            SELECT p.*,
                   u.employee_id,
                   u.first_name || ' ' || u.last_name as employee_name,
                   pr.month,
                   pr.year,
                   pr.status as payroll_status
            FROM payslips p
            JOIN users u ON p.user_id = u.id
            JOIN payroll_runs pr ON p.payroll_run_id = pr.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (filters.payroll_run_id) {
            query += ` AND p.payroll_run_id = $${paramCount++}`;
            params.push(filters.payroll_run_id);
        }
        if (filters.user_id) {
            query += ` AND p.user_id = $${paramCount++}`;
            params.push(filters.user_id);
        }
        if (filters.month) {
            query += ` AND pr.month = $${paramCount++}`;
            params.push(filters.month);
        }
        if (filters.year) {
            query += ` AND pr.year = $${paramCount++}`;
            params.push(filters.year);
        }

        query += ' ORDER BY pr.year DESC, pr.month DESC, u.employee_id';
        const result = await pool.query(query, params);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(`
            SELECT p.*,
                   u.employee_id,
                   u.first_name || ' ' || u.last_name as employee_name,
                   pr.month,
                   pr.year,
                   pr.status as payroll_status
            FROM payslips p
            JOIN users u ON p.user_id = u.id
            JOIN payroll_runs pr ON p.payroll_run_id = pr.id
            WHERE p.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async findByUserAndMonth(user_id, month, year) {
        const result = await pool.query(`
            SELECT p.*,
                   pr.month,
                   pr.year
            FROM payslips p
            JOIN payroll_runs pr ON p.payroll_run_id = pr.id
            WHERE p.user_id = $1 AND pr.month = $2 AND pr.year = $3
        `, [user_id, month, year]);
        return result.rows[0];
    }

    static async create(data) {
        const {
            payroll_run_id, user_id, basic_salary, hra,
            transport_allowance, medical_allowance, other_allowances,
            gross_salary, pf_employee, pf_employer, professional_tax,
            other_deductions, total_deductions, net_salary,
            working_days, present_days, leave_days, absent_days
        } = data;

        const result = await pool.query(
            `INSERT INTO payslips (
                payroll_run_id, user_id, basic_salary, hra,
                transport_allowance, medical_allowance, other_allowances,
                gross_salary, pf_employee, pf_employer, professional_tax,
                other_deductions, total_deductions, net_salary,
                working_days, present_days, leave_days, absent_days
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
            [
                payroll_run_id, user_id, basic_salary, hra || 0,
                transport_allowance || 0, medical_allowance || 0, other_allowances || 0,
                gross_salary, pf_employee || 0, pf_employer || 0, professional_tax || 0,
                other_deductions || 0, total_deductions || 0, net_salary,
                working_days || 0, present_days || 0, leave_days || 0, absent_days || 0
            ]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = [
            'basic_salary', 'hra', 'transport_allowance', 'medical_allowance',
            'other_allowances', 'gross_salary', 'pf_employee', 'pf_employer',
            'professional_tax', 'other_deductions', 'total_deductions', 'net_salary',
            'working_days', 'present_days', 'leave_days', 'absent_days', 'status'
        ];

        for (const [key, value] of Object.entries(data)) {
            if (allowedFields.includes(key) && value !== undefined) {
                fields.push(`${key} = $${paramCount++}`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            return await this.findById(id);
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE payslips SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM payslips WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}



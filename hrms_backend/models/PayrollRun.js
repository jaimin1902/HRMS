import { pool } from '../config/db.js';

export class PayrollRun {
    static async findAll(filters = {}) {
        let query = `
            SELECT pr.*,
                   u.first_name || ' ' || u.last_name as processed_by_name
            FROM payroll_runs pr
            LEFT JOIN users u ON pr.processed_by = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (filters.month) {
            query += ` AND pr.month = $${paramCount++}`;
            params.push(filters.month);
        }
        if (filters.year) {
            query += ` AND pr.year = $${paramCount++}`;
            params.push(filters.year);
        }
        if (filters.status) {
            query += ` AND pr.status = $${paramCount++}`;
            params.push(filters.status);
        }

        query += ' ORDER BY pr.year DESC, pr.month DESC';
        const result = await pool.query(query, params);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(`
            SELECT pr.*,
                   u.first_name || ' ' || u.last_name as processed_by_name
            FROM payroll_runs pr
            LEFT JOIN users u ON pr.processed_by = u.id
            WHERE pr.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async findByMonthYear(month, year) {
        const result = await pool.query(
            'SELECT * FROM payroll_runs WHERE month = $1 AND year = $2',
            [month, year]
        );
        return result.rows[0];
    }

    static async create(data) {
        const { month, year, status, processed_by, notes } = data;

        const result = await pool.query(
            `INSERT INTO payroll_runs (month, year, status, processed_by, notes)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [month, year, status || 'draft', processed_by, notes]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = [
            'status', 'processed_by', 'processed_at',
            'total_employees', 'total_amount', 'notes'
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
            `UPDATE payroll_runs SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM payroll_runs WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}



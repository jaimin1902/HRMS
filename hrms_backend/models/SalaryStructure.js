import { pool } from '../config/db.js';

export class SalaryStructure {
    static async findByUserId(user_id) {
        const result = await pool.query(`
            SELECT ss.*, 
                   u.employee_id,
                   u.first_name || ' ' || u.last_name as employee_name
            FROM salary_structure ss
            JOIN users u ON ss.user_id = u.id
            WHERE ss.user_id = $1 AND ss.is_active = TRUE
            ORDER BY ss.effective_from DESC
        `, [user_id]);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(`
            SELECT ss.*, 
                   u.employee_id,
                   u.first_name || ' ' || u.last_name as employee_name
            FROM salary_structure ss
            JOIN users u ON ss.user_id = u.id
            WHERE ss.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async findActiveByUserId(user_id) {
        const result = await pool.query(`
            SELECT ss.*
            FROM salary_structure ss
            WHERE ss.user_id = $1 AND ss.is_active = TRUE
            ORDER BY ss.effective_from DESC
            LIMIT 1
        `, [user_id]);
        return result.rows[0];
    }

    static async create(data) {
        const {
            user_id, basic_salary, hra, transport_allowance,
            medical_allowance, other_allowances, pf_percentage,
            professional_tax, other_deductions, effective_from, effective_to
        } = data;

        // Deactivate previous salary structures
        await pool.query(
            'UPDATE salary_structure SET is_active = FALSE WHERE user_id = $1',
            [user_id]
        );

        const result = await pool.query(
            `INSERT INTO salary_structure (
                user_id, basic_salary, hra, transport_allowance,
                medical_allowance, other_allowances, pf_percentage,
                professional_tax, other_deductions, effective_from, effective_to
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                user_id, basic_salary, hra || 0, transport_allowance || 0,
                medical_allowance || 0, other_allowances || 0, pf_percentage || 12,
                professional_tax || 0, other_deductions || 0, effective_from, effective_to
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
            'other_allowances', 'pf_percentage', 'professional_tax',
            'other_deductions', 'effective_from', 'effective_to', 'is_active'
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
            `UPDATE salary_structure SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM salary_structure WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}



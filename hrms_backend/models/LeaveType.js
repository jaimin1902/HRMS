import { pool } from '../config/db.js';

export class LeaveType {
    static async findAll() {
        const result = await pool.query('SELECT * FROM leave_types WHERE is_active = TRUE ORDER BY id');
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM leave_types WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async findByCode(code) {
        const result = await pool.query('SELECT * FROM leave_types WHERE code = $1', [code]);
        return result.rows[0];
    }

    static async create(data) {
        const {
            name, code, description, max_days,
            is_paid, requires_approval, carry_forward
        } = data;

        const result = await pool.query(
            `INSERT INTO leave_types (
                name, code, description, max_days,
                is_paid, requires_approval, carry_forward
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, code, description, max_days, is_paid ?? true, requires_approval ?? true, carry_forward ?? false]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = [
            'name', 'code', 'description', 'max_days',
            'is_paid', 'requires_approval', 'carry_forward', 'is_active'
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
            `UPDATE leave_types SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('UPDATE leave_types SET is_active = FALSE WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}



import { pool } from '../config/db.js';

export class SalaryComponentTemplate {
    static async findAll(filters = {}) {
        let query = `
            SELECT * FROM salary_component_templates
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (filters.is_active !== undefined) {
            query += ` AND is_active = $${paramCount++}`;
            params.push(filters.is_active);
        }

        query += ' ORDER BY display_order ASC, id ASC';
        const result = await pool.query(query, params);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(
            'SELECT * FROM salary_component_templates WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    static async create(data) {
        const {
            name, computation_type, base, percentage, fixed_amount,
            description, display_order, is_active, is_required
        } = data;

        const result = await pool.query(
            `INSERT INTO salary_component_templates (
                name, computation_type, base, percentage, fixed_amount,
                description, display_order, is_active, is_required
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                name, computation_type, base, percentage || null, fixed_amount || null,
                description || null, display_order || 0, is_active !== undefined ? is_active : true,
                is_required !== undefined ? is_required : false
            ]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = [
            'name', 'computation_type', 'base', 'percentage', 'fixed_amount',
            'description', 'display_order', 'is_active', 'is_required'
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
            `UPDATE salary_component_templates SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query(
            'DELETE FROM salary_component_templates WHERE id = $1 RETURNING *',
            [id]
        );
        return result.rows[0];
    }

    static async reorder(ids) {
        // Update display_order for multiple components
        const updates = ids.map((id, index) => 
            pool.query('UPDATE salary_component_templates SET display_order = $1 WHERE id = $2', [index + 1, id])
        );
        await Promise.all(updates);
        return await this.findAll({ is_active: true });
    }
}



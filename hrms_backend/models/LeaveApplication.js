import { pool } from '../config/db.js';

export class LeaveApplication {
    static async findAll(filters = {}) {
        let query = `
            SELECT la.*,
                   u.employee_id,
                   u.first_name || ' ' || u.last_name as employee_name,
                   lt.name as leave_type_name,
                   lt.code as leave_type_code,
                   approver.first_name || ' ' || approver.last_name as approver_name
            FROM leave_applications la
            JOIN users u ON la.user_id = u.id
            JOIN leave_types lt ON la.leave_type_id = lt.id
            LEFT JOIN users approver ON la.approved_by = approver.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (filters.user_id) {
            query += ` AND la.user_id = $${paramCount++}`;
            params.push(filters.user_id);
        }
        if (filters.status) {
            query += ` AND la.status = $${paramCount++}`;
            params.push(filters.status);
        }
        if (filters.leave_type_id) {
            query += ` AND la.leave_type_id = $${paramCount++}`;
            params.push(filters.leave_type_id);
        }
        if (filters.start_date) {
            query += ` AND la.start_date >= $${paramCount++}`;
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            query += ` AND la.end_date <= $${paramCount++}`;
            params.push(filters.end_date);
        }

        query += ' ORDER BY la.applied_at DESC';
        const result = await pool.query(query, params);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(`
            SELECT la.*,
                   u.employee_id,
                   u.first_name || ' ' || u.last_name as employee_name,
                   lt.name as leave_type_name,
                   lt.code as leave_type_code,
                   approver.first_name || ' ' || approver.last_name as approver_name
            FROM leave_applications la
            JOIN users u ON la.user_id = u.id
            JOIN leave_types lt ON la.leave_type_id = lt.id
            LEFT JOIN users approver ON la.approved_by = approver.id
            WHERE la.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async create(data) {
        const {
            user_id, leave_type_id, start_date, end_date,
            total_days, reason
        } = data;

        const result = await pool.query(
            `INSERT INTO leave_applications (
                user_id, leave_type_id, start_date, end_date,
                total_days, reason
            ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [user_id, leave_type_id, start_date, end_date, total_days, reason]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = [
            'leave_type_id', 'start_date', 'end_date',
            'total_days', 'reason', 'status', 'approved_by',
            'approved_at', 'rejection_reason'
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
            `UPDATE leave_applications SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async approve(id, approved_by, rejection_reason = null) {
        const result = await pool.query(
            `UPDATE leave_applications 
             SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, rejection_reason = $3
             WHERE id = $4 RETURNING *`,
            ['approved', approved_by, rejection_reason, id]
        );
        return result.rows[0];
    }

    static async reject(id, approved_by, rejection_reason) {
        const result = await pool.query(
            `UPDATE leave_applications 
             SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, rejection_reason = $3
             WHERE id = $4 RETURNING *`,
            ['rejected', approved_by, rejection_reason, id]
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM leave_applications WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}



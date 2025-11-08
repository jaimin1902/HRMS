import { pool } from '../config/db.js';

export class AuditLog {
    static async findAll(filters = {}) {
        let query = `
            SELECT al.*,
                   u.employee_id,
                   u.first_name || ' ' || u.last_name as user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (filters.user_id) {
            query += ` AND al.user_id = $${paramCount++}`;
            params.push(filters.user_id);
        }
        if (filters.entity_type) {
            query += ` AND al.entity_type = $${paramCount++}`;
            params.push(filters.entity_type);
        }
        if (filters.entity_id) {
            query += ` AND al.entity_id = $${paramCount++}`;
            params.push(filters.entity_id);
        }
        if (filters.action) {
            query += ` AND al.action = $${paramCount++}`;
            params.push(filters.action);
        }
        if (filters.start_date) {
            query += ` AND al.created_at >= $${paramCount++}`;
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            query += ` AND al.created_at <= $${paramCount++}`;
            params.push(filters.end_date);
        }

        query += ' ORDER BY al.created_at DESC LIMIT 1000';
        const result = await pool.query(query, params);
        return result.rows;
    }

    static async create(data) {
        const {
            user_id, action, entity_type, entity_id,
            old_values, new_values, ip_address, user_agent
        } = data;

        const result = await pool.query(
            `INSERT INTO audit_logs (
                user_id, action, entity_type, entity_id,
                old_values, new_values, ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                user_id, action, entity_type, entity_id,
                old_values ? JSON.stringify(old_values) : null,
                new_values ? JSON.stringify(new_values) : null,
                ip_address, user_agent
            ]
        );
        return result.rows[0];
    }
}



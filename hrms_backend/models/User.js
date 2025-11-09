import { pool } from '../config/db.js';

export class User {
    static async findAll(filters = {}) {
        let query = `
            SELECT u.*, 
                   r.name as role_name,
                   d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (filters.role_id) {
            query += ` AND u.role_id = $${paramCount++}`;
            params.push(filters.role_id);
        }
        if (filters.department_id) {
            query += ` AND u.department_id = $${paramCount++}`;
            params.push(filters.department_id);
        }
        if (filters.is_active !== undefined) {
            query += ` AND u.is_active = $${paramCount++}`;
            params.push(filters.is_active);
        }

        query += ' ORDER BY u.id';
        const result = await pool.query(query, params);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(`
            SELECT u.*, 
                   r.name as role_name,
                   d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await pool.query(`
            SELECT u.*, 
                   r.name as role_name,
                   d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.email = $1
        `, [email]);
        return result.rows[0];
    }

    static async findByEmployeeId(employee_id) {
        const result = await pool.query(`
            SELECT u.*, 
                   r.name as role_name,
                   d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.employee_id = $1
        `, [employee_id]);
        return result.rows[0];
    }

    static async create(data) {
        const {
            employee_id, email, password_hash, first_name, last_name,
            phone, date_of_birth, address, role_id, department_id,
            designation, joining_date, profile_picture
        } = data;
        console.log("🚀 ~ User ~ create ~ data:", data)

        const result = await pool.query(
            `INSERT INTO users (
                employee_id, email, password_hash, first_name, last_name,
                phone, date_of_birth, address, role_id, department_id,
                designation, joining_date, profile_picture
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [
                employee_id, email, password_hash, first_name, last_name,
                phone, date_of_birth, address, role_id, department_id,
                designation, joining_date, profile_picture
            ]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = [
            'email', 'password_hash', 'first_name', 'last_name', 'phone',
            'date_of_birth', 'address', 'role_id', 'department_id',
            'designation', 'is_active', 'profile_picture'
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
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}



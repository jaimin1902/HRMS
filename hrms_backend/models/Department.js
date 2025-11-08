import { pool } from '../config/db.js';

export class Department {
    static async findAll() {
        const result = await pool.query(`
            SELECT d.*, 
                   u.id as head_user_id,
                   u.first_name || ' ' || u.last_name as head_name
            FROM departments d
            LEFT JOIN users u ON d.head_id = u.id
            ORDER BY d.id
        `);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(`
            SELECT d.*, 
                   u.id as head_user_id,
                   u.first_name || ' ' || u.last_name as head_name
            FROM departments d
            LEFT JOIN users u ON d.head_id = u.id
            WHERE d.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async create(data) {
        const { name, description, head_id } = data;
        const result = await pool.query(
            'INSERT INTO departments (name, description, head_id) VALUES ($1, $2, $3) RETURNING *',
            [name, description, head_id]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const { name, description, head_id } = data;
        const result = await pool.query(
            'UPDATE departments SET name = COALESCE($1, name), description = COALESCE($2, description), head_id = COALESCE($3, head_id) WHERE id = $4 RETURNING *',
            [name, description, head_id, id]
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}



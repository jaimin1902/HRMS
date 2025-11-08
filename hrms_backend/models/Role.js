import { pool } from '../config/db.js';

export class Role {
    static async findAll() {
        const result = await pool.query('SELECT * FROM roles ORDER BY id');
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async findByName(name) {
        const result = await pool.query('SELECT * FROM roles WHERE name = $1', [name]);
        return result.rows[0];
    }

    static async create(data) {
        const { name, description, permissions } = data;
        const result = await pool.query(
            'INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) RETURNING *',
            [name, description, JSON.stringify(permissions || {})]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const { name, description, permissions } = data;
        const result = await pool.query(
            'UPDATE roles SET name = COALESCE($1, name), description = COALESCE($2, description), permissions = COALESCE($3, permissions) WHERE id = $4 RETURNING *',
            [name, description, permissions ? JSON.stringify(permissions) : null, id]
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM roles WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}



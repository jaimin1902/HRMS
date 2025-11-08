import { pool } from '../config/db.js';

export class SystemSetting {
    static async findAll() {
        const result = await pool.query('SELECT * FROM system_settings ORDER BY key');
        return result.rows;
    }

    static async findByKey(key) {
        const result = await pool.query('SELECT * FROM system_settings WHERE key = $1', [key]);
        return result.rows[0];
    }

    static async create(data) {
        const { key, value, data_type, description, updated_by } = data;

        const result = await pool.query(
            `INSERT INTO system_settings (key, value, data_type, description, updated_by)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [key, value, data_type || 'string', description, updated_by]
        );
        return result.rows[0];
    }

    static async update(key, data) {
        const { value, description, updated_by } = data;

        const result = await pool.query(
            `UPDATE system_settings 
             SET value = COALESCE($1, value), 
                 description = COALESCE($2, description),
                 updated_by = COALESCE($3, updated_by),
                 updated_at = CURRENT_TIMESTAMP
             WHERE key = $4 RETURNING *`,
            [value, description, updated_by, key]
        );
        return result.rows[0];
    }

    static async delete(key) {
        const result = await pool.query('DELETE FROM system_settings WHERE key = $1 RETURNING *', [key]);
        return result.rows[0];
    }

    static async getValue(key, defaultValue = null) {
        const setting = await this.findByKey(key);
        if (!setting) return defaultValue;

        switch (setting.data_type) {
            case 'number':
                return parseFloat(setting.value) || defaultValue;
            case 'boolean':
                return setting.value === 'true' || setting.value === '1';
            case 'json':
                try {
                    return JSON.parse(setting.value);
                } catch {
                    return defaultValue;
                }
            default:
                return setting.value || defaultValue;
        }
    }
}



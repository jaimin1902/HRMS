import { pool } from '../config/db.js';

export class Attendance {
    static async findAll(filters = {}) {
        let query = `
            SELECT a.*,
                   u.employee_id,
                   u.first_name || ' ' || u.last_name as employee_name
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (filters.user_id) {
            query += ` AND a.user_id = $${paramCount++}`;
            params.push(filters.user_id);
        }
        if (filters.date) {
            query += ` AND a.date = $${paramCount++}`;
            params.push(filters.date);
        }
        if (filters.start_date) {
            query += ` AND a.date >= $${paramCount++}`;
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            query += ` AND a.date <= $${paramCount++}`;
            params.push(filters.end_date);
        }
        if (filters.status) {
            query += ` AND a.status = $${paramCount++}`;
            params.push(filters.status);
        }

        query += ' ORDER BY a.date DESC, a.user_id';
        const result = await pool.query(query, params);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(`
            SELECT a.*,
                   u.employee_id,
                   u.first_name || ' ' || u.last_name as employee_name
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            WHERE a.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async findByUserAndDate(user_id, date) {
        const result = await pool.query(
            'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
            [user_id, date]
        );
        return result.rows[0];
    }

    static async create(data) {
        const {
            user_id, date, check_in_time, check_out_time,
            working_hours, status, leave_application_id, notes
        } = data;

        const result = await pool.query(
            `INSERT INTO attendance (
                user_id, date, check_in_time, check_out_time,
                working_hours, status, leave_application_id, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [user_id, date, check_in_time, check_out_time, working_hours || 0, status || 'absent', leave_application_id, notes]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = [
            'check_in_time', 'check_out_time', 'working_hours',
            'status', 'leave_application_id', 'notes'
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
            `UPDATE attendance SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async markAttendance(user_id, date, check_in_time, status = 'present') {
        // When checking in, working hours should be 0 (will be calculated on check-out)
        const working_hours = 0;

        const result = await pool.query(
            `INSERT INTO attendance (user_id, date, check_in_time, status, working_hours)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, date)
             DO UPDATE SET check_in_time = $3, status = $4, working_hours = $5, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [user_id, date, check_in_time, status, working_hours]
        );
        return result.rows[0];
    }

    static async checkOut(user_id, date, check_out_time) {
        const attendance = await this.findByUserAndDate(user_id, date);
        if (!attendance || !attendance.check_in_time) {
            throw new Error('No check-in found for this date');
        }

        const checkIn = new Date(attendance.check_in_time);
        const checkOut = new Date(check_out_time);
        const working_hours = (checkOut - checkIn) / (1000 * 60 * 60);

        // Determine status based on working hours
        // >= 8 hours: present, >= 4 hours: half-day, < 4 hours: absent
        let status = attendance.status; // Keep existing status if it's leave/holiday/weekend
        if (attendance.status === 'absent' || attendance.status === 'present' || attendance.status === 'half-day') {
            if (working_hours >= 8) {
                status = 'present';
            } else if (working_hours >= 4) {
                status = 'half-day';
            } else {
                status = 'absent';
            }
        }

        const result = await pool.query(
            `UPDATE attendance 
             SET check_out_time = $1, working_hours = $2, status = $3, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $4 AND date = $5 RETURNING *`,
            [check_out_time, working_hours, status, user_id, date]
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM attendance WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}



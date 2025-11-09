import { pool } from '../config/db.js';

/**
 * Gets the first N characters from a string, uppercase
 * @param {string} str - Input string
 * @param {number} n - Number of characters to extract
 * @returns {string} - Uppercase characters
 */
const getInitials = (str, n = 2) => {
    if (!str || typeof str !== 'string') return '';
    return str.trim().substring(0, n).toUpperCase().padEnd(n, 'X');
};

/**
 * Gets the next serial number for a given year
 * @param {number} year - Joining year
 * @returns {Promise<number>} - Next serial number
 */
const getNextSerialNumber = async (year) => {
    try {
        // Find all employee IDs that contain the year
        // Format: PREFIX(2) + FIRST2(2) + LAST2(2) + YEAR(4) + SERIAL(4) = 14 chars minimum
        // Example: OIJODO20220001
        const yearStr = year.toString();
        const result = await pool.query(`
            SELECT employee_id 
            FROM users 
            WHERE employee_id LIKE $1
            AND LENGTH(employee_id) >= 14
            ORDER BY employee_id DESC 
        `, [`%${yearStr}%`]);

        if (result.rows.length === 0) {
            return 1; // First employee of the year
        }

        // Find the maximum serial number for this year
        // The last 4 digits are always the serial number
        // The year should be in positions -8 to -5 (from the end)
        let maxSerial = 0;
        for (const row of result.rows) {
            const employeeId = row.employee_id;
            
            // Check if the year appears in the expected position (8 chars from the end)
            const yearInId = employeeId.slice(-8, -4);
            
            if (yearInId === yearStr) {
                // Extract the last 4 digits (serial number)
                const serialPart = employeeId.slice(-4);
                const serialNumber = parseInt(serialPart, 10);
                
                if (!isNaN(serialNumber) && serialNumber > maxSerial) {
                    maxSerial = serialNumber;
                }
            }
        }

        return maxSerial + 1;
    } catch (error) {
        console.error('Error getting next serial number:', error);
        return 1; // Default to 1 if query fails
    }
};

/**
 * Generates employee ID in format: PREFIX + FIRST2 + LAST2 + YEAR + SERIAL
 * Example: OIJODO20220001
 * @param {string} companyPrefix - Company prefix (e.g., "OI" for Odoo India)
 * @param {string} firstName - Employee first name
 * @param {string} lastName - Employee last name
 * @param {string|Date} joiningDate - Joining date
 * @returns {Promise<string>} - Generated employee ID
 */
export const generateEmployeeId = async (companyPrefix, firstName, lastName, joiningDate) => {
    try {
        // Get company prefix (first 2 letters, uppercase)
        const prefix = getInitials(companyPrefix || 'OI', 2);
        
        // Get first 2 letters of first name
        const firstInitials = getInitials(firstName, 2);
        
        // Get first 2 letters of last name
        const lastInitials = getInitials(lastName, 2);
        
        // Get year from joining date
        let year;
        if (joiningDate instanceof Date) {
            year = joiningDate.getFullYear();
        } else if (typeof joiningDate === 'string') {
            const date = new Date(joiningDate);
            year = date.getFullYear();
        } else {
            year = new Date().getFullYear();
        }

        // Get next serial number for this year
        const serialNumber = await getNextSerialNumber(year);
        
        // Format: PREFIX + FIRST2 + LAST2 + YEAR + SERIAL (4 digits)
        const employeeId = `${prefix}${firstInitials}${lastInitials}${year}${serialNumber.toString().padStart(4, '0')}`;
        
        return employeeId;
    } catch (error) {
        console.error('Error generating employee ID:', error);
        throw new Error('Failed to generate employee ID');
    }
};


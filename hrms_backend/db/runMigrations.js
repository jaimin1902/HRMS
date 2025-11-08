import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
    try {
        console.log('🔄 Running database migrations...');
        
        const schemaPath = join(__dirname, 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf8');
        
        await pool.query(schema);
        
        console.log('✅ Database schema created successfully!');
        console.log('✅ All tables, indexes, views, and triggers are set up.');
        console.log('✅ Default roles and leave types have been seeded.');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();



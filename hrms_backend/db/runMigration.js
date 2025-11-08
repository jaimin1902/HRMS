import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration(migrationFile) {
    try {
        console.log(`🔄 Running migration: ${migrationFile}...`);
        
        const migrationPath = join(__dirname, 'migrations', migrationFile);
        const migrationSQL = readFileSync(migrationPath, 'utf8');
        
        await pool.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error('❌ Please provide a migration file name');
    console.log('Usage: node db/runMigration.js <migration-file.sql>');
    process.exit(1);
}

runMigration(migrationFile);



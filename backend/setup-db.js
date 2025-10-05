const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function setupDatabase() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'cooperative_gathering'
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected successfully!');

        // Read and execute schema file
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Executing database schema...');
        await client.query(schema);
        console.log('Database schema created successfully!');
        
        console.log('✅ Database setup completed!');
        console.log('Default credentials:');
        console.log('  Admin: admin / admin123');
        console.log('  Staff: staff / staff123');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Troubleshooting tips:');
            console.log('1. Make sure PostgreSQL is installed and running');
            console.log('2. Check your database credentials in .env file');
            console.log('3. Try starting PostgreSQL service: net start postgresql');
        } else if (error.code === '3D000') {
            console.log('\n💡 Database does not exist. Please create it first:');
            console.log('   CREATE DATABASE cooperative_gathering;');
        }
    } finally {
        await client.end();
    }
}

setupDatabase();

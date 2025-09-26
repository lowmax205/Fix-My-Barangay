#!/usr/bin/env node

/**
 * Database Migration Script for Fix My Barangay
 * 
 * This script runs database migrations against the Neon database
 * using the connection string from .env.local
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the root .env.local file
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

console.log('🚀 Starting database migration...');
console.log('📍 Environment file:', envPath);

// Database configuration using Neon connection
const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ NEON_DATABASE_URL or POSTGRES_URL environment variable is required');
  process.exit(1);
}

console.log('🔗 Connecting to database:', DATABASE_URL.substring(0, 30) + '...');

const dbConfig = {
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Neon
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(dbConfig);

// Function to read and execute SQL file
async function runMigration(filePath, description) {
  try {
    console.log(`\n📄 Running migration: ${description}`);
    console.log(`   File: ${path.basename(filePath)}`);
    
    const sql = fs.readFileSync(filePath, 'utf8');
    const client = await pool.connect();
    
    try {
      await client.query(sql);
      console.log(`✅ Migration completed: ${description}`);
    } catch (error) {
      console.error(`❌ Migration failed: ${description}`);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration error:', error.message);
    throw error;
  }
}

// Function to execute a direct SQL command
async function runSQL(sql, description) {
  try {
    console.log(`\n🔧 Executing: ${description}`);
    
    const client = await pool.connect();
    
    try {
      await client.query(sql);
      console.log(`✅ Completed: ${description}`);
    } catch (error) {
      console.error(`❌ Failed: ${description}`);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('SQL execution error:', error.message);
    throw error;
  }
}

// Function to test database connection
async function testConnection() {
  try {
    console.log('\n🔍 Testing database connection...');
    const client = await pool.connect();
    
    const result = await client.query('SELECT version(), current_database()');
    console.log('✅ Database connection successful');
    console.log('   PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    console.log('   Database name:', result.rows[0].current_database);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Function to verify migration results
async function verifyMigration() {
  try {
    console.log('\n🔍 Verifying migration results...');
    const client = await pool.connect();
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Check if indexes exist
    const indexesResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
      ORDER BY indexname
    `);
    
    console.log('🗂️  Created indexes:');
    indexesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.indexname}`);
    });
    
    // Check if extensions exist
    const extensionsResult = await client.query(`
      SELECT extname 
      FROM pg_extension 
      WHERE extname IN ('postgis', 'uuid-ossp')
    `);
    
    console.log('🔧 Extensions:');
    extensionsResult.rows.forEach(row => {
      console.log(`   ✓ ${row.extname}`);
    });
    
    client.release();
    console.log('✅ Migration verification completed');
    
  } catch (error) {
    console.error('❌ Migration verification failed:', error.message);
    throw error;
  }
}

// Main migration function
async function migrate() {
  try {
    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      process.exit(1);
    }
    
    console.log('\n🚀 Starting migrations...');
    
    // Define migration files and steps
    const migrationsDir = path.resolve(__dirname, '../database');
    
    // Step 1: Run initial schema migration
    await runMigration(
      path.join(migrationsDir, 'migrations', '001_initial_schema.sql'),
      'Initial schema setup'
    );
    
    // Step 2: Run indexes migration
    await runMigration(
      path.join(migrationsDir, 'migrations', '002_add_indexes.sql'),
      'Performance indexes'
    );

    // Step 2.5: Convert POINT to geometry(Point,4326) if needed
    await runMigration(
      path.join(migrationsDir, 'migrations', '003_convert_point_to_geometry.sql'),
      'Convert reports.location to geometry(Point,4326)'
    );
    
    // Step 3: Add the update trigger function
    const triggerSQL = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
      
      CREATE TRIGGER update_reports_updated_at 
          BEFORE UPDATE ON reports 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await runSQL(triggerSQL, 'Update timestamp triggers');
    
    // Verify migration results
    await verifyMigration();
    
    console.log('\n🎉 All migrations completed successfully!');
    console.log('🔗 Your Neon database is ready for Fix My Barangay');
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle script execution
if (require.main === module) {
  migrate().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { migrate, testConnection, verifyMigration };
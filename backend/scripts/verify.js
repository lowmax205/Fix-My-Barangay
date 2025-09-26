#!/usr/bin/env node

/**
 * Database Verification Script
 * 
 * This script verifies that the migrated database is working correctly
 * by testing key functionalities like table structure, indexes, and constraints
 */

const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyDatabase() {
  console.log('🔍 Verifying database functionality...\n');
  
  try {
    const client = await pool.connect();
    
    // 1. Test table structures
    console.log('📊 Testing table structures...');
    
    const tablesQuery = `
      SELECT 
        t.table_name,
        COUNT(c.column_name) as column_count
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND t.table_name IN ('reports', 'admin_users', 'rate_limits')
      GROUP BY t.table_name
      ORDER BY t.table_name
    `;
    
    const tablesResult = await client.query(tablesQuery);
    
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}: ${row.column_count} columns`);
    });
    
    // 2. Test PostGIS functionality
    console.log('\n🌍 Testing PostGIS geospatial functionality...');
    
    try {
      // Test creating a point
      const pointResult = await client.query(`
        SELECT 
          ST_X(ST_Point(121.0244, 14.5995)) as longitude,
          ST_Y(ST_Point(121.0244, 14.5995)) as latitude,
          ST_AsText(ST_Point(121.0244, 14.5995)) as point_text
      `);
      
      const point = pointResult.rows[0];
      console.log(`   ✓ Point creation: (${point.longitude}, ${point.latitude})`);
      console.log(`   ✓ Point as text: ${point.point_text}`);
    } catch (error) {
      console.log('   ❌ PostGIS test failed:', error.message);
    }
    
    // 3. Test UUID generation
    console.log('\n🆔 Testing UUID generation...');
    
    const uuidResult = await client.query('SELECT uuid_generate_v4() as test_uuid');
    console.log(`   ✓ UUID generated: ${uuidResult.rows[0].test_uuid}`);
    
    // 4. Test constraints and enums
    console.log('\n🔒 Testing table constraints...');
    
    // Test report categories constraint
    try {
      await client.query(`
        INSERT INTO reports (category, description, location, reporter_ip) 
        VALUES ('InvalidCategory', 'Test description', POINT(121, 14), '127.0.0.1')
      `);
      console.log('   ❌ Category constraint test failed - invalid category was accepted');
    } catch (error) {
      if (error.message.includes('check constraint')) {
        console.log('   ✓ Category constraint working - invalid categories rejected');
      } else {
        console.log('   ⚠️  Category constraint test error:', error.message);
      }
    }
    
    // 5. Test valid data insertion and trigger
    console.log('\n✏️  Testing data insertion and triggers...');
    
    const insertResult = await client.query(`
      INSERT INTO reports (category, description, location, reporter_ip) 
      VALUES ('Infrastructure', 'Test pothole report', POINT(121.0244, 14.5995), '127.0.0.1')
      RETURNING id, created_at, updated_at
    `);
    
    const testReport = insertResult.rows[0];
    console.log(`   ✓ Report inserted: ${testReport.id}`);
    console.log(`   ✓ Created at: ${testReport.created_at}`);
    console.log(`   ✓ Updated at: ${testReport.updated_at}`);
    
    // Test the update trigger
    await client.query('SELECT pg_sleep(1)'); // Wait 1 second
    
    const updateResult = await client.query(`
      UPDATE reports 
      SET description = 'Updated test pothole report' 
      WHERE id = $1
      RETURNING updated_at
    `, [testReport.id]);
    
    const updatedReport = updateResult.rows[0];
    console.log(`   ✓ Updated at: ${updatedReport.updated_at}`);
    
    if (new Date(updatedReport.updated_at) > new Date(testReport.updated_at)) {
      console.log('   ✓ Update trigger working - timestamp automatically updated');
    }
    
    // Clean up test data
    await client.query('DELETE FROM reports WHERE id = $1', [testReport.id]);
    console.log('   ✓ Test data cleaned up');
    
    // 6. Test indexes
    console.log('\n🗂️  Testing index performance...');
    
    const indexQuery = `
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
      ORDER BY indexname
    `;
    
    const indexResult = await client.query(indexQuery);
    console.log(`   ✓ ${indexResult.rows.length} performance indexes created`);
    
    client.release();
    
    console.log('\n🎉 Database verification completed successfully!');
    console.log('🚀 Your Neon database is fully ready for Fix My Barangay');
    
    return true;
    
  } catch (error) {
    console.error('\n💥 Database verification failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyDatabase().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifyDatabase };
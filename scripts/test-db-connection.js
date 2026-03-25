#!/usr/bin/env node

const { Client } = require('pg');

async function testConnection() {
  const configs = [
    {
      name: 'DIRECT_URL (port 5432)',
      connectionString: process.env.DIRECT_URL || 'postgresql://postgres:Letscodethis1!@db.okyqtkmfxuyjilmxgrcy.supabase.co:5432/postgres',
    },
    {
      name: 'DATABASE_URL (port 6543, pooler)',
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Letscodethis1!@db.okyqtkmfxuyjilmxgrcy.supabase.co:6543/postgres?pgbouncer=true',
    },
  ];

  for (const config of configs) {
    console.log(`\n=== Testing ${config.name} ===`);
    const client = new Client({
      connectionString: config.connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    try {
      console.log('Connecting...');
      await client.connect();
      console.log('✅ Connected successfully');

      const result = await client.query('SELECT version(), current_database()');
      console.log('Database:', result.rows[0].current_database);
      console.log('PostgreSQL version:', result.rows[0].version.split(',')[0]);

      // Check if tables exist
      const tables = await client.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        LIMIT 5
      `);
      console.log(`Tables in database: ${tables.rows.length > 0 ? tables.rows.map(r => r.tablename).join(', ') : 'none'}`);

      await client.end();
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      if (error.code) {
        console.error('Error code:', error.code);
      }
    }
  }
}

testConnection().catch(console.error);

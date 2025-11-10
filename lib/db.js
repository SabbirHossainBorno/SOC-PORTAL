// lib/db.js
import { Pool } from 'pg';

let pool = null;
let poolInitialized = false;

// Create database connection pool
const createPool = () => {
  if (pool) return pool;

  console.log('🔄 Creating database connection pool...');
  
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
      max: 10, // Reduced from 20 to prevent connection overload
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased timeout
    });

    // Pool event handlers
    pool.on('connect', () => {
      console.log('✅ Database client connected');
    });

    pool.on('error', (err) => {
      console.error('❌ Database pool error:', err.message);
      // Don't crash on pool errors
    });

    pool.on('remove', () => {
      console.log('ℹ️ Database client removed');
    });

    poolInitialized = true;
    console.log('✅ Database connection pool created successfully');
    return pool;
    
  } catch (error) {
    console.error('❌ Failed to create database pool:', error);
    pool = null;
    poolInitialized = false;
    throw error;
  }
};

// Get or create the database connection pool
const getDbConnection = () => {
  if (!pool) {
    return createPool();
  }
  
  // Check if pool is ended
  if (pool.ending || pool.ended) {
    console.warn('⚠️ Database pool was ended, recreating...');
    pool = null;
    return createPool();
  }
  
  return pool;
};

// Query function with enhanced error handling
const query = async (text, params) => {
  // Ensure pool exists
  const connection = getDbConnection();
  
  let client;
  try {
    client = await connection.connect();
    
    // Set timezone
    await client.query(`SET TIME ZONE 'Asia/Dhaka';`);
    
    // Execute query
    const result = await client.query(text, params);
    return result;
    
  } catch (error) {
    console.error('❌ Database query error:', {
      error: error.message,
      query: text.substring(0, 200),
      params: params ? JSON.stringify(params).substring(0, 200) : 'none'
    });
    
    // Check if it's a pool-ended error
    if (error.message.includes('pool') && error.message.includes('end')) {
      console.warn('🔄 Pool ended error detected, resetting pool...');
      pool = null; // Reset pool to force recreation
    }
    
    throw new Error(`Database query failed: ${error.message}`);
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('❌ Error releasing client:', releaseError.message);
      }
    }
  }
};

// Function to close the pool when the application shuts down
const closeDbConnectionPool = async () => {
  if (!pool) {
    return;
  }
  
  console.log('🔄 Closing database connection pool...');
  
  try {
    await pool.end();
    pool = null;
    poolInitialized = false;
    console.log('✅ Database connection pool closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
    pool = null;
    poolInitialized = false;
  }
};

// Export only what's needed
export { query, getDbConnection, closeDbConnectionPool };
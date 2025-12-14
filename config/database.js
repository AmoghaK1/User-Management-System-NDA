const { Sequelize } = require('sequelize');
require('dotenv').config();

// PostgreSQL connection using Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL || process.env.POSTGRES_URI, {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    // SSL required for cloud databases like Supabase
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL!');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };

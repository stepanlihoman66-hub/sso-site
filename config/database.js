const { Sequelize } = require('sequelize');
require('dotenv').config();

// Определяем, где мы находимся: на Render или локально
const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: isProduction ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {},
  logging: false
});

module.exports = sequelize;

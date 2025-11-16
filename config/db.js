const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);

    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/EXAM';

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });

    console.log('✅ MongoDB Successfully Connected');

    mongoose.connection.on('connected', () => {
      console.log('📡 Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('Mongoose disconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

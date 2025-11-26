const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qa-app');

    console.log('Connected to MongoDB');

    // Get admin details from command line arguments
    const args = process.argv.slice(2);
    if (args.length < 3) {
      console.log('Usage: node createAdmin.js <username> <email> <password>');
      process.exit(1);
    }

    const [username, email, password] = args;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log('User already exists. Updating role to admin...');
      existingUser.role = 'admin';
      await existingUser.save();
      console.log('User role updated to admin successfully!');
    } else {
      // Create new admin user
      const admin = await User.create({
        username,
        email,
        password,
        role: 'admin'
      });
      console.log('Admin user created successfully!');
      console.log('Username:', admin.username);
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createAdmin();


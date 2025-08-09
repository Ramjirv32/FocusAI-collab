const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/focusai', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  await createTestUsers();
  console.log('User creation completed successfully');
  process.exit(0);
});

async function createTestUsers() {
  try {
    // Clear existing users (optional)
    // await User.deleteMany({});
    // console.log('Cleared existing users');

    // Create a test user
    const saltRounds = 10;
    const password = await bcrypt.hash('password123', saltRounds);

    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password,
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isVerified: true,
    });

    await testUser.save();
    console.log('Created test user: test@example.com / password123');

    // Create more test users if needed
    const testUser2 = new User({
      username: 'admin',
      email: 'admin@example.com',
      password,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isVerified: true,
    });

    await testUser2.save();
    console.log('Created admin user: admin@example.com / password123');
  } catch (error) {
    console.error('Error creating test users:', error);
  }
}

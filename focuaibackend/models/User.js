const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

// Hash password before saving - with timeout protection
userSchema.pre('save', async function(next) {
  try {
    // Only hash if password is modified
    if (!this.isModified('password')) {
      console.log('Password not modified, skipping hash');
      return next();
    }

    console.log('Starting password hash for:', this.email);
    
    // Use lower rounds for faster hashing in development
    const saltRounds = process.env.NODE_ENV === 'production' ? 10 : 8;
    console.log('Using salt rounds:', saltRounds);
    
    // Generate salt
    const salt = await bcrypt.genSalt(saltRounds);
    console.log('Salt generated');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(this.password, salt);
    console.log('Password hashed, length:', hashedPassword.length);
    
    this.password = hashedPassword;
    console.log('Password hash complete for:', this.email);
    
    next();
  } catch (error) {
    console.error('❌ Error in password hashing:', error);
    console.error('Error stack:', error.stack);
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    throw error;
  }
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

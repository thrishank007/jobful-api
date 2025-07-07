const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  interests: {
    type: [String],
    default: []
  },
  fcmTokens: {
    type: [String],
    default: []
  },
  notificationSettings: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  profilePic: {
    type: String,
    default: ''
  },
  refreshToken: {
    type: String,
    default: ''
  },
  passwordResetCode: {
    type: String,
    default: ''
  },
  passwordResetExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generatePasswordResetCode = function() {
  const resetCode = crypto.randomInt(100000, 1000000).toString();
  this.passwordResetCode = resetCode;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetCode;
};

module.exports = mongoose.model('User', userSchema);
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const Users = require('../models/users');
const { generateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

// Register a new user
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    // Check if user already exists by email or username
    const existingUser = await Users.findOne({
      where: {
        [Op.or]: [
          { email: email },
          { username: username }
        ]
      }
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already registered' });
      } else {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await Users.create({
      username,
      email,
      password: hashedPassword,
      name,
      profileImage: 'defaultpfp.jpg'
    });

    // Generate JWT token
    const token = generateToken(user);

    // Return user data and token
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        isAdmin: user.isAdmin
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Find user by email or username
    const user = await Users.findOne({
      where: {
        [Op.or]: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid username/email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid username/email or password' });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return user data and token
    res.json({
    message: 'Login successful',
    user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        isAdmin: user.isAdmin
    },
    token
    });
} catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login', error: error.message });
}
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { 
scope: ['profile', 'email'],
  prompt: 'select_account'  // Force account selection
}));

router.get('/google/callback', 
passport.authenticate('google', { 
    failureRedirect: '/login', 
    session: false,
    prompt: 'select_account'  // Force account selection
}),
(req, res) => {
    // Generate JWT token
    const token = generateToken(req.user);
    
    // Redirect to frontend with token
    res.redirect(`http://localhost:3001/auth-success.html?token=${token}`);
}
);

// Get current user profile
router.get('/profile', passport.authenticate('jwt', { session: false }), (req, res) => {
res.json({
    user: {
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    name: req.user.name,
    profileImage: req.user.profileImage,
    isAdmin: req.user.isAdmin
    }
});
});

module.exports = router; 
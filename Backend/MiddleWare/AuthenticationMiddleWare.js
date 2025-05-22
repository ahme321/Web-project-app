const passport = require('passport');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
    return next(err);
    }
    if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = user;
    return next();
})(req, res, next);
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
if (req.user && req.user.isAdmin) {
    return next();
}
return res.status(403).json({ message: 'Forbidden: Admin access required' });
};

// Generate JWT token
const generateToken = (user) => {
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables');
    throw new Error('JWT_SECRET is not configured');
}

return jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || '24h' }
);
};

module.exports = {
authenticateJWT,
isAdmin,
generateToken
}; 
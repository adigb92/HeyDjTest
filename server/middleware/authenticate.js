const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
    console.log('Authenticating...');
    try {
        // Check for token in cookies first, then in Authorization header
        let token = req.cookies.token;
        
        if (!token) {
            // Check Authorization header for Bearer token
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }
        
        if (!token) {
            console.log('No token found');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        console.log('Token found, verifying...');
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        console.log('Token decoded, userId:', decoded.userId);
        
        const user = await User.findById(decoded.userId);
        if (!user) {
            console.log('No user found for token');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        console.log('User authenticated:', {
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin
        });
        
        req.user = user;
        next();
    } catch (err) {
        console.error('Error in authenticate:', err);
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = authenticate;

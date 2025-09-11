require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
let compression;
try {
    // Optional dependency; if not installed we skip compression gracefully
    // npm i compression to enable
    compression = require('compression');
} catch (_) {
    compression = null;
}
const genreRoutes = require('./routes/genres');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const passport = require('passport');
const path = require('path');

const app = express();

// Optional response compression
if (compression) {
    app.use(compression());
} else {
    console.log('compression not installed, skipping response compression');
}

// Build dynamic CSP sources from env
const frontendOrigins = [process.env.OAUTH_REDIRECT_URL, process.env.OAUTH_REDIRECT_URL_PROD].filter(Boolean);
const apiOrigins = [process.env.REACT_APP_API_URL, process.env.REACT_APP_API_URL_PROD]
    .filter(Boolean)
    .map((u) => {
        try { return new URL(u).origin; } catch (_) { return null; }
    })
    .filter(Boolean);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "data:", "https:"],
            scriptSrc: [
                "'self'",
                "https://apis.google.com",
                "'unsafe-inline'",
                "https://maxcdn.bootstrapcdn.com",
                "https://use.fontawesome.com",
                "https://fonts.googleapis.com",
                "'unsafe-eval'"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://maxcdn.bootstrapcdn.com",
                "https://use.fontawesome.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https:",
                "https://*.googleusercontent.com"
            ],
            connectSrc: [
                "'self'",
                "ws://localhost:3000",
                "http://localhost:3000",
                "https://apis.google.com",
                "wss:",
                ...frontendOrigins,
                ...apiOrigins
            ].filter(Boolean),
            fontSrc: [
                "'self'",
                "https:",
                "data:",
                "https://fonts.gstatic.com",
                "https://maxcdn.bootstrapcdn.com",
                "https://use.fontawesome.com"
            ],
            frameAncestors: ["'none'"],
            frameSrc: ["https://accounts.google.com/", "https://www.facebook.com"]
        }
    }
}));

// CORS: allow configured frontend origins
const allowedOrigins = [process.env.OAUTH_REDIRECT_URL, process.env.OAUTH_REDIRECT_URL_PROD]
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow non-browser clients
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 204
}));

app.use(bodyParser.json());
app.use(cookieParser());

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 86400000 }
}));

app.use(passport.initialize());
app.use(passport.session());

// Basic request logging (before routes)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use('/api/genre', genreRoutes);
app.use('/api/user', userRoutes);
app.use('/api/events', eventRoutes);

// Detailed logging for debugging OAuth flows
app.use('/auth/google', (_req, _res, next) => {
    console.log('Initiating Google OAuth flow');
    next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

app.use('/auth/google/callback', (_req, _res, next) => {
    console.log('Received callback from Google');
    next();
}, passport.authenticate('google', { failureRedirect: '/login' }));

app.use('/auth/facebook', (_req, _res, next) => {
    console.log('Initiating Facebook OAuth flow');
    next();
}, passport.authenticate('facebook', { 
    scope: ['email', 'public_profile'],
    callbackURL: `${process.env.OAUTH_REDIRECT_URL}/auth/facebook/callback`
}));

app.use('/auth/facebook/callback', (_req, _res, next) => {
    console.log('Received callback from Facebook');
    next();
}, passport.authenticate('facebook', {
    failureRedirect: '/login',
    successRedirect: '/genre-selection'
}));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../build', 'index.html'));
    });
}

// Error handling middleware (keep at end)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

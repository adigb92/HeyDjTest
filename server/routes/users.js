const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Genre = require('../models/Genre');
const Event = require('../models/Event');
const authenticate = require('../middleware/authenticate');
const jwt = require('jsonwebtoken');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const QRCode = require('qrcode');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { validateAndRemoveSerial } = require('../utils/eventUtils');

// Helper to build secure cookie options based on environment
const buildCookieOptions = () => {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd, // requires HTTPS in production
        sameSite: isProd ? 'lax' : 'lax',
        // 7 days
        maxAge: 7 * 24 * 60 * 60 * 1000
    };
};

const clearCookieOptions = () => {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'lax' : 'lax'
    };
};

// Generate a DJ-specific QR code
router.get('/generate-qr/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }
        if (!user.qrCodeDataURL) {
            const qrCodeDataURL = await QRCode.toDataURL(user._id.toString());
            user.qrCodeDataURL = qrCodeDataURL;
            await user.save();
        }
        res.json({ qrCodeDataURL: user.qrCodeDataURL });
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Scan a DJ's QR code by guest
const scanQrLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.post('/scan-qr', authenticate, scanQrLimiter, async (req, res) => {
    const bodySchema = Joi.object({ qrCodeIdentifier: Joi.string().length(24).hex().required() });
    const { error: bodyErr, value: body } = bodySchema.validate(req.body);
    if (bodyErr) return res.status(400).json({ message: bodyErr.message });
    const { qrCodeIdentifier } = body;
    
    try {
        // Find the DJ based on the QR code identifier
        const dj = await User.findOne({ _id: qrCodeIdentifier, isAdmin: true });
        if (!dj) {
            return res.status(404).json({ message: 'DJ not found' });
        }

        // Find the current live event for this DJ
        const currentEvent = await Event.findOne({
            userId: dj._id,
            eventDate: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                $lte: new Date(new Date().setHours(23, 59, 59, 999))
            }
        });

        if (!currentEvent) {
            return res.status(404).json({ message: 'No live event found for this DJ' });
        }

        // Check if guest is already registered for this event
        const isAlreadyRegistered = currentEvent.registeredUsers.some(
            user => user.userId.toString() === req.user._id.toString()
        );

        if (isAlreadyRegistered) {
            return res.status(400).json({ message: 'You are already registered for this event' });
        }

        // Add guest to the event
        currentEvent.registeredUsers.push({
            userId: req.user._id,
            genreChoice: req.user.genreChoice,
            youtubeLink: req.user.youtubeLink
        });

        // Update genre stats
        const genreIndex = currentEvent.genreStats.findIndex(stat => stat.genreName === req.user.genreChoice);
        if (genreIndex !== -1) {
            currentEvent.genreStats[genreIndex].count += 1;
        } else {
            currentEvent.genreStats.push({
                genreName: req.user.genreChoice,
                count: 1
            });
        }

        await currentEvent.save();

        // Update guest's event preferences
        await User.findByIdAndUpdate(req.user._id, {
            $push: { 
                eventPreferences: { 
                    eventId: currentEvent._id, 
                    genreChoice: req.user.genreChoice 
                }
            }
        });

        return res.json({ 
            message: `Successfully joined DJ ${dj.name}'s event!`,
            eventName: currentEvent.eventName,
            eventLocation: currentEvent.eventLocation,
            eventDate: currentEvent.eventDate
        });
    } catch (err) {
        console.error('Error processing QR code scan:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Deprecated: Not used by current flows (kept for backward compatibility)
router.get('/:userId/dj', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ djName: user.djName });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update user
// Deprecated: Placeholder update route (unused)
router.put('/:userId', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user fields...
        await user.save();

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/update-profile', authenticate, async (req, res) => {
    console.log('Updating profile for user:', req.user._id);
    try {
        const { phoneNumber, gender } = req.body;
        // Update the phoneNumber, gender, and also set profileCompleted to true
        const user = await User.findByIdAndUpdate(req.user._id, {
            phoneNumber,
            gender,
            profileCompleted: true // Ensure the profile is marked as complete
        }, { new: true });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the updated user data including the profile completion status
        res.json({ message: 'Profile updated successfully', user });
    } catch (err) {
        console.error('Error in /update-profile:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// endpoint for downloading user details (streamed, no temp file)
router.get('/download-user-details', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        // Find events owned by this DJ
        const djEvents = await Event.find({ userId: req.user._id }).select('registeredUsers');

        // Build a unique set of guest userIds from these events
        const userIdSet = new Set();
        for (const ev of djEvents) {
            for (const ru of ev.registeredUsers || []) {
                const id = ru.userId && ru.userId.toString ? ru.userId.toString() : String(ru.userId);
                userIdSet.add(id);
            }
        }

        const userIds = Array.from(userIdSet);

        // Prepare response headers for CSV streaming
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="user-details.csv"');

        // Write CSV header
        res.write('Name,Email,Phone Number,Gender\n');

        if (userIds.length === 0) {
            return res.end();
        }

        // Fetch only those users
        const users = await User.find({ _id: { $in: userIds } }).select('name email phoneNumber gender');

        // Stream rows
        for (const u of users) {
            const row = [
                (u.name || '').toString().replace(/"/g, '""'),
                (u.email || '').toString().replace(/"/g, '""'),
                (u.phoneNumber || '').toString().replace(/"/g, '""'),
                (u.gender || '').toString().replace(/"/g, '""')
            ].map(v => `"${v}"`).join(',');
            res.write(row + '\n');
        }

        return res.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/api/user-details', authenticate, async (req, res) => {
    try {
        const users = await User.find().select('name genreChoice time'); // Select only the 'name', 'genreChoice', and 'time' fields
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const schema = Joi.object({
            name: Joi.string().min(2).max(100).required(),
            email: Joi.string().email().required(),
            phoneNumber: Joi.string().allow('', null),
            gender: Joi.string().valid('male', 'female', 'other').allow('', null)
        });
        const { error: valErr, value } = schema.validate(req.body);
        if (valErr) return res.status(400).json({ message: valErr.message });

        const { name, email, phoneNumber, gender } = value;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Manual registration: mark profile as complete by default (phone/gender optional)
        const userData = { 
            name, 
            email,
            isProfileComplete: true,
            profileCompleted: true,
            authProvider: null
        };

        if (phoneNumber) userData.phoneNumber = phoneNumber;
        if (gender) userData.gender = gender;

        const user = new User(userData);

        // Generate QR code for the user
        const qrCodeDataURL = await QRCode.toDataURL(user._id.toString());
        user.qrCodeDataURL = qrCodeDataURL;

        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);

        // Set token in both cookies and return it for localStorage
        res.cookie('token', token, buildCookieOptions());
        res.status(201).json({ 
            message: 'Registration successful', 
            user,
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Endpoint to update user's genre choice and mark profile as completed
const genreUpdateLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
router.post('/update-genre', authenticate, genreUpdateLimiter, async (req, res) => {
    const schema = Joi.object({
        genre: Joi.string().min(1).required(),
        youtubeLink: Joi.string().uri().allow('', null)
    });
    const { error: valErr, value } = schema.validate(req.body);
    if (valErr) return res.status(400).json({ message: valErr.message });

    const { genre, youtubeLink } = value;

    // Validate YouTube URL if provided
    const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (youtubeLink && !youtubeUrlRegex.test(youtubeLink)) {
        return res.status(400).json({ message: 'Invalid YouTube URL provided' });
    }

    try {
        // Prepare update data
        const updateData = {
            genreChoice: genre,
            ...(youtubeLink && { youtubeLink }) // Include YouTube link if valid and provided
        };

        // Update the user with new genre and YouTube link
        const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update related event details if needed
        const events = await Event.find({ "registeredUsers.userId": req.user._id });
        for (const event of events) {
            const userIndex = event.registeredUsers.findIndex(u => u.userId.equals(req.user._id));
            if (userIndex > -1) {
                event.registeredUsers[userIndex].genreChoice = genre;
                if (youtubeLink) {
                    event.registeredUsers[userIndex].youtubeLink = youtubeLink;
                }
                await event.save();
            }
        }

        res.json({
            message: 'Genre and YouTube link updated successfully',
            user: updatedUser,
            profileCompleted: updatedUser.profileCompleted
        });
    } catch (error) {
        console.error('Error updating genre and YouTube link:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// login
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const schema = Joi.object({ email: Joi.string().email().required() });
        const { error: valErr, value } = schema.validate(req.body);
        if (valErr) return res.status(400).json({ message: valErr.message });

        const { email } = value;

        const user = await User.findOne({ email });
        if (process.env.NODE_ENV !== 'production') console.log(user);
        if (!user) {
            return res.status(400).json({ message: 'Invalid email' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);

        // Set token in both cookies and return it for localStorage
        res.cookie('token', token, buildCookieOptions());
        if (process.env.NODE_ENV !== 'production') console.log(user);
        res.status(200).json({ message: 'Login successful', user, token }); // return the full user object and token
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


router.post('/logout', authenticate, (req, res) => {
    try {
        res.clearCookie('token', clearCookieOptions());
        res.status(200).json({ message: 'Logout successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/user-stats', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        // Fetch all events owned by this DJ
        const djEvents = await Event.find({ userId: req.user._id }).select('registeredUsers');

        // Collect unique guest userIds and whether they have any genre choice across events
        const userIdToHasGenre = new Map();
        for (const ev of djEvents) {
            for (const ru of ev.registeredUsers || []) {
                const id = ru.userId && ru.userId.toString ? ru.userId.toString() : String(ru.userId);
                if (!userIdToHasGenre.has(id)) userIdToHasGenre.set(id, false);
                if (ru.genreChoice && String(ru.genreChoice).trim().length > 0) {
                    userIdToHasGenre.set(id, true);
                }
            }
        }

        const uniqueUserIds = Array.from(userIdToHasGenre.keys());

        if (uniqueUserIds.length === 0) {
            return res.json({ totalUsers: 0, genreChoices: 0, males: 0, females: 0 });
        }

        // Fetch user details for gender distribution
        const guests = await User.find({ _id: { $in: uniqueUserIds } }).select('gender');

        let males = 0;
        let females = 0;
        for (const g of guests) {
            if (g.gender === 'male') males += 1;
            else if (g.gender === 'female') females += 1;
        }

        const totalUsers = uniqueUserIds.length;
        const genreChoices = Array.from(userIdToHasGenre.values()).filter(Boolean).length;

        res.json({ totalUsers, genreChoices, males, females });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/check-admin', authenticate, (req, res) => {
    try {
        res.json({ isAdmin: req.user.isAdmin });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/check-auth', authenticate, (req, res) => {
    try {
        // If the middleware didn't throw an error, the user is authenticated
        res.json({ isAuthenticated: true, isAdmin: req.user.isAdmin, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Passport serialization and deserialization
passport.serializeUser((user, done) => {
    done(null, user.id);  // Serialize user by id
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Passport setup for Facebook
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/user/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ facebookId: profile.id });
        if (!user) {
            user = new User({
                name: `${profile.name.givenName} ${profile.name.familyName}`,
                email: profile.emails[0].value,
                facebookId: profile.id
            });
            await user.save();
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
}));

// Passport setup for Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/user/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id
            });
            await user.save();
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
}));

// Routes for OAuth2.0
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign({ userId: req.user._id }, process.env.SECRET_KEY);
        res.cookie('token', token, buildCookieOptions());
        res.redirect(process.env.OAUTH_REDIRECT_URL); // Redirect to front-end route
    });

router.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign({ userId: req.user._id }, process.env.SECRET_KEY);
        res.cookie('token', token, buildCookieOptions());
        res.redirect(process.env.OAUTH_REDIRECT_URL); // Redirect to front-end route
    });

// Endpoint to Get DJ info based on the scanned DJ-specific QR code
router.get('/dj-info/:djQRIdentifier', async (req, res) => {
    try {
        const djQRIdentifier = req.params.djQRIdentifier;
        console.log('DJ info requested for:', djQRIdentifier);

        // Check if the identifier is a valid ObjectId
        if (!djQRIdentifier || !mongoose.Types.ObjectId.isValid(djQRIdentifier)) {
            return res.status(400).json({ message: 'Invalid DJ identifier' });
        }

        const user = await User.findOne({ _id: djQRIdentifier, isAdmin: true });

        if (!user) {
            console.log('No DJ found for ID:', djQRIdentifier);
            return res.status(404).json({ message: 'DJ not found' });
        }

        console.log('DJ found:', { _id: user._id, name: user.name, isAdmin: user.isAdmin });
        res.json({ djName: user.name });

    } catch (err) {
        console.error('Error in /dj-info:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// endpoint for updating user as admin (dj)
router.get('/api/users/verifySerial', authenticate, async (req, res) => {
    const { serial } = req.body;

    // Validate and remove serial number from a database or memory
    const isValid = await validateAndRemoveSerial(serial);

    if (isValid) {
        // Update the user to admin
        const user = await User.findById(req.user._id);
        user.isAdmin = true;
        await user.save();

        return res.status(200).send({ message: 'You are now registered as a DJ' });
    } else {
        return res.status(400).send({ message: 'Invalid or expired serial number' });
    }
});

// Endpoint to get current user details
router.get('/current-user', authenticate, async (req, res) => {
    try {
        // Assuming req.user is set by your authentication middleware
        const user = await User.findById(req.user._id).select('-password'); // Exclude sensitive data
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Error in /current-user:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// endpoint to fetch DJs
router.get('/djs', async (req, res) => {
    try {
        // Assuming 'isAdmin' field determines if a user is a DJ
        const djs = await User.find({ isAdmin: true }).select('name email');
        res.json(djs);
    } catch (error) {
        console.error('Error fetching DJs:', error);
        res.status(500).send({ message: 'Internal server error', error: error.toString() });
    }
});

module.exports = router;
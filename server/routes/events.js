const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const authenticate = require('../middleware/authenticate');
const User = require('../models/User');
const mongoose = require('mongoose');
const Serial = require('../models/Serial');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');

// Endpoint to fetch live events with DJ details and registered users
router.get('/live', authenticate, async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // If the requester is a DJ (admin), only fetch their events
        const baseCriteria = {
            eventDate: { $gte: todayStart, $lte: todayEnd }
        };
        const criteria = req.user && req.user.isAdmin
            ? { ...baseCriteria, userId: req.user._id }
            : baseCriteria;

        const events = await Event.find(criteria)
        .populate('userId', 'name qrCodeDataURL')
        .populate('registeredUsers.userId', 'name')
        .sort({ eventDate: 1 }); // Sort by event date

        const liveEventsData = events.map(event => ({
            _id: event._id,
            eventName: event.eventName,
            djName: event.userId ? event.userId.name : 'Unknown DJ',
            djQRCode: event.userId ? event.userId.qrCodeDataURL : null,
            userId: event.userId ? event.userId._id : null,
            registeredUsers: event.registeredUsers.map(ru => ({
                userName: ru.userId ? ru.userId.name : 'Unknown User',
                genreChoice: ru.genreChoice || '',
                youtubeLink: ru.youtubeLink || ''
            })),
            genreStats: event.genreStats || []
        }));
        // Always return 200 with array (possibly empty)
        res.json(liveEventsData);
    } catch (error) {
        console.error("Error fetching live events:", error);
        res.status(500).json({ message: "Internal server error", error: error.toString() });
    }
});

// Get all events
router.get('/', async (req, res) => {
    try {
        const events = await Event.find().populate({
            path: 'registeredUsers.userId',
            select: 'name genreChoice youtubeLink'  // Make sure to fetch the YouTube link
        });
        res.json(events.map(event => ({
            ...event.toObject(),
            registeredUsers: event.registeredUsers.map(user => ({
                userName: user.userId.name,
                genreChoice: user.genreChoice,
                youtubeLink: user.youtubeLink  // Include the YouTube link in the response
            }))
        })));
    } catch (err) {
        console.error("Error fetching all events:", err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});

// Get authenticated DJ's events only
router.get('/mine', authenticate, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const events = await Event.find({ userId: req.user._id }).populate({
            path: 'registeredUsers.userId',
            select: 'name genreChoice youtubeLink'
        });

        res.json(events.map(event => ({
            ...event.toObject(),
            registeredUsers: event.registeredUsers.map(user => ({
                userName: user.userId?.name,
                genreChoice: user.genreChoice,
                youtubeLink: user.youtubeLink
            }))
        })));
    } catch (err) {
        console.error("Error fetching DJ events:", err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});

// Get event by ID
router.get('/:eventId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    } catch (err) {
        console.error("Error fetching event by ID:", err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});

// Get DJ info for a given event (public)
router.get('/:eventId/dj', async (req, res) => {
    try {
        const { eventId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }
        const event = await Event.findById(eventId).populate('userId', 'name');
        if (!event || !event.userId) {
            return res.status(404).json({ message: 'Event or DJ not found' });
        }
        return res.json({ djName: event.userId.name });
    } catch (err) {
        console.error('Error fetching event DJ:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all events for a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        const events = await Event.find({ userId: req.params.userId });
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create new event
router.post('/', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden. Only DJs can create events.' });
    }

    try {
        const { djName, eventName, eventLocation, eventDate } = req.body;
        const newEvent = new Event({
            djName: djName || req.user.name, // Use DJ's name from the request or fallback to authenticated user's name
            eventName,
            eventLocation,
            eventDate,
            userId: req.user._id
        });
        const savedEvent = await newEvent.save();
        res.status(201).json({
            message: 'Event created successfully!',
            event: savedEvent
        });
    } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).json({ message: "Internal server error", error: error.toString() });
    }
});


// Update event
router.put('/:eventId', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }
        const { djName, eventName, eventLocation, eventDate } = req.body;
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Update event fields
        if (djName !== undefined) event.djName = djName;
        if (eventName !== undefined) event.eventName = eventName;
        if (eventLocation !== undefined) event.eventLocation = eventLocation;
        if (eventDate !== undefined) event.eventDate = eventDate;
        await event.save();

        res.json(event);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete event
router.delete('/:eventId', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        await event.deleteOne();

        res.json({ message: 'Event deleted' });
    } catch (err) {
        console.error(err); // Log the error to see what's going wrong
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Deprecated: Assign DJ to event (current model uses userId set at creation)
router.put('/:eventId/assign-dj', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }
        const { djId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(djId)) {
            return res.status(400).json({ message: 'Invalid DJ ID' });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const dj = await User.findById(djId);
        if (!dj) {
            return res.status(404).json({ message: 'DJ not found' });
        }

        event.djId = mongoose.Types.ObjectId(djId);
        await event.save();

        res.json(event);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Validate Serial
router.post('/validate-serial', async (req, res) => {
    try {
        const { serial } = req.body;

        // Find the serial in the database
        const foundSerial = await Serial.findOne({ serial });

        if (!foundSerial) {
            return res.status(400).json({ message: 'Invalid serial number.' });
        }

        if (foundSerial.isActive) {
            return res.status(400).json({ message: 'This serial number is already active.' });
        }

        // Activate the serial
        foundSerial.isActive = true;
        await foundSerial.save();

        res.status(200).json({ message: 'Serial number validated and activated.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update event with new genre selection
const genreEventLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
router.put('/:eventId/genre-update', authenticate, genreEventLimiter, async (req, res) => {
    try {
        const { eventId } = req.params;
        const schema = Joi.object({
            userId: Joi.string().length(24).hex().required(),
            genreChoice: Joi.string().min(1).required(),
            youtubeLink: Joi.string().uri().allow('', null)
        });
        const { error: valErr, value } = schema.validate(req.body);
        if (valErr) return res.status(400).json({ message: valErr.message });
        const { userId, genreChoice, youtubeLink } = value;
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Find the user in registeredUsers
        const userIndex = event.registeredUsers.findIndex(
            user => user.userId.toString() === userId
        );

        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not registered for this event' });
        }

        // Store the old genre before updating
        const oldGenre = event.registeredUsers[userIndex].genreChoice;
        
        // Update the user's genre choice
        event.registeredUsers[userIndex].genreChoice = genreChoice;
        if (youtubeLink) {
            event.registeredUsers[userIndex].youtubeLink = youtubeLink;
        }

        // Update genre stats only if genre actually changed
        if (oldGenre !== genreChoice) {
            // Decrease count for old genre
            if (oldGenre) {
                const oldGenreIndex = event.genreStats.findIndex(stat => stat.genreName === oldGenre);
                if (oldGenreIndex !== -1) {
                    event.genreStats[oldGenreIndex].count = Math.max(0, event.genreStats[oldGenreIndex].count - 1);
                }
            }

            // Increase count for new genre
            const newGenreIndex = event.genreStats.findIndex(stat => stat.genreName === genreChoice);
            if (newGenreIndex !== -1) {
                event.genreStats[newGenreIndex].count += 1;
            } else {
                event.genreStats.push({
                    genreName: genreChoice,
                    count: 1
                });
            }
        }

        await event.save();

        res.json({
            message: 'Genre updated successfully',
            event: event
        });
    } catch (error) {
        console.error("Error updating genre:", error);
        res.status(500).json({ message: "Internal server error", error: error.toString() });
    }
});

// Assign user to event after registration
const assignUserLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.post('/assign-user', assignUserLimiter, async (req, res) => {
    try {
        const schema = Joi.object({
            eventId: Joi.string().length(24).hex().required(),
            userId: Joi.string().length(24).hex().required(),
            djId: Joi.string().length(24).hex().optional()
        });
        const { error: valErr, value } = schema.validate(req.body);
        if (valErr) return res.status(400).json({ message: valErr.message });
        const { eventId, userId, djId } = value;
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }
        if (djId && !mongoose.Types.ObjectId.isValid(djId)) {
            return res.status(400).json({ message: 'Invalid DJ ID' });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user is already registered for this event
        const existingUser = event.registeredUsers.find(
            user => user.userId.toString() === userId
        );

        if (existingUser) {
            return res.status(400).json({ message: 'User is already registered for this event' });
        }

        // Add user to the event
        event.registeredUsers.push({
            userId: userId,
            genreChoice: '', // Will be set when user selects genre
            youtubeLink: ''
        });

        await event.save();

        res.json({
            message: 'User successfully assigned to event',
            event: event
        });
    } catch (error) {
        console.error('Error assigning user to event:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Consolidated: Ensure assignment and update genre for the authenticated user within an event
const genreSelectLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
router.post('/:eventId/genre-select', authenticate, genreSelectLimiter, async (req, res) => {
    try {
        const { eventId } = req.params;
        const schema = Joi.object({
            genreChoice: Joi.string().min(1).required(),
            youtubeLink: Joi.string().uri().allow('', null)
        });
        const { error: valErr, value } = schema.validate(req.body);
        if (valErr) return res.status(400).json({ message: valErr.message });
        const { genreChoice, youtubeLink } = value;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        if (typeof genreChoice !== 'string' || !genreChoice.trim()) {
            return res.status(400).json({ message: 'Invalid genre choice' });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Ensure user is registered to the event
        let ruIndex = event.registeredUsers.findIndex(u => u.userId.toString() === req.user._id.toString());
        if (ruIndex === -1) {
            event.registeredUsers.push({ userId: req.user._id, genreChoice: '', youtubeLink: '' });
            ruIndex = event.registeredUsers.length - 1;
        }

        const oldGenre = event.registeredUsers[ruIndex].genreChoice || '';
        event.registeredUsers[ruIndex].genreChoice = genreChoice;
        if (youtubeLink) {
            event.registeredUsers[ruIndex].youtubeLink = youtubeLink;
        }

        // Update genreStats counts if changed
        if (oldGenre !== genreChoice) {
            if (oldGenre) {
                const oldIdx = event.genreStats.findIndex(s => s.genreName === oldGenre);
                if (oldIdx !== -1) {
                    event.genreStats[oldIdx].count = Math.max(0, event.genreStats[oldIdx].count - 1);
                }
            }
            const newIdx = event.genreStats.findIndex(s => s.genreName === genreChoice);
            if (newIdx !== -1) {
                event.genreStats[newIdx].count += 1;
            } else {
                event.genreStats.push({ genreName: genreChoice, count: 1 });
            }
        }

        await event.save();

        // Update the user's profile genre/youtube
        try {
            await User.findByIdAndUpdate(req.user._id, {
                genreChoice: genreChoice,
                ...(youtubeLink ? { youtubeLink } : {})
            });
        } catch (_) {}

        return res.json({ message: 'Genre updated successfully', event });
    } catch (error) {
        console.error('Error in consolidated genre-select:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Generate QR code for event
router.get('/:eventId/qr-code', authenticate, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Create a direct URL that includes event data as query parameters
        // Use hardcoded development URL for now
        const appUrl = process.env.NODE_ENV === 'production' 
            ? (process.env.OAUTH_REDIRECT_URL_PROD || 'https://your-production-domain.com')
            : (process.env.OAUTH_REDIRECT_URL || 'http://localhost:3000');
            
        const qrUrl = `${appUrl}/register?eventId=${event._id}&djId=${event.userId}`;

        // Generate QR code with the direct URL
        const QRCode = require('qrcode');
        const qrCode = await QRCode.toDataURL(qrUrl, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 300
        });

        res.json({ qrCode });
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ message: 'Error generating QR code' });
    }
});

module.exports = router;

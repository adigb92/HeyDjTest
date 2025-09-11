const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    djName: String,
    eventName: String,
    eventLocation: String,
    eventDate: Date,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    registeredUsers: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        genreChoice: String,
        youtubeLink: String  // Add this field to store YouTube links
    }],
    genreStats: [{
        genreName: String,
        count: Number
    }]
});

// Indexes to speed up per-DJ queries and membership lookups
EventSchema.index({ userId: 1, eventDate: 1 });
EventSchema.index({ 'registeredUsers.userId': 1 });

module.exports = mongoose.model('Event', EventSchema);

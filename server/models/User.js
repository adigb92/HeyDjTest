const mongoose = require('mongoose');
const validator = require('validator'); // Make sure to install 'validator'

const UserSchema = new mongoose.Schema({
    name: String,
    email: {
        type: String,
        required: true,
        unique: true,
        validate: [validator.isEmail, 'Please provide a valid email address']
    },
    phoneNumber: {
        type: String,
        validate: {
            validator: function (v) {
                return /^\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number format!`
        }
    },
    gender: String,
    isAdmin: Boolean,
    genreChoice: String,
    eventPreferences: [{
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event'
        },
        genreChoice: String
    }],
    events: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }],
    time: {
        type: Date,
        default: Date.now
    },
    googleId: String,
    facebookId: String,
    qrCode: String,
    qrCodeDataURL: String,
    profileCompleted: { type: Boolean, default: false },
    isProfileComplete: { type: Boolean, default: false },
    authProvider: { type: String, enum: ['google', 'facebook', null], default: null },
    youtubeLink: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

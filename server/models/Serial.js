const mongoose = require('mongoose');

const serialSchema = new mongoose.Schema({
    serial: {
        type: String,
        required: true,
        unique: true,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    djId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DJ'
    }
});

const Serial = mongoose.model('Serial', serialSchema);

module.exports = Serial;

const mongoose = require('mongoose');

const serialSchema = new mongoose.Schema({
    serial: {
        type: String,
        required: true,
        unique: true,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    djId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DJ'
    }
});

const Serial = mongoose.model('Serial', serialSchema);

module.exports = Serial;

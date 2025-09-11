const mongoose = require('mongoose');

const SubGenreSchema = new mongoose.Schema({
    name: String,
    artists: [String]
});

const GenreSchema = new mongoose.Schema({
    name: String,
    subGenres: [SubGenreSchema]
});

module.exports = mongoose.model('Genre', GenreSchema);
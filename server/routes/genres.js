const express = require('express');
const router = express.Router();
const Genre = require('../models/Genre');
const User = require('../models/User');
const authenticate = require('../middleware/authenticate');

router.get('/genre-stats', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        console.log('Fetching genre stats...');
        const genres = await Genre.aggregate([
            {
                $group: {
                    _id: '$name',
                    totalChoices: { $sum: 1 },
                    choicesByFemales: {
                        $sum: {
                            $cond: [{ $eq: ['$gender', 'female'] }, 1, 0]
                        }
                    },
                    choicesByMales: {
                        $sum: {
                            $cond: [{ $eq: ['$gender', 'male'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: '$_id',
                    totalChoices: 1,
                    choicesByFemales: 1,
                    choicesByMales: 1
                }
            }
        ]);

        const totalChoices = genres.reduce((sum, genre) => sum + genre.totalChoices, 0);

        genres.forEach(genre => {
            genre.percentageDistribution = (genre.totalChoices / totalChoices) * 100;
        });

        console.log('Genre stats:', genres);

        res.json(genres);
    } catch (error) {
        console.error(error); // Log the error to the console
        res.status(500).json({ message: `Internal server error: ${error.message}` }); // Send the error message to the client
    }
});

router.get('/:userId', async (req, res, next) => {
    try {
        const genre = await Genre.findOne({ userId: req.params.userId });
        if (!genre) {
            return res.status(404).json({ message: 'Genre not found' });
        }
        res.json({ genre: genre.name });
    } catch (err) {
        next(err);
    }
});

router.post('/:userId', async (req, res, next) => {
    try {
        const { genre } = req.body;
        let genreObj = await Genre.findOne({ userId: req.params.userId });
        if (!genreObj) {
            genreObj = new Genre({ name: genre, userId: req.params.userId });
        } else {
            genreObj.name = genre;
        }
        await genreObj.save();
        res.json({ message: 'Genre updated successfully' });
    } catch (err) {
        next(err);
    }
});

router.post('/', authenticate, async (req, res, next) => {
    try {
        const { genre } = req.body;
        const existingGenre = await Genre.findOne({ userId: req.user._id });
        if (existingGenre) {
            existingGenre.name = genre;
            await existingGenre.save();
        } else {
            const newGenre = new Genre({ name: genre, userId: req.user._id });
            await newGenre.save();
        }

        // Update genreChoice and time in User document
        const user = await User.findById(req.user._id);
        user.genreChoice = genre;
        user.time = Date.now();
        await user.save();

        console.log(`Updated user ${user.name} with genre choice ${user.genreChoice} at time ${user.time}`);

        res.json({ message: 'Genre selected successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

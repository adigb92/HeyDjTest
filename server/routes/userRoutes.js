// Google OAuth callback
router.get('/auth/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user._id },
            process.env.SECRET_KEY,
            { expiresIn: '24h' }
        );
        res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
    }
);

// Facebook OAuth callback
router.get('/auth/facebook/callback',
    passport.authenticate('facebook', { session: false }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user._id },
            process.env.SECRET_KEY,
            { expiresIn: '24h' }
        );
        res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
    }
); 
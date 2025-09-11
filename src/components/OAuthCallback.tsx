import React, { useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserContext from './UserContext';
import LoadingSpinner from './LoadingSpinner';
import { Container, Row, Col } from 'react-bootstrap';

const OAuthCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { updateUser } = useContext(UserContext);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const params = new URLSearchParams(location.search);
                const token = params.get('token');
                const userData = params.get('user');

                if (!token || !userData) {
                    throw new Error('Missing token or user data');
                }

                // Store the token
                localStorage.setItem('token', token);

                // Update user context with the user data
                const user = JSON.parse(decodeURIComponent(userData));
                updateUser(user);

                // If user hasn't completed profile, go to profile completion
                if (!user.isProfileComplete) {
                    navigate('/profile-completion');
                } else {
                    navigate('/genre-selection');
                }
            } catch (error) {
                console.error('OAuth callback error:', error);
                navigate('/login');
            }
        };

        handleCallback();
    }, [location, navigate, updateUser]);

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col xs={12} className="text-center">
                    <LoadingSpinner size={40} variant="bootstrap" />
                    <p className="mt-3">Completing login...</p>
                </Col>
            </Row>
        </Container>
    );
};

export default OAuthCallback; 
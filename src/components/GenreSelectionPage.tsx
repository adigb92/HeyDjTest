import React, { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import GenreContext from './GenreContext';
import UserContext from './UserContext';
import { post } from '../utils/apiClient';
import { handleApiError, handleApiSuccess } from '../utils/errorHandler';
import LoadingSpinner from './LoadingSpinner';
import { Container, Card, Button, Form, Alert } from 'react-bootstrap';
import '../styles/GenreSelectionPage.css';

const genres = ["Oriental", "Hip-hop", "Latin", "Trance", "Techno", "Israeli", "80s"];

const GenreSelectionPage = () => {
    const { setGenre } = useContext(GenreContext);
    const { user, updateUser, loading: userLoading, refreshAuth } = useContext(UserContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [youtubeLink, setYoutubeLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [eventId, setEventId] = useState<string | null>(null);

    useEffect(() => {
        console.log('GenreSelectionPage: useEffect triggered');
        console.log('GenreSelectionPage: Current user context:', user);
        console.log('GenreSelectionPage: User loading state:', userLoading);
        console.log('GenreSelectionPage: Current location:', location);
        
        // Check if we're coming from an event QR scan
        const params = new URLSearchParams(location.search);
        const eventIdParam = params.get('eventId');
        console.log('GenreSelectionPage: eventId from URL params:', eventIdParam);
        
        // Also check sessionStorage for eventId from QR scan
        const pendingEventData = sessionStorage.getItem('pendingEventData');
        console.log('GenreSelectionPage: pendingEventData from sessionStorage:', pendingEventData);
        
        let eventIdFromStorage = null;
        
        if (pendingEventData) {
            try {
                const data = JSON.parse(pendingEventData);
                eventIdFromStorage = data.eventId;
                console.log('GenreSelectionPage: eventId from sessionStorage:', eventIdFromStorage);
            } catch (error) {
                console.error('GenreSelectionPage: Error parsing pending event data:', error);
            }
        }
        
        // Use eventId from URL params first, then from sessionStorage
        const finalEventId = eventIdParam || eventIdFromStorage;
        if (finalEventId) {
            setEventId(finalEventId);
            console.log('GenreSelectionPage: Event ID set from QR scan:', finalEventId);
        } else {
            console.log('GenreSelectionPage: No event ID found, user may not be in event context');
        }
    }, [location, user, userLoading]);

    const handleGenreSelection = async (genre: string) => {
        console.log('GenreSelectionPage: handleGenreSelection called with genre:', genre);
        console.log('GenreSelectionPage: Current user:', user);
        console.log('GenreSelectionPage: Current eventId:', eventId);
        
        setLoading(true);
        setError(null);
        setGenre(genre);
        
        try {
            // Check if user is available
            if (!user || !user._id) {
                console.error('GenreSelectionPage: User not authenticated');
                setError('User not authenticated. Please log in again.');
                setLoading(false);
                return;
            }

            console.log('GenreSelectionPage: User authenticated, proceeding with genre selection');

            // If in event context, ensure the user is assigned to the event before updating genre
            if (eventId) {
                try {
                    const pendingEventDataRaw = sessionStorage.getItem('pendingEventData');
                    let djId: string | undefined = undefined;
                    if (pendingEventDataRaw) {
                        try {
                            const pending = JSON.parse(pendingEventDataRaw);
                            djId = pending?.djId;
                        } catch (_e) {}
                    }

                    console.log('GenreSelectionPage: Ensuring registration for eventId:', eventId, 'djId:', djId);
                    await post('/events/assign-user', {
                        eventId,
                        userId: user._id,
                        ...(djId ? { djId } : {})
                    });
                    console.log('GenreSelectionPage: Assignment ensured (or already registered).');
                } catch (assignErr: any) {
                    const msg = (assignErr && assignErr.response && assignErr.response.data && assignErr.response.data.message) || '';
                    if (typeof msg === 'string' && msg.toLowerCase().includes('already registered')) {
                        console.log('GenreSelectionPage: User already registered for event, continuing.');
                    } else {
                        console.warn('GenreSelectionPage: Assignment preflight failed (continuing to genre update anyway):', assignErr);
                    }
                }
            }

            // First update the user's genre preference
            const response = await post<{ user: any; profileCompleted: boolean; message: string }>(
                '/user/update-genre',
                { genre, youtubeLink }
            );
            
            console.log('GenreSelectionPage: Genre update response:', response);
            
            if (response.user) {
                updateUser(response.user);
                handleApiSuccess(response.message);

                // If we're in an event context, update the event's genre stats (consolidated endpoint)
                if (eventId) {
                    console.log('GenreSelectionPage: Updating event genre stats for eventId:', eventId);
                    try {
                        await post(`/events/${eventId}/genre-select`, {
                            genreChoice: genre,
                            youtubeLink
                        });
                        console.log('GenreSelectionPage: Event genre stats updated successfully');
                    } catch (eventError) {
                        console.error('GenreSelectionPage: Error updating event genre stats:', eventError);
                        // Don't fail the whole operation if event update fails
                    }
                } else {
                    console.log('GenreSelectionPage: No eventId, skipping event genre stats update');
                }

                // Navigate to confirmation if profile is completed (effective), include context
                const effectiveProfileCompleted = Boolean(
                    response.profileCompleted ||
                    (response.user && (response.user.phoneNumber || response.user.gender)) ||
                    (response.user && response.user.isProfileComplete === true)
                );
                if (effectiveProfileCompleted) {
                    const pendingEventDataRaw = sessionStorage.getItem('pendingEventData');
                    let djId: string | undefined = undefined;
                    if (pendingEventDataRaw) {
                        try {
                            const pending = JSON.parse(pendingEventDataRaw);
                            djId = pending?.djId;
                        } catch (_e) {}
                    }
                    const query = eventId ? `?eventId=${eventId}${djId ? `&djId=${djId}` : ''}` : '';
                    console.log('GenreSelectionPage: Navigating to /confirmation' + query);
                    navigate('/confirmation' + query);
                } else {
                    console.log('GenreSelectionPage: Profile not completed, navigating to /complete-profile');
                    navigate('/complete-profile');
                }
            }
        } catch (error) {
            console.error('GenreSelectionPage: Error in handleGenreSelection:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="mt-4 mb-5 pb-5">
            <div className="text-center mb-4">
                <h1>Select Your Genre</h1>
                <p className="lead">What music would you like to listen to or share?</p>
            </div>

            {error && (
                <Alert variant="danger" className="mb-4">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                </Alert>
            )}

            {/* Show loading state while user context is loading */}
            {userLoading ? (
                <div className="text-center">
                    <LoadingSpinner size={40} variant="bootstrap" />
                    <p className="mt-3">Loading user information...</p>
                </div>
            ) : !user ? (
                <>
                    <Alert variant="warning" className="mb-4">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        User not authenticated. Please wait or refresh the page.
                    </Alert>
                    
                    {/* Debug section */}
                    <Card className="mb-4">
                        <Card.Body>
                            <Card.Title>Debug Information</Card.Title>
                            <div className="mb-3">
                                <strong>Token in localStorage:</strong> {localStorage.getItem('token') ? 'Token exists' : 'No token'}
                            </div>
                            <div className="mb-3">
                                <strong>User Context State:</strong> {JSON.stringify({ user, loading: userLoading })}
                            </div>
                            <Button 
                                variant="info" 
                                onClick={refreshAuth}
                                className="me-2"
                            >
                                Refresh Authentication
                            </Button>
                            <Button 
                                variant="secondary" 
                                onClick={() => window.location.reload()}
                            >
                                Reload Page
                            </Button>
                        </Card.Body>
                    </Card>
                </>
            ) : (
                <>
                    <div className="row g-4 mb-4">
                        {genres.map((genre, index) => (
                            <div key={index} className="col-sm-12 col-md-6 col-lg-4">
                                <Card className="h-100">
                                    <Card.Body className="d-flex flex-column">
                                        <Card.Title className="text-center">{genre}</Card.Title>
                                        <Button 
                                            variant="primary" 
                                            className="mt-auto"
                                            onClick={() => handleGenreSelection(genre)}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <LoadingSpinner size={20} variant="bootstrap" />
                                                    <span className="ms-2">Selecting...</span>
                                                </>
                                            ) : 'Select'}
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </div>
                        ))}
                    </div>

                    <Card className="mt-4">
                        <Card.Body>
                            <Card.Title>Custom Genre and YouTube Link</Card.Title>
                            <Form.Group className="mb-3">
                                <Form.Label>YouTube Link</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Paste a YouTube link here"
                                    value={youtubeLink}
                                    onChange={(e) => setYoutubeLink(e.target.value)}
                                />
                            </Form.Group>
                            <Button 
                                variant="success" 
                                onClick={() => handleGenreSelection("Custom")}
                                disabled={loading}
                                className="w-100"
                            >
                                {loading ? (
                                    <>
                                        <LoadingSpinner size={20} variant="bootstrap" />
                                        <span className="ms-2">Submitting...</span>
                                    </>
                                ) : 'Submit Custom Genre and Link'}
                            </Button>
                        </Card.Body>
                    </Card>
                </>
            )}
        </Container>
    );
};

export default GenreSelectionPage;

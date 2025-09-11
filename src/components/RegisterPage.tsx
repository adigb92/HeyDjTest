import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { post, get } from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';
import LoadingSpinner from './LoadingSpinner';
import UserContext from './UserContext';

interface RegisterPageProps {}

const RegisterPage: React.FC<RegisterPageProps> = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { updateUser, refreshAuth, clearUserContext } = useContext(UserContext);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check for eventId and djId in URL parameters
        const urlParams = new URLSearchParams(location.search);
        const eventId = urlParams.get('eventId');
        const djId = urlParams.get('djId');
        
        if (eventId && djId) {
            // Store the event data for later use
            sessionStorage.setItem('pendingEventData', JSON.stringify({
                eventId,
                djId
            }));
        } else if (djId) {
            // Store just the DJ ID for old format QR codes
            sessionStorage.setItem('pendingEventData', JSON.stringify({
                djId
            }));
        }
    }, [location]);

    useEffect(() => {
        // If we landed here via QR (pendingEventData exists), ensure no previous session (e.g., DJ) is active
        const pending = sessionStorage.getItem('pendingEventData');
        if (pending) {
            console.log('RegisterPage: QR context detected; clearing any existing auth session');
            try {
                // Clear local token immediately to prevent Authorization header on subsequent calls
                localStorage.removeItem('token');
                // Clear in-memory context
                if (clearUserContext) clearUserContext();
                // Ask backend to clear the httpOnly cookie (ignore errors)
                post('/user/logout', {}).catch(() => {});
                // Give a brief moment and refresh auth to reflect guest state
                setTimeout(() => {
                    if (typeof refreshAuth === 'function') refreshAuth();
                }, 100);
            } catch (e) {
                console.warn('RegisterPage: Failed to clear session pre-registration', e);
            }
        }
    }, [refreshAuth, clearUserContext]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            console.log('Starting registration process...');
            // Check if there's pending event data from QR scan
            const pendingEventData = sessionStorage.getItem('pendingEventData');
            console.log('Pending event data:', pendingEventData);
            
            // Register the user
            console.log('Registering user with:', { email, name });
            const response = await post<{ user: any; token: string }>('/user/register', {
                email,
                name
            });

            console.log('Registration response:', response);

            // Store the token
            localStorage.setItem('token', response.token);
            console.log('Token stored in localStorage:', response.token);

            // Fallback: also set a cookie so backend can read it from req.cookies if needed
            try {
                // Cookie for same-site requests across ports; expires in 1 day
                document.cookie = `token=${response.token}; Path=/; Max-Age=86400; SameSite=Lax`;
                console.log('Token also set in cookie (non-HTTPOnly) as fallback');
            } catch (cookieErr) {
                console.warn('Failed to set fallback cookie:', cookieErr);
            }

            // Immediately refresh auth to populate UserContext based on token
            if (typeof refreshAuth === 'function') {
                try {
                    refreshAuth();
                    // Brief delay to allow context to update
                    await new Promise(resolve => setTimeout(resolve, 150));
                } catch (e) {
                    console.warn('refreshAuth failed, continuing with local updateUser:', e);
                }
            }

            // Update the UserContext with the new user data as an immediate fallback
            if (updateUser) {
                console.log('Updating UserContext with user:', response.user);
                updateUser(response.user);
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // If we have pending event data, assign the user to the event
            if (pendingEventData) {
                const eventData = JSON.parse(pendingEventData);
                console.log('Processing pending event data:', eventData);
                
                try {
                    // If we have eventId and djId (new format)
                    if (eventData.eventId && eventData.djId) {
                        console.log('Assigning user to event with eventId and djId');
                        await post('/events/assign-user', {
                            eventId: eventData.eventId,
                            userId: response.user._id,
                            djId: eventData.djId
                        });
                        console.log('User successfully assigned to event');
                    }
                    // If we only have djId (old format), find the current live event
                    else if (eventData.djId) {
                        console.log('Finding live event for DJ:', eventData.djId);
                        // Find the current live event for this DJ
                        const eventsResponse = await get<any[]>('/events/live');
                        const liveEvents = eventsResponse.filter((event: any) => 
                            event.userId === eventData.djId
                        );
                        
                        if (liveEvents.length > 0) {
                            const currentEvent = liveEvents[0];
                            console.log('Found live event:', currentEvent._id);
                            await post('/events/assign-user', {
                                eventId: currentEvent._id || currentEvent.eventId,
                                userId: response.user._id,
                                djId: eventData.djId
                            });
                            console.log('User successfully assigned to live event');
                        }
                    }

                    // Keep pendingEventData for downstream pages (GenreSelection/Confirmation)
                    // Navigate to genre selection with context
                    const nextUrl = eventData.eventId && eventData.djId
                        ? `/genre-selection?eventId=${eventData.eventId}&djId=${eventData.djId}`
                        : '/genre-selection';
                    console.log('Navigating to genre selection:', nextUrl);
                    navigate(nextUrl);
                    return;
                } catch (assignError) {
                    console.error('Error assigning user to event:', assignError);
                    // Even if assignment fails, still navigate to genre selection
                    // The user can manually assign later. Keep context if available.
                    const nextUrl = eventData.eventId && eventData.djId
                        ? `/genre-selection?eventId=${eventData.eventId}&djId=${eventData.djId}`
                        : '/genre-selection';
                    navigate(nextUrl);
                    return;
                }
            } else {
                // Manual registration flow (not via QR): go straight to genre selection
                console.log('No pending event data, navigating to genre selection');
                navigate('/genre-selection');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setError(handleApiError(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="mt-4 mb-5 pb-5">
            <div className="text-center mb-4">
                <h1>Register</h1>
                <p className="lead">Create your account to get started</p>
            </div>

            {error && (
                <Alert variant="danger" className="mb-4">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                </Alert>
            )}

            <Form onSubmit={handleRegister} className="max-w-md mx-auto">
                <Form.Group className="mb-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Email address</Form.Label>
                    <Form.Control
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </Form.Group>

                <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <LoadingSpinner size={20} variant="bootstrap" />
                            <span className="ms-2">Registering...</span>
                        </>
                    ) : 'Register'}
                </Button>
            </Form>
        </Container>
    );
};

export default RegisterPage; 
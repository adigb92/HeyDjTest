import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import GenreContext from './GenreContext';
import { get } from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';
import LoadingSpinner from './LoadingSpinner';

interface DJResponse {
    djName: string;
}

const ConfirmationPage: React.FC = () => {
    const { genre } = useContext(GenreContext);
    const [djName, setDjName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchDjName = async () => {
            setLoading(true);
            setError('');
            try {
                // Prefer DJ id from query/session when arriving from QR flow
                const params = new URLSearchParams(location.search);
                const djId = params.get('djId');
                const eventId = params.get('eventId');
                if (eventId) {
                    try {
                        const res = await get<DJResponse>(`/events/${eventId}/dj`);
                        setDjName(res.djName);
                        return;
                    } catch (e) {
                        console.warn('Failed to fetch DJ by eventId, trying djId');
                    }
                }

                if (djId) {
                    try {
                        const res = await get<DJResponse>(`/user/dj-info/${djId}`);
                        setDjName(res.djName);
                        return;
                    } catch (e) {
                        console.warn('Failed to fetch DJ by djId from query, falling back');
                    }
                }

                // Fallback: try pendingEventData
                const pendingEventData = sessionStorage.getItem('pendingEventData');
                if (pendingEventData) {
                    try {
                        const data = JSON.parse(pendingEventData);
                        if (data.eventId) {
                            try {
                                const res = await get<DJResponse>(`/events/${data.eventId}/dj`);
                                setDjName(res.djName);
                                return;
                            } catch (_e) {}
                        }
                        if (data.djId) {
                            try {
                                const res = await get<DJResponse>(`/user/dj-info/${data.djId}`);
                                setDjName(res.djName);
                                return;
                            } catch (_e) {}
                        }
                    } catch (_e) {}
                }
            } catch (error) {
                setError(handleApiError(error, 'Failed to fetch DJ information.'));
            } finally {
                setLoading(false);
            }
        };

        fetchDjName();
    }, [location.search]);

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col xs={12} md={8} lg={6}>
                    <Card className="shadow-sm border-0">
                        <Card.Body className="text-center p-5">
                            <div className="mb-4">
                                <i className="bi bi-check-circle-fill text-success display-1"></i>
                        </div>
                            
                            <Card.Title as="h1" className="mb-4">
                                Thank You!
                            </Card.Title>
                            
                            <Card.Text className="lead mb-4">
                                Your music preference has been submitted successfully.
                            </Card.Text>
                            
                            <Card className="bg-light border-0 mb-4">
                                <Card.Body>
                                    <Card.Text className="h4 text-primary mb-0">
                                        <i className="bi bi-music-note-beamed me-2"></i>
                                        {genre}
                                    </Card.Text>
                                </Card.Body>
                            </Card>

                            {error ? (
                                <Alert variant="danger" className="mb-4">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    {error}
                                </Alert>
                            ) : (
                                <Card.Text className="mb-4">
                                    {loading ? (
                                        <div className="d-flex justify-content-center align-items-center">
                                            <LoadingSpinner size={20} variant="bootstrap" />
                                            <span className="ms-2">Loading DJ information...</span>
                    </div>
                                    ) : (
                                        <Alert variant="success" className="border-0">
                                            <i className="bi bi-person-check-fill me-2"></i>
                                            {djName ? (
                                                <>DJ <strong>{djName}</strong> has received your selection!</>
                                            ) : (
                                                <>Your selection was sent to the DJ.</>
                                            )}
                                        </Alert>
                                    )}
                                </Card.Text>
                            )}

                            <div className="d-grid gap-3">
                                <Button 
                                    variant="primary" 
                                    onClick={() => navigate('/dashboard')}
                                    size="lg"
                                    className="py-3"
                                >
                                    <i className="bi bi-house-door-fill me-2"></i>
                                    Return to Dashboard
                                </Button>
                                <Button 
                                    variant="outline-secondary" 
                                    onClick={() => navigate('/genre-selection')}
                                    size="lg"
                                    className="py-3"
                                >
                                    <i className="bi bi-music-note-list me-2"></i>
                                    Select Another Genre
                                </Button>
                </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default ConfirmationPage;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert, Form } from 'react-bootstrap';
import { get } from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';
import LoadingSpinner from './LoadingSpinner';

interface Event {
    _id: string;
    djName: string;
    eventName: string;
    eventLocation: string;
    eventDate: string;
}

const DJEventsListPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // Fetch only authenticated DJ's events
                const response = await get<Event[]>('/events/mine');
                setEvents(response);
                setError(null);
            } catch (error) {
                setError(handleApiError(error));
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 10000); // refresh every 10s to reflect deletions/updates
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Container className="mt-5">
                <Row className="justify-content-center">
                    <Col xs={12} className="text-center">
                        <LoadingSpinner size={40} variant="bootstrap" />
                        <p className="mt-3">Loading events...</p>
                    </Col>
                </Row>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-5">
                <Row className="justify-content-center">
                    <Col xs={12} md={8} lg={6}>
                        <Alert variant="danger">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            {error}
                        </Alert>
                    </Col>
                </Row>
            </Container>
        );
    }

    // Filter to past events only (before start of today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const pastEvents = events.filter(ev => new Date(ev.eventDate) < todayStart);
    const filteredEvents = pastEvents.filter(ev => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        const name = (ev.eventName || '').toLowerCase();
        const loc = (ev.eventLocation || '').toLowerCase();
        const dateStr = new Date(ev.eventDate).toLocaleDateString().toLowerCase();
        return name.includes(q) || loc.includes(q) || dateStr.includes(q);
    }).sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

    return (
        <Container className="mt-5">
            <Row className="justify-content-between align-items-center mb-4">
                <Col>
                    <h1 className="mb-0">
                        <i className="bi bi-calendar-event me-2"></i>
                        Events History
                    </h1>
                </Col>
                <Col xs="auto">
                    <Button 
                        variant="primary" 
                        onClick={() => navigate('/dj-event-creation')}
                        size="lg"
                        className="py-2"
                    >
                        <i className="bi bi-plus-circle-fill me-2"></i>
                        Create New Event
                    </Button>
                </Col>
            </Row>

            {filteredEvents.length === 0 ? (
                <Row className="justify-content-center mt-5">
                    <Col xs={12} md={8} lg={6}>
                        <Card className="text-center p-5">
                            <Card.Body>
                                <i className="bi bi-calendar-x display-4 text-muted mb-3"></i>
                                <h3>No Events Found</h3>
                                <p className="text-muted mb-4">There are no events scheduled at the moment.</p>
                                <Button 
                                    variant="primary" 
                                    onClick={() => navigate('/dj-event-creation')}
                                    size="lg"
                                >
                                    <i className="bi bi-plus-circle-fill me-2"></i>
                                    Create Your First Event
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <>
                    <Row className="mb-3">
                        <Col md={6} lg={4}>
                            <Form.Control
                                type="text"
                                placeholder="Search by name, location or date..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </Col>
                    </Row>
                    <Row>
                    {filteredEvents.map((event) => (
                        <Col key={event._id} md={6} lg={4} className="mb-4">
                            <Card className="h-100 shadow-sm hover-shadow">
                                <Card.Body>
                                    <Card.Title className="h4 mb-3">{event.eventName}</Card.Title>
                                    <Card.Subtitle className="mb-3 text-muted">
                                        <i className="bi bi-person-circle me-2"></i>
                                        {event.djName}
                                    </Card.Subtitle>
                                    <Card.Text>
                                        <p className="mb-2">
                                            <i className="bi bi-geo-alt-fill me-2"></i>
                                            {event.eventLocation}
                                        </p>
                                        <p className="mb-3">
                                            <i className="bi bi-calendar-date me-2"></i>
                                            {new Date(event.eventDate).toLocaleDateString(undefined, {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </Card.Text>
                                </Card.Body>
                                <Card.Footer className="bg-transparent border-0 pb-3">
                                    <Button 
                                        variant="outline-primary" 
                                        onClick={() => navigate(`/dj-event-edit/${event._id}`)}
                                        className="w-100"
                                    >
                                        <i className="bi bi-pencil-square me-2"></i>
                                        Edit Event
                                    </Button>
                                </Card.Footer>
                            </Card>
                        </Col>
                    ))}
                    </Row>
                </>
            )}
        </Container>
    );
};

export default DJEventsListPage;

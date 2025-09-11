import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Alert, Badge } from 'react-bootstrap';
import { get } from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';
import LoadingSpinner from './LoadingSpinner';

interface DJLiveEventPageProps {}

interface LiveEvent {
    eventName: string;
    djName: string;
    djQRCode: string;
    registeredUsers: Array<{
        userName: string;
        genreChoice: string;
        youtubeLink?: string;
    }>;
    genreStats: Array<{
        genreName: string;
        count: number;
    }>;
}

const DJLiveEventPage: React.FC<DJLiveEventPageProps> = () => {
    const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

        const fetchLiveEvents = async () => {
            try {
            const response = await get<LiveEvent[]>('/events/live');
            setLiveEvents(response);
            setError(null);
            } catch (error) {
            setError(handleApiError(error, 'Failed to fetch live events'));
        } finally {
            setLoading(false);
            }
        };

    useEffect(() => {
        fetchLiveEvents();
        // Set up polling for real-time updates
        const interval = setInterval(fetchLiveEvents, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <LoadingSpinner fullScreen variant="bootstrap" />;
    }

    return (
        <Container className="mt-4 mb-5 pb-5">
            <h1 className="mb-4">Live Events</h1>
            
            {error && (
                <Alert variant="danger" className="mb-4">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                </Alert>
            )}

            {liveEvents.length === 0 ? (
                <Alert variant="info">
                    <i className="bi bi-info-circle-fill me-2"></i>
                    No live events available at the moment.
                </Alert>
            ) : (
                <div className="live-events-container mb-5">
                    {liveEvents.map((event, index) => (
                        <Card key={index} className="mb-4 shadow-sm">
                            <Card.Body>
                                <Card.Title className="d-flex justify-content-between align-items-center">
                                    <span>{event.eventName}</span>
                                    <Badge bg="success">Live</Badge>
                                </Card.Title>
                                <Card.Subtitle className="mb-3 text-muted">
                                    Hosted by {event.djName}
                                </Card.Subtitle>

                        {event.djQRCode && (
                                    <div className="mb-4">
                                        <h5>DJ QR Code:</h5>
                                        <img 
                                            src={event.djQRCode} 
                                            alt="DJ QR Code" 
                                            className="img-fluid" 
                                            style={{ maxWidth: "150px" }} 
                                        />
                            </div>
                        )}

                                <div className="mb-4">
                                    <h5>Genre Statistics:</h5>
                                    <div className="table-responsive">
                                        <Table striped hover>
                                            <thead>
                                                <tr>
                                                    <th>Genre</th>
                                                    <th>Count</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {event.genreStats.map((stat, idx) => (
                                                    <tr key={idx}>
                                                        <td>{stat.genreName}</td>
                                                        <td>{stat.count}</td>
                                                    </tr>
                            ))}
                                            </tbody>
                                        </Table>
                                    </div>
                    </div>

                                <div>
                                    <h5>Registered Guests:</h5>
                                    <div className="table-responsive">
                                        <Table striped hover>
                                            <thead>
                                                <tr>
                                                    <th>Guest Name</th>
                                                    <th>Genre Choice</th>
                                                    <th>YouTube Link</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {event.registeredUsers.map((user, idx) => (
                                                    <tr key={idx}>
                                                        <td>{user.userName}</td>
                                                        <td>{user.genreChoice}</td>
                                                        <td>
                                                            {user.youtubeLink ? (
                                                                <a 
                                                                    href={user.youtubeLink} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <i className="bi bi-youtube text-danger me-2"></i>
                                                                    View
                                                                </a>
                                                            ) : (
                                                                <span className="text-muted">No link provided</span>
            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    ))}
                </div>
            )}
        </Container>
    );
};

export default DJLiveEventPage;

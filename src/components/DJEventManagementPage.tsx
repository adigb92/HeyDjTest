import { FunctionComponent, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';
import LoadingSpinner from './LoadingSpinner';
import { saveAs } from 'file-saver';
import { AppUser } from '../interfaces/types';
import { Container, Row, Col, Card, Button, Table, Alert, Badge, Form } from 'react-bootstrap';

interface Event {
    _id: string;
    eventName: string;
    eventLocation: string;
    eventDate: string;
    userId?: string | { _id: string };
    registeredUsers: Array<{
        userId: string;
        name: string;
        genreChoice: string;
        youtubeLink?: string;
    }>;
    genreStats: Array<{
        genreName: string;
        count: number;
    }>;
}

interface UserStats {
    totalUsers: number;
    genreChoices: number;
    males: number;
    females: number;
}

interface GenreStats {
    name: string;
    count: number;
}

interface DJEventManagementPageProps { }

const DJEventManagementPage: FunctionComponent<DJEventManagementPageProps> = () => {
    const [userStats, setUserStats] = useState<UserStats>({
        totalUsers: 0,
        genreChoices: 0,
        males: 0,
        females: 0
    });
    const [genreStats, setGenreStats] = useState<GenreStats[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const navigate = useNavigate();

    const fetchStats = useCallback(async () => {
        try {
            setIsUpdating(true);
            const [userStatsResponse] = await Promise.all([
                get<UserStats>('/user/user-stats')
            ]);
            setUserStats(userStatsResponse);
            setLastUpdated(new Date());
        } catch (error) {
            setError(handleApiError(error, 'Failed to fetch statistics'));
        } finally {
            setIsUpdating(false);
        }
    }, []);

    const fetchEvents = useCallback(async () => {
        try {
            // Prefer server-side filtered events
            const eventsResponse = await get<Event[]>('/events/mine');
            setEvents(eventsResponse);
        } catch (error) {
            setError(handleApiError(error, 'Failed to fetch events'));
        }
    }, [currentUserId]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await get<{ isAdmin: boolean, user: { _id: string } }>('/user/check-auth');
                setIsAdmin(response.isAdmin);
                const idStr = response.user && (response.user._id as unknown as { toString?: () => string });
                setCurrentUserId(idStr && typeof idStr === 'object' && 'toString' in idStr && idStr.toString ? idStr.toString() : String(response.user?._id || ''));
            } catch (error) {
                setError(handleApiError(error, 'An unknown error occurred'));
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        if (!isAdmin || !currentUserId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchStats(), fetchEvents()]);
            } catch (error) {
                setError(handleApiError(error, 'An unknown error occurred'));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isAdmin, currentUserId, fetchStats, fetchEvents]);

    useEffect(() => {
        if (!isAdmin || !currentUserId || isPolling) return;

        setIsPolling(true);
        const pollInterval = setInterval(async () => {
            await Promise.all([fetchStats(), fetchEvents()]);
        }, 5000); // Update every 5 seconds

        return () => {
            clearInterval(pollInterval);
            setIsPolling(false);
        };
    }, [isAdmin, currentUserId, fetchStats, fetchEvents, isPolling]);

    const downloadUserDetails = async () => {
        try {
            const response = await get<Blob>('/user/download-user-details');
            const blob = new Blob([response], { type: 'text/csv' });
            saveAs(blob, 'user-details.csv');
        } catch (error) {
            setError(handleApiError(error, 'An error occurred'));
        }
    };

    const editEvent = (eventId: string) => navigate(`/events/edit/${eventId}`);

    const deleteEvent = async (eventId: string) => {
        try {
            await del(`/events/${eventId}`);
            // Refresh from server to avoid stale client state
            await fetchEvents();
        } catch (error) {
            setError(handleApiError(error, 'An error occurred'));
        }
    };

    const calculatePercent = (count: number, total: number) => {
        if (!total || total <= 0) return '0%';
        return `${Math.round((count / total) * 100)}%`;
    };

    // Aggregate genre stats across this DJ's events only
    const aggregatedGenreCounts = (() => {
        const map = new Map<string, number>();
        for (const ev of events) {
            const hasStats = Array.isArray(ev.genreStats) && ev.genreStats.length > 0;
            if (hasStats) {
                for (const stat of ev.genreStats) {
                    map.set(stat.genreName, (map.get(stat.genreName) || 0) + stat.count);
                }
            } else {
                // Fallback: derive from registered users' current genre choices
                for (const ru of ev.registeredUsers || []) {
                    const choice = (ru.genreChoice || '').trim();
                    if (!choice) continue;
                    map.set(choice, (map.get(choice) || 0) + 1);
                }
            }
        }
        return map;
    })();

    const aggregatedTotal = Array.from(aggregatedGenreCounts.values()).reduce((a, b) => a + b, 0);

    if (loading) return <LoadingSpinner fullScreen variant="bootstrap" />;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (!isAdmin) return <Alert variant="warning">You do not have permission to view this page.</Alert>;

    return (
        <Container className="mb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>DJ Event Management Page</h1>
                {lastUpdated && (
                    <div className="d-flex align-items-center">
                        {isUpdating ? (
                            <Badge bg="info" className="me-2">
                                <LoadingSpinner size={12} variant="bootstrap" />
                                <span className="ms-2">Updating...</span>
                            </Badge>
                        ) : (
                            <Badge bg="success" className="me-2">
                                <i className="bi bi-check-circle-fill me-1"></i>
                                Live
                            </Badge>
                        )}
                        <small className="text-muted">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </small>
                    </div>
                )}
            </div>
            
            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Card.Title>User Statistics</Card.Title>
                        {isUpdating && (
                            <LoadingSpinner size={16} variant="bootstrap" />
                        )}
                    </div>
                    <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>Total Users</th>
                        <th>Genre Choices</th>
                        <th>Males</th>
                        <th>Females</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{userStats.totalUsers}</td>
                        <td>{userStats.genreChoices}</td>
                        <td>{userStats.males}</td>
                        <td>{userStats.females}</td>
                    </tr>
                </tbody>
                    </Table>
                </Card.Body>
            </Card>

            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Card.Title>Genre Statistics</Card.Title>
                        {isUpdating && (
                            <LoadingSpinner size={16} variant="bootstrap" />
                        )}
                    </div>
                    <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>Genre</th>
                                <th>Count</th>
                                <th>Percent</th>
                    </tr>
                </thead>
                <tbody>
                            {Array.from(aggregatedGenreCounts.entries()).map(([name, count], index) => (
                        <tr key={index}>
                                    <td>{name}</td>
                                    <td>{count}</td>
                                    <td>{calculatePercent(count, aggregatedTotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Card.Title className="mb-0">Events History</Card.Title>
                        <Button variant="primary" onClick={downloadUserDetails}>
                            <i className="bi bi-download me-2"></i>
                            Download User Details
                        </Button>
                    </div>
                    <Form className="mb-3">
                        <Form.Control
                            type="text"
                            placeholder="Search events by name or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </Form>
                    {(events.filter(ev => {
                        const q = searchQuery.trim().toLowerCase();
                        if (!q) return true;
                        const name = (ev.eventName || '').toLowerCase();
                        const loc = (ev.eventLocation || '').toLowerCase();
                        const dateStr = new Date(ev.eventDate).toLocaleDateString().toLowerCase();
                        return name.includes(q) || loc.includes(q) || dateStr.includes(q);
                    })).map((event) => (
                        <Card key={event._id} className="mb-4">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <h5 className="mb-1">{event.eventName}</h5>
                                        <p className="text-muted mb-0">
                                            {event.eventLocation} - {new Date(event.eventDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <Button
                                            variant="primary"
                                            onClick={() => editEvent(event._id)}
                                            className="me-2"
                                        >
                                            <i className="bi bi-pencil-fill me-2"></i>
                                            Edit
                                        </Button>
                                        <Button
                                            variant="danger"
                                            onClick={() => deleteEvent(event._id)}
                                        >
                                            <i className="bi bi-trash-fill me-2"></i>
                                            Delete
                                        </Button>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <h6>Event Genre Statistics:</h6>
                                    <Table striped hover responsive size="sm">
                                        <thead>
                                            <tr>
                                                <th>Genre</th>
                                                <th>Count</th>
                                                <th>Percent</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const total = (event.genreStats || []).reduce((sum, s) => sum + s.count, 0);
                                                return (event.genreStats || []).map((stat, idx) => (
                                                    <tr key={idx}>
                                                        <td>{stat.genreName}</td>
                                                        <td>{stat.count}</td>
                                                        <td>{calculatePercent(stat.count, total)}</td>
                                                    </tr>
                                                ));
                                            })()}
                                        </tbody>
                                    </Table>
                                </div>

                                <div>
                                    <h6>Registered Guests:</h6>
                                    <Table striped hover responsive size="sm">
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
                                                    <td>{user.name}</td>
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
                            </Card.Body>
                        </Card>
                    ))}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default DJEventManagementPage;
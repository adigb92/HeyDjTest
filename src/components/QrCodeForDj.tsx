import { FunctionComponent, useContext, useEffect, useState } from "react";
import UserContext from "./UserContext";
import { Card, Container, Alert, Button, Form, Row, Col } from 'react-bootstrap';
import { get } from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';
import LoadingSpinner from './LoadingSpinner';

interface QrCodeForDjProps { }

interface Event {
    _id: string;
    eventName: string;
    eventLocation: string;
    eventDate: string;
}

const QrCodeForDj: FunctionComponent<QrCodeForDjProps> = () => {
    const [qrCode, setQrCode] = useState("");
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const userContext = useContext(UserContext);

    useEffect(() => {
        const fetchEvents = async () => {
            if (userContext?.user?.isAdmin) {
                try {
                    setIsLoading(true);
                    const response = await get<Event[]>(`/events/user/${userContext.user._id}`);
                    setEvents(response);
                    setError(null);
                } catch (error) {
                    setError(handleApiError(error, 'Failed to load events. Please try again.'));
                } finally {
                    setIsLoading(false);
        }
            }
        };

        fetchEvents();
    }, [userContext]);

    const handleGenerateQrCode = async () => {
        if (!selectedEventId) {
            setError('Please select an event first.');
            return;
        }

        try {
            setIsGenerating(true);
            setError(null);
            const response = await get<{ qrCode: string }>(`/events/${selectedEventId}/qr-code`);
            setQrCode(response.qrCode);
        } catch (error) {
            setError(handleApiError(error, 'Failed to generate QR code. Please try again.'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadQrCode = () => {
        if (qrCode) {
            const link = document.createElement('a');
            link.href = qrCode;
            const selectedEvent = events.find(e => e._id === selectedEventId);
            link.download = `dj-qr-code-${selectedEvent?.eventName || 'event'}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    if (!userContext?.user?.isAdmin) {
        return (
            <Container className="mt-4">
                <Alert variant="warning">
                    You need to be a DJ to view this page.
                </Alert>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <Card className="shadow">
                <Card.Header className="bg-primary text-white">
                    <h2 className="mb-0">Generate Event QR Code</h2>
                </Card.Header>
                <Card.Body>
                    {isLoading ? (
                        <LoadingSpinner size={40} variant="bootstrap" />
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : (
                        <>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Select Event</Form.Label>
                                        <Form.Select 
                                            value={selectedEventId} 
                                            onChange={(e) => setSelectedEventId(e.target.value)}
                                        >
                                            <option value="">Choose an event...</option>
                                            {events.map((event) => (
                                                <option key={event._id} value={event._id}>
                                                    {event.eventName} - {new Date(event.eventDate).toLocaleDateString()}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                    
                                    <Button 
                                        variant="primary" 
                                        onClick={handleGenerateQrCode}
                                        disabled={!selectedEventId || isGenerating}
                                        className="mb-3"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <LoadingSpinner size={20} variant="bootstrap" />
                                                <span className="ms-2">Generating...</span>
                                            </>
                                        ) : 'Generate QR Code'}
                                    </Button>
                                </Col>
                                
                                <Col md={6}>
                                    {qrCode && (
                                        <div className="text-center">
                                            <img 
                                                src={qrCode} 
                                                alt="Event QR Code" 
                                                className="img-fluid mb-3"
                                                style={{ maxWidth: '250px' }}
                                            />
                                            <div className="mt-3">
                                                <Button 
                                                    variant="success" 
                                                    onClick={handleDownloadQrCode}
                                                    className="me-2"
                                                >
                                                    Download QR Code
                                                </Button>
                                                <Button 
                                                    variant="primary" 
                                                    onClick={() => window.print()}
                                                >
                                                    Print QR Code
                                                </Button>
                                            </div>
        </div>
                                    )}
                                </Col>
                            </Row>
                            
                            {qrCode && (
                                <Alert variant="info" className="mt-3">
                                    <h5>Instructions for Guests:</h5>
                                    <p className="mb-0">
                                        Ask your guests to scan this QR code using their phone's camera or a QR code scanner app.
                                        This will redirect them to the app's registration page and automatically assign them to this event.
                                    </p>
                                </Alert>
                            )}
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default QrCodeForDj;

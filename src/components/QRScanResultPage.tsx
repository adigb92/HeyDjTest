import { FunctionComponent, useEffect, useState } from "react";
import { get } from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';
import LoadingSpinner from './LoadingSpinner';
import { Alert, Card, Container } from 'react-bootstrap';

interface QRScanResultPageProps {
    qrCodeIdentifier: string;
}

interface DJInfo {
    djName: string;
    eventName: string;
    eventLocation: string;
    eventDate: string;
}

const QRScanResultPage: FunctionComponent<QRScanResultPageProps> = ({ qrCodeIdentifier }) => {
    const [djInfo, setDjInfo] = useState<DJInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDjInfo = async () => {
            try {
                const response = await get<DJInfo>(`/user/dj-info/${qrCodeIdentifier}`);
                setDjInfo(response);
                setError(null);
            } catch (error) {
                setError(handleApiError(error, 'Error fetching DJ information.'));
            } finally {
                setLoading(false);
            }
        };

        fetchDjInfo();
    }, [qrCodeIdentifier]);

    return (
        <Container className="mt-4">
            <Card className="shadow">
                <Card.Header className="bg-primary text-white">
                    <h2 className="mb-0">Event Information</h2>
                </Card.Header>
                <Card.Body>
                    {loading ? (
                        <div className="text-center">
                            <LoadingSpinner size={40} variant="bootstrap" />
                        </div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
            ) : djInfo ? (
                <div>
                            <Alert variant="success">
                                <h4>You are attending an event by DJ {djInfo.djName}!</h4>
                                <hr />
                                <p><strong>Event Name:</strong> {djInfo.eventName}</p>
                                <p><strong>Location:</strong> {djInfo.eventLocation}</p>
                                <p><strong>Date:</strong> {new Date(djInfo.eventDate).toLocaleString()}</p>
                            </Alert>
                </div>
                    ) : null}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default QRScanResultPage;

import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Modal } from 'react-bootstrap';
import { handleApiError } from '../utils/errorHandler';
import LoadingSpinner from './LoadingSpinner';

interface QRScannerProps {
    show: boolean;
    onHide: () => void;
}

interface QRData {
    appUrl: string;
    eventId: string;
    djId: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ show, onHide }) => {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;

        if (show) {
            scanner = new Html5QrcodeScanner('qr-reader', {
                qrbox: {
                    width: 250,
                    height: 250
                },
                fps: 10,
            }, false);

            scanner.render(handleScan, handleError);
        }

        return () => {
            if (scanner) {
                scanner.clear();
            }
        };
    }, [show]);

    const handleScan = async (decodedText: string) => {
        try {
            setLoading(true);
            setError(null);

            // Parse the QR code data
            const qrData = JSON.parse(decodedText) as QRData;
            
            // Store the event data in sessionStorage for later use
            sessionStorage.setItem('pendingEventData', JSON.stringify({
                eventId: qrData.eventId,
                djId: qrData.djId
            }));

            // Redirect to the registration page
            window.location.href = qrData.appUrl;
        } catch (error) {
            setError(handleApiError(error, 'Invalid QR code format'));
        } finally {
            setLoading(false);
        }
    };

    const handleError = (error: string) => {
        setError(error);
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Scan QR Code</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <Alert variant="danger" className="mb-3">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {error}
                    </Alert>
                )}
                
                {loading ? (
                    <div className="text-center p-4">
                        <LoadingSpinner size={40} variant="bootstrap" />
                        <p className="mt-2">Processing QR code...</p>
                    </div>
                ) : (
                    <div id="qr-reader" className="w-100"></div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default QRScanner; 
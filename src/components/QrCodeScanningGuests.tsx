import React, { FunctionComponent, useEffect, useRef, useState, useContext } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Container } from 'react-bootstrap';
import { post, get } from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';
import LoadingSpinner from './LoadingSpinner';
import UserContext from './UserContext';

interface QrCodeScanningGuestsProps { }

interface ScanResult {
    message: string;
    eventName: string;
    eventLocation: string;
    eventDate: string;
}

const QrCodeScanningGuests: FunctionComponent<QrCodeScanningGuestsProps> = () => {
    const qrRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { user, clearUserContext } = useContext(UserContext);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const processDecodedText = async (decodedText: string) => {
        console.log('QR Code scanned:', decodedText);
        console.log('Current user context:', user);
        
        setIsScanning(false);
        setIsLoading(true);
        try {
            // Check if the scanned text is a URL (new format)
            if (decodedText.startsWith('http')) {
                console.log('Processing new format QR code (URL)');
                // Extract eventId and djId from URL parameters
                const url = new URL(decodedText);
                const eventId = url.searchParams.get('eventId');
                const djId = url.searchParams.get('djId');
                
                console.log('Extracted eventId:', eventId, 'djId:', djId);
                
                if (eventId && djId) {
                    // If user is already logged in, directly assign them to the event
                    if (user && user._id) {
                        console.log('User is logged in, checking if already registered');
                        try {
                            // Check if user is already registered for this event
                            const eventsResponse = await get<any[]>('/events/live');
                            const currentEvent = eventsResponse.find((event: any) => 
                                event._id === eventId
                            );
                            
                            if (currentEvent) {
                                const isAlreadyRegistered = currentEvent.registeredUsers.some(
                                    (ru: any) => ru.userId === user._id
                                );
                                
                                if (isAlreadyRegistered) {
                                    console.log('User is already registered for this event');
                                    // Navigate directly to genre selection
                                    navigate('/genre-selection');
                                    return;
                                }
                            }
                            
                            console.log('User not registered for this event, assigning now');
                            await post('/events/assign-user', {
                                eventId,
                                userId: user._id,
                                djId
                            });
                            
                            // Navigate to genre selection
                            navigate('/genre-selection');
                            return;
                        } catch (error) {
                            console.error('Error assigning user to event:', error);
                            setError(handleApiError(error, 'Failed to assign to event'));
                            setIsLoading(false);
                            return;
                        }
                    } else {
                        console.log('User is not logged in, redirecting to registration');
                        // Clear any existing user context to ensure clean state
                        clearUserContext();
                        
                        // Store the event data and redirect to registration
                        sessionStorage.setItem('pendingEventData', JSON.stringify({
                            eventId,
                            djId
                        }));
                        
                        // Redirect to the registration page
                        window.location.href = decodedText;
                        return;
                    }
                }
            }
            
            // Handle old format (user ID) - redirect to registration with DJ ID
            console.log('Processing old format QR code (user ID)');
            // Check if the user ID corresponds to a DJ
            try {
                const response = await get<{ djName: string }>('/user/dj-info/' + decodedText);
                console.log('DJ info response:', response);
                
                if (response.djName) {
                    // If user is already logged in, find live event and assign them
                    if (user && user._id) {
                        console.log('User is logged in, finding live event');
                        try {
                            // Find the current live event for this DJ
                            const eventsResponse = await get<any[]>('/events/live');
                            const liveEvents = eventsResponse.filter((event: any) => 
                                event.userId === decodedText
                            );
                            
                            if (liveEvents.length > 0) {
                                const currentEvent = liveEvents[0];
                                
                                // Check if user is already registered for this event
                                const isAlreadyRegistered = currentEvent.registeredUsers.some(
                                    (ru: any) => ru.userId === user._id
                                );
                                
                                if (isAlreadyRegistered) {
                                    console.log('User is already registered for this event');
                                    // Navigate directly to genre selection
                                    navigate('/genre-selection');
                                    return;
                                }
                                
                                console.log('User not registered for this event, assigning now');
                                await post('/events/assign-user', {
                                    eventId: currentEvent._id || currentEvent.eventId,
                                    userId: user._id,
                                    djId: decodedText
                                });
                                
                                // Navigate to genre selection
                                navigate('/genre-selection');
                                return;
                            } else {
                                setError('No live events found for this DJ');
                                setIsLoading(false);
                                return;
                            }
                        } catch (error) {
                            console.error('Error finding live event:', error);
                            setError(handleApiError(error, 'Failed to find live event'));
                            setIsLoading(false);
                            return;
                        }
                    } else {
                        console.log('User is not logged in, redirecting to registration with DJ ID');
                        // Clear any existing user context to ensure clean state
                        clearUserContext();
                        
                        // This is a DJ's QR code, redirect to registration
                        const appUrl = window.location.origin;
                        const registerUrl = `${appUrl}/register?djId=${decodedText}`;
                        
                        // Store the DJ ID for later use
                        sessionStorage.setItem('pendingEventData', JSON.stringify({
                            djId: decodedText
                        }));
                        
                        // Redirect to registration
                        window.location.href = registerUrl;
                        return;
                    }
                } else {
                    // If it's not a DJ and user is not logged in, redirect to registration
                    if (!user || !user._id) {
                        setError('This QR code is not recognized. Please contact the event organizer.');
                        setIsLoading(false);
                        return;
                    }
                    
                    // If user is logged in but QR code is not recognized, show error
                    setError('This QR code is not recognized. Please contact the event organizer.');
                    setIsLoading(false);
                    return;
                }
            } catch (djError) {
                console.error('Error checking DJ info:', djError);
                // If there's an error checking DJ info, redirect non-logged-in users to registration
                if (!user || !user._id) {
                    setError('Unable to verify QR code. Please contact the event organizer.');
                    setIsLoading(false);
                    return;
                }
                
                // For logged-in users, show error
                setError('Unable to verify QR code. Please contact the event organizer.');
                setIsLoading(false);
                return;
            }
        } catch (error) {
            console.error('Error in QR code processing:', error);
            setError(handleApiError(error, 'Failed to process QR code scan'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let html5QrCodeScanner: Html5QrcodeScanner | null = null;

        if (qrRef.current && isScanning) {
            html5QrCodeScanner = new Html5QrcodeScanner(
                "qr-reader",
                { fps: 10, qrbox: 250 },
                false
            );

            const qrCodeSuccessCallback = async (decodedText: string) => {
                await processDecodedText(decodedText);
            };

            html5QrCodeScanner.render(qrCodeSuccessCallback, (error: any) => {
                // Ignore routine frame failures while scanning; only surface real errors
                const message = typeof error === 'string' ? error : (error?.message || '');
                const name = (error && error.name) ? error.name : '';
                if (name === 'NotFoundException' || message.includes('NotFoundException')) {
                    // Expected when no QR is detected in the current frame; keep scanning
                    return;
                }
                if (message.includes('Camera access')) {
                    setError('Camera access was denied. Please allow camera permissions and try again.');
                    return;
                }
                console.warn('QR Code scanning warning:', error);
                // Do not set a hard error here to avoid stopping the scanner on transient issues
            });
        }

        return () => {
            if (html5QrCodeScanner) {
                html5QrCodeScanner.clear().catch((error: any) => 
                    setError(handleApiError(error, 'Failed to clear QR Scanner'))
                );
            }
        };
    }, [isScanning, user, navigate, clearUserContext]);

    const handleScanAgain = () => {
        setScanResult(null);
        setError(null);
        setIsScanning(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setError(null);
        setIsLoading(true);
        try {
            // Use a temporary element id for Html5Qrcode constructor
            const elementId = 'qr-file-reader';
            // Ensure the container exists in the DOM
            let container = document.getElementById(elementId);
            if (!container) {
                container = document.createElement('div');
                container.id = elementId;
                container.style.display = 'none';
                document.body.appendChild(container);
            }
            const html5QrCode = new Html5Qrcode(elementId);
            const decodedText = await html5QrCode.scanFile(file, true);
            await processDecodedText(decodedText);
            try { await html5QrCode.clear(); } catch (_e) { /* ignore */ }
        } catch (err) {
            console.error('File upload scan error:', err);
            const message = (err as any)?.message || String(err);
            if (message.includes('NotFound')) {
                setError('Could not detect a QR code in the selected image. Please try a clearer image.');
            } else {
                setError(handleApiError(err, 'Failed to scan QR image'));
            }
        } finally {
            setIsLoading(false);
            // Reset the file input so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <Container className="mt-4">
            <Card className="shadow">
                <Card.Header className="bg-primary text-white">
                    <h2 className="mb-0">Scan DJ's QR Code</h2>
                </Card.Header>
                <Card.Body>
                    {isScanning ? (
                        <div>
                            <div id="qr-reader" ref={qrRef}></div>
                            <div className="text-center mt-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                    Or upload a QR image
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            {isLoading ? (
                                <LoadingSpinner size={40} variant="bootstrap" />
                            ) : error ? (
                                <Alert variant="danger">
                                    {error}
                                    <Button variant="primary" className="mt-3" onClick={handleScanAgain}>
                                        Scan Again
                                    </Button>
                                </Alert>
                            ) : scanResult ? (
        <div>
                                    <Alert variant="success">
                                        <h4>{scanResult.message}</h4>
                                        <hr />
                                        <p><strong>Event:</strong> {scanResult.eventName}</p>
                                        <p><strong>Location:</strong> {scanResult.eventLocation}</p>
                                        <p><strong>Date:</strong> {new Date(scanResult.eventDate).toLocaleString()}</p>
                                    </Alert>
                                    <Button variant="primary" onClick={handleScanAgain}>
                                        Scan Another Code
                                    </Button>
                                </div>
                            ) : null}
        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default QrCodeScanningGuests;

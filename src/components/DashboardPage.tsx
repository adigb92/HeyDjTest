import { FunctionComponent, useContext } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from './UserContext';
import LoadingSpinner from './LoadingSpinner';
import { Container, Row, Col, Card, Button, ListGroup } from 'react-bootstrap';

interface DashboardPageProps { }

const DashboardPage: FunctionComponent<DashboardPageProps> = () => {
    const { user, loading } = useContext(UserContext);
    const navigate = useNavigate();

    if (loading) {
        return (
            <Container className="mt-5">
                <Row className="justify-content-center">
                    <Col xs={12} className="text-center">
                        <LoadingSpinner size={40} variant="bootstrap" />
                        <p className="mt-3">Loading your profile...</p>
                    </Col>
                </Row>
            </Container>
        );
    }

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col xs={12} md={8}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <Card.Title as="h1" className="text-center mb-4">Welcome, {user.name}!</Card.Title>
                            
                            <ListGroup className="mb-4">
                                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 className="mb-1">Select Music Genre</h5>
                                        <p className="text-muted mb-0">Choose your preferred music genre for the event</p>
                                    </div>
                                    <Button 
                                        variant="primary"
                                        onClick={() => navigate('/genre-selection')}
                                    >
                                        Select Genre
                                    </Button>
                                </ListGroup.Item>

                                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 className="mb-1">Complete Profile</h5>
                                        <p className="text-muted mb-0">Update your profile information</p>
                                    </div>
                                    <Button 
                                        variant="outline-primary"
                                        onClick={() => navigate('/profile-completion')}
                                    >
                                        Update Profile
                                    </Button>
                                </ListGroup.Item>
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default DashboardPage; 
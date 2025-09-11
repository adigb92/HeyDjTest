import React, { FunctionComponent, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useUser } from './UserContext';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';

const NavigationPage: FunctionComponent = () => {
    const navigate = useNavigate();
    const { user, logout } = useUser();

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logout successful');
            navigate('/');
        } catch (err) {
            toast.error((err as any).message);
        }
    };

    return (
        <Navbar bg="light" expand="lg">
            <Container>
                <Navbar.Brand as={Link} to="/">
                    Hey DJ
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ml-auto">
                        {user ? (
                            <>
                                <Nav.Link as={Link} to="/genre-selection">
                                    Genre Selection
                                </Nav.Link>
                                {user.isAdmin && (
                                    <>
                                        <Nav.Link as={Link} to="/dj-event-creation">
                                            DJ Event Creation
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/dj-event-management">
                                            DJ Event Management
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/dj-live-event">
                                            DJ Live Event
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/dj-events-list">
                                            DJ Events List
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/dj-qr-code">
                                            My QR Code
                                        </Nav.Link>
                                    </>
                                )}
                                {!user.isAdmin && (
                                    <Nav.Link as={Link} to="/scan-qr">
                                        Assign to a DJ
                                    </Nav.Link>
                                )}
                                <Button variant="outline-danger" onClick={handleLogout}>
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Nav.Link as={Link} to="/">
                                    Login
                                </Nav.Link>
                                <Nav.Link as={Link} to="/register">
                                    Register
                                </Nav.Link>
                                <Nav.Link as={Link} to="/scan-qr">
                                    Assign to a DJ
                                </Nav.Link>
                            </>
                        )}
                        <Nav.Link as={Link} to="/privacy-policy">
                            Privacy Policy
                        </Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default NavigationPage;

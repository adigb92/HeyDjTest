import { FunctionComponent, useContext } from "react";
import { Container, Navbar, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import UserContext from './UserContext';
import { AppUser } from '../interfaces/types';
import { FaFacebookSquare, FaInstagram } from 'react-icons/fa';

interface FooterProps {

}

const Footer: FunctionComponent<FooterProps> = () => {
    const userContext = useContext(UserContext);
    const user: AppUser | null = userContext?.user || null;

    return (
        <Navbar bg="dark" variant="dark" expand="lg" fixed="bottom" style={{ zIndex: 1000 }}>
            <Container>
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
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <Nav.Link as={Link} to="/">
                                    Login
                                </Nav.Link>
                                <Nav.Link as={Link} to="/register">
                                    Register
                                </Nav.Link>
                            </>
                        )}
                        <Nav.Link href="https://www.facebook.com" target="_blank">
                            <FaFacebookSquare />
                        </Nav.Link>
                        <Nav.Link href="https://www.instagram.com/adigabay92/" target="_blank">
                            <FaInstagram />
                        </Nav.Link>
                    </Nav>
                </Navbar.Collapse>
                <Navbar.Text className="text-light">
                    Developed by Adi Gabay
                </Navbar.Text>
            </Container>
        </Navbar>
    );
}

export default Footer;

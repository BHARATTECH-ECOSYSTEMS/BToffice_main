import React from 'react';
import { Container, Row, Col, Button, Navbar, Nav } from 'react-bootstrap';
import { useNavigate } from "react-router-dom";
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate(); // ✅ FIX: inside component

    return (
        <div className="landing-page">
            <Navbar bg="dark" variant="dark" expand="lg">
                <Container>
                    <Navbar.Brand href="#home">Organization Name</Navbar.Brand>
                    <Navbar.Toggle />
                    <Navbar.Collapse>
                        <Nav className="ms-auto">
                            <Nav.Link href="#home">Home</Nav.Link>
                            <Nav.Link href="#about">About</Nav.Link>
                            <Nav.Link href="#services">Services</Nav.Link>
                            <Nav.Link href="#contact">Contact</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <section className="hero-section">
                <Container>
                    <Row className="align-items-center">
                        <Col md={6}>
                            <h1>Welcome to Our Organization</h1>
                            <p>We are dedicated to making a difference.</p>

                            {/* ✅ WORKING BUTTON */}
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={() => navigate("/chat")}
                            >
                                Open Chat
                            </Button>
                        </Col>

                        <Col md={6}>
                            <img src="https://via.placeholder.com/500" alt="Hero" className="img-fluid" />
                        </Col>
                    </Row>
                </Container>
            </section>

            <section id="about" className="about-section py-5">
                <Container>
                    <Row>
                        <Col md={6}>
                            <h2>About Us</h2>
                            <p>Our organization has been serving the community for many years. We strive to provide the best services and support to those in need.</p>
                        </Col>
                        <Col md={6}>
                            <img src="https://via.placeholder.com/500" alt="About Us" className="img-fluid" />
                        </Col>
                    </Row>
                </Container>
            </section>

            <section id="services" className="services-section py-5 bg-light">
                <Container>
                    <h2 className="text-center mb-5">Our Services</h2>
                    <Row>
                        <Col md={4}>
                            <div className="service-card text-center p-4">
                                <img src="https://via.placeholder.com/150" alt="Service 1" className="mb-3" />
                                <h4>Service One</h4>
                                <p>Description of the first service we offer.</p>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="service-card text-center p-4">
                                <img src="https://via.placeholder.com/150" alt="Service 2" className="mb-3" />
                                <h4>Service Two</h4>
                                <p>Description of the second service we offer.</p>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="service-card text-center p-4">
                                <img src="https://via.placeholder.com/150" alt="Service 3" className="mb-3" />
                                <h4>Service Three</h4>
                                <p>Description of the third service we offer.</p>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            <section id="contact" className="contact-section py-5">
                <Container>
                    <h2 className="text-center mb-5">Contact Us</h2>
                    <Row>
                        <Col md={6}>
                            <form>
                                <div className="mb-3">
                                    <label htmlFor="name" className="form-label">Name</label>
                                    <input type="text" className="form-control" id="name" />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="email" className="form-label">Email</label>
                                    <input type="email" className="form-control" id="email" />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="message" className="form-label">Message</label>
                                    <textarea className="form-control" id="message" rows="3"></textarea>
                                </div>
                                <Button variant="primary" type="submit">Submit</Button>
                            </form>
                        </Col>
                        <Col md={6}>
                            <h4>Our Office</h4>
                            <p>123 Organization St, City, Country</p>
                            <p>Email: info@organization.com</p>
                            <p>Phone: +123 456 7890</p>
                        </Col>
                    </Row>
                </Container>
            </section>

            <footer className="bg-dark text-white text-center py-4">
                <Container>
                    <p>&copy; 2023 Organization Name. All Rights Reserved.</p>
                </Container>
            </footer>
        </div>
    );
};

export default LandingPage;
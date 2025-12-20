import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import './Home.css';

export default function Home() {
    const [tripType, setTripType] = useState('roundtrip');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [departDate, setDepartDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        const query = [from, to].filter(Boolean).join(' ').trim();
        const searchParam = encodeURIComponent(query);
        navigate(`/flights${searchParam ? `?search=${searchParam}` : ''}`);
    };

    return (
        <div className="home">
            {/* Hero Section with Background Image */}
            <header className="hero">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <h1>Your Journey Begins Here</h1>
                    <p className="hero-subtitle">Experience world-class service with our premium airline. Connecting you to over 120 destinations across the globe.</p>
                    <div className="hero-ctas">
                        <Link to="/book" className="hero-cta primary">Book Your Flight</Link>
                        <Link to="/flights" className="hero-cta secondary">View All Flights</Link>
                    </div>
                </div>
            </header>

            {/* Search Section */}
            <section className="search-section">
                <div className="container">
                    <form onSubmit={handleSearch} className="search-form">
                        <div className="trip-options">
                            <label>
                                <input
                                    type="radio"
                                    value="roundtrip"
                                    checked={tripType === 'roundtrip'}
                                    onChange={(e) => setTripType(e.target.value)}
                                />
                                Round Trip
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    value="oneway"
                                    checked={tripType === 'oneway'}
                                    onChange={(e) => setTripType(e.target.value)}
                                />
                                One Way
                            </label>
                        </div>

                        <div className="search-inputs">
                            <input
                                type="text"
                                placeholder="From (City or Airport)"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="To (City or Airport)"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                            />
                            <input
                                type="date"
                                placeholder="Departure Date"
                                value={departDate}
                                onChange={(e) => setDepartDate(e.target.value)}
                            />
                            {tripType === 'roundtrip' && (
                                <input
                                    type="date"
                                    placeholder="Return Date"
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                />
                            )}
                            <button type="submit" className="search-btn">
                                Search Flights
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-section">
                <div className="container">
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-number">500+</div>
                            <div className="stat-label">Daily Flights</div>
                            <div className="stat-desc">Connecting cities worldwide</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number">120+</div>
                            <div className="stat-label">Destinations</div>
                            <div className="stat-desc">Across 6 continents</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number">98%</div>
                            <div className="stat-label">On-Time Performance</div>
                            <div className="stat-desc">Industry-leading reliability</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number">15M+</div>
                            <div className="stat-label">Passengers Annually</div>
                            <div className="stat-desc">Trusted by millions</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="container">
                    <h2 className="section-heading">Why Choose Us</h2>
                    <p className="section-subtitle">Experience the difference with our premium services and commitment to excellence</p>
                    <div className="features-grid">
                        <div className="feature-item">
                            <div className="feature-icon">
                                <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop" alt="Comfortable seating" />
                            </div>
                            <h3>Premium Comfort</h3>
                            <p>Spacious seating with extra legroom, ergonomic design, and adjustable headrests for maximum comfort on long-haul flights.</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">
                                <img src="https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=400&h=300&fit=crop" alt="In-flight dining" />
                            </div>
                            <h3>Gourmet Dining</h3>
                            <p>Enjoy chef-curated meals prepared with fresh, locally-sourced ingredients. Special dietary requirements accommodated.</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">
                                <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop" alt="Entertainment system" />
                            </div>
                            <h3>Entertainment</h3>
                            <p>State-of-the-art in-flight entertainment with hundreds of movies, TV shows, music, and games on personal screens.</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">
                                <img src="https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=400&h=300&fit=crop" alt="WiFi connectivity" />
                            </div>
                            <h3>Free WiFi</h3>
                            <p>Stay connected at 35,000 feet with complimentary high-speed WiFi on all flights. Stream, work, or browse seamlessly.</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">
                                <img src="https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=400&h=300&fit=crop" alt="Loyalty program" />
                            </div>
                            <h3>Loyalty Rewards</h3>
                            <p>Earn miles with every flight. Redeem points for upgrades, free flights, and exclusive partner benefits worldwide.</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">
                                <img src="https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=400&h=300&fit=crop" alt="24/7 support" />
                            </div>
                            <h3>24/7 Support</h3>
                            <p>Round-the-clock customer service. Our dedicated team is always ready to assist with bookings, changes, or inquiries.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Popular Destinations */}
            <section className="destinations-section">
                <div className="container">
                    <h2 className="section-heading">Popular Destinations</h2>
                    <p className="section-subtitle">Discover amazing places around the world</p>
                    <div className="destinations-grid">
                        <div className="destination-card">
                            <div className="dest-image" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop)'}}>
                                <div className="dest-overlay"></div>
                            </div>
                            <div className="dest-content">
                                <h3>Honolulu, Hawaii</h3>
                                <p>Paradise awaits with pristine beaches and tropical beauty</p>
                                <div className="dest-price">From $299</div>
                            </div>
                        </div>
                        <div className="destination-card">
                            <div className="dest-image" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=400&fit=crop)'}}>
                                <div className="dest-overlay"></div>
                            </div>
                            <div className="dest-content">
                                <h3>New York, USA</h3>
                                <p>The city that never sleeps - experience the Big Apple</p>
                                <div className="dest-price">From $199</div>
                            </div>
                        </div>
                        <div className="destination-card">
                            <div className="dest-image" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&h=400&fit=crop)'}}>
                                <div className="dest-overlay"></div>
                            </div>
                            <div className="dest-content">
                                <h3>Phuket, Thailand</h3>
                                <p>Exotic beaches and vibrant culture in Southeast Asia</p>
                                <div className="dest-price">From $399</div>
                            </div>
                        </div>
                        <div className="destination-card">
                            <div className="dest-image" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop)'}}>
                                <div className="dest-overlay"></div>
                            </div>
                            <div className="dest-content">
                                <h3>Dubai, UAE</h3>
                                <p>Luxury and innovation in the heart of the Middle East</p>
                                <div className="dest-price">From $499</div>
                            </div>
                        </div>
                        <div className="destination-card">
                            <div className="dest-image" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&h=400&fit=crop)'}}>
                                <div className="dest-overlay"></div>
                            </div>
                            <div className="dest-content">
                                <h3>Paris, France</h3>
                                <p>The City of Light - romance, culture, and history</p>
                                <div className="dest-price">From $349</div>
                            </div>
                        </div>
                        <div className="destination-card">
                            <div className="dest-image" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop)'}}>
                                <div className="dest-overlay"></div>
                            </div>
                            <div className="dest-content">
                                <h3>Tokyo, Japan</h3>
                                <p>Where tradition meets cutting-edge technology</p>
                                <div className="dest-price">From $449</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="about-section">
                <div className="container">
                    <div className="about-content">
                        <div className="about-text">
                            <h2>About Our Airline</h2>
                            <p>With over 30 years of experience in the aviation industry, we have built a reputation for excellence, safety, and customer satisfaction. Our modern fleet of aircraft, trained professionals, and commitment to innovation make us a leader in commercial aviation.</p>
                            <p>We operate one of the youngest and most fuel-efficient fleets in the industry, reducing our environmental impact while providing superior comfort and reliability. Our pilots and cabin crew undergo rigorous training programs to ensure the highest standards of safety and service.</p>
                            <div className="about-features">
                                <div className="about-feature">
                                    <strong>Fleet Size:</strong> 150+ modern aircraft
                                </div>
                                <div className="about-feature">
                                    <strong>Safety Rating:</strong> 5-star from IATA
                                </div>
                                <div className="about-feature">
                                    <strong>Carbon Neutral:</strong> Committed to net-zero by 2030
                                </div>
                            </div>
                        </div>
                        <div className="about-image">
                            <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop" alt="Modern aircraft" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section className="services-section">
                <div className="container">
                    <h2 className="section-heading">Our Services</h2>
                    <p className="section-subtitle">Comprehensive travel solutions for every need</p>
                    <div className="services-grid">
                        <div className="service-card">
                            <div className="service-icon">✈️</div>
                            <h3>Flight Booking</h3>
                            <p>Easy online booking with flexible date options, seat selection, and instant confirmation.</p>
                        </div>
                        <div className="service-card">
                            <div className="service-icon">🎫</div>
                            <h3>Flexible Tickets</h3>
                            <p>Change or cancel your booking with ease. Multiple fare options to suit your travel plans.</p>
                        </div>
                        <div className="service-card">
                            <div className="service-icon">💼</div>
                            <h3>Business Class</h3>
                            <p>Premium experience with lie-flat seats, priority boarding, and exclusive lounge access.</p>
                        </div>
                        <div className="service-card">
                            <div className="service-icon">👶</div>
                            <h3>Family Services</h3>
                            <p>Special assistance for families with children, including priority seating and meal options.</p>
                        </div>
                        <div className="service-card">
                            <div className="service-icon">♿</div>
                            <h3>Accessibility</h3>
                            <p>Wheelchair assistance, accessible seating, and trained staff to support passengers with disabilities.</p>
                        </div>
                        <div className="service-card">
                            <div className="service-icon">🎁</div>
                            <h3>Gift Cards</h3>
                            <p>Give the gift of travel. Purchase gift cards for friends and family to use on any flight.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="testimonials-section">
                <div className="container">
                    <h2 className="section-heading">What Our Customers Say</h2>
                    <p className="section-subtitle">Real experiences from real travelers</p>
                    <div className="testimonials-grid">
                        <div className="testimonial-card">
                            <div className="testimonial-rating">★★★★★</div>
                            <p className="testimonial-text">"Outstanding service from booking to landing. The staff was professional, the seats were comfortable, and the food was excellent. I'll definitely fly with them again."</p>
                            <div className="testimonial-author">
                                <div className="author-avatar">A</div>
                                <div>
                                    <div className="author-name">Alex Thompson</div>
                                    <div className="author-title">Business Traveler</div>
                                </div>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <div className="testimonial-rating">★★★★★</div>
                            <p className="testimonial-text">"The best airline experience I've had. On-time departures, clean aircraft, and friendly crew. Their customer service team resolved my issue within minutes."</p>
                            <div className="testimonial-author">
                                <div className="author-avatar">M</div>
                                <div>
                                    <div className="author-name">Maria Garcia</div>
                                    <div className="author-title">Frequent Flyer</div>
                                </div>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <div className="testimonial-rating">★★★★★</div>
                            <p className="testimonial-text">"Flew with my family of four and everything was perfect. The kids loved the entertainment system, and we all arrived refreshed. Highly recommend!"</p>
                            <div className="testimonial-author">
                                <div className="author-avatar">J</div>
                                <div>
                                    <div className="author-name">James Wilson</div>
                                    <div className="author-title">Family Traveler</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-content">
                        <h2>Ready to Start Your Journey?</h2>
                        <p>Book your next flight today and experience the difference of premium air travel</p>
                        <div className="cta-buttons">
                            <Link to="/book" className="cta-btn primary">Book Now</Link>
                            <Link to="/flights" className="cta-btn secondary">Explore Destinations</Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
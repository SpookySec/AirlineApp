import React, { useState } from 'react';
import { Link } from 'react-router-dom'
import './Home.css';

export default function Home() {
    const [tripType, setTripType] = useState('roundtrip');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [departDate, setDepartDate] = useState('');
    const [returnDate, setReturnDate] = useState('');

    const handleSearch = (e) => {
        e.preventDefault();
        console.log({ tripType, from, to, departDate, returnDate });
    };

    return (
        <div className="home">
            <header className="hero">
                <div className="hero-content">
                    <h1>Fly with Confidence</h1>
                    <p>Discover the world with our premium airline service</p>
                </div>
            </header>

            <div className="hero-ctas">
                <Link to="/book" className="hero-cta">Find flights</Link>
                <span className="hero-sub">Flexible tickets • 24/7 support • Best price guarantee</span>
            </div>

            <section className="search-section">
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
                            placeholder="From"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            placeholder="To"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            required
                        />
                        <input
                            type="date"
                            value={departDate}
                            onChange={(e) => setDepartDate(e.target.value)}
                            required
                        />
                        {tripType === 'roundtrip' && (
                            <input
                                type="date"
                                value={returnDate}
                                onChange={(e) => setReturnDate(e.target.value)}
                                required
                            />
                        )}
                        <button type="submit" className="search-btn">
                            Search Flights
                        </button>
                    </div>
                </form>
            </section>

            <section className="features">
                <div className="feature-card">
                    <h3>✈️ Best Prices</h3>
                    <p>Competitive fares guaranteed</p>
                </div>
                <div className="feature-card">
                    <h3>🛡️ Safe Travel</h3>
                    <p>Highest safety standards</p>
                </div>
                <div className="feature-card">
                    <h3>🎯 On Time</h3>
                    <p>Reliable flight schedules</p>
                </div>
            </section>

            <section className="highlights container">
                <div className="stats">
                    <div>
                        <div className="stat-number">500+</div>
                        <div className="stat-label">Daily Flights</div>
                    </div>
                    <div>
                        <div className="stat-number">120+</div>
                        <div className="stat-label">Destinations</div>
                    </div>
                    <div>
                        <div className="stat-number">98%</div>
                        <div className="stat-label">On-time rate</div>
                    </div>
                </div>

                <h3 className="section-title">Popular destinations</h3>
                <div className="destinations">
                    <div className="dest-card"><div className="dest-emoji">🌴</div><div className="dest-name">Honolulu</div></div>
                    <div className="dest-card"><div className="dest-emoji">🗽</div><div className="dest-name">New York</div></div>
                    <div className="dest-card"><div className="dest-emoji">🏖️</div><div className="dest-name">Phuket</div></div>
                    <div className="dest-card"><div className="dest-emoji">🏙️</div><div className="dest-name">Dubai</div></div>
                </div>

                <h3 className="section-title">What our customers say</h3>
                <div className="testimonials">
                    <blockquote className="testimonial">"Smooth booking, great prices and friendly staff — I fly with them every year." <span className="muted">— Alex</span></blockquote>
                    <blockquote className="testimonial">"On-time departures and excellent customer support when I needed it." <span className="muted">— Maria</span></blockquote>
                </div>
            </section>
        </div>
    );
}
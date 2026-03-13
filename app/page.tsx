export default function Home() {
  const phone1 = '9489860333';
  const phone2 = '9842160333';
  const waMsg = encodeURIComponent('Hello, I am interested in joining Senthil Velan Driving School. Please share details.');
  const address = 'Shop No-1, SPT MANINAGAR, Ashok Nagar, Cuddalore, Vadakuthu, Tamil Nadu 607308';
  const mapQuery = encodeURIComponent('Senthil Velan Driving School, SPT MANINAGAR, Ashok Nagar, Cuddalore, Tamil Nadu 607308');

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">SV</div>
          <div>
            <div className="navbar-title">Senthil Velan Driving School</div>
            <div className="navbar-subtitle">Cuddalore, Tamil Nadu</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href={`tel:${phone1}`} className="navbar-phone">
            📞 {phone1}
          </a>
          <a href="/portal" className="navbar-portal-btn">My Bookings</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" id="home">
        <div className="hero-content">
          <div className="hero-badge">🚗 Cuddalore's Trusted Driving School</div>
          <h1>Learn to Drive with <span>Confidence</span></h1>
          <p>
            Professional driving training in Cuddalore since years. Expert instructors,
            flexible timings, and complete support from LLR to Permanent License.
          </p>
          <div className="hero-btns">
            <a href={`tel:${phone1}`} className="btn-primary">📞 Call to Enroll</a>
            <a href={`https://wa.me/91${phone1}?text=${waMsg}`} className="btn-wa" target="_blank" rel="noopener noreferrer">
              💬 WhatsApp Us
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-num">500+</div>
              <div className="hero-stat-label">Students Trained</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">98%</div>
              <div className="hero-stat-label">Pass Rate</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">Mon–Sat</div>
              <div className="hero-stat-label">8 AM – 6 PM</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section" id="services">
        <div className="container">
          <div className="section-title">
            <h2>Our Services</h2>
            <p>Everything you need from learner to licensed driver</p>
            <div className="line" />
          </div>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">🚗</div>
              <h3>Car Driving (LMV)</h3>
              <p>Full car driving training for beginners and intermediates. Learn traffic rules, parking, and highway driving.</p>
              <span className="service-badge">Most Popular</span>
            </div>
            <div className="service-card">
              <div className="service-icon">🏍️</div>
              <h3>Two-Wheeler</h3>
              <p>Motorcycle and scooter training. Safe riding techniques, balance training, and road rules.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">📋</div>
              <h3>LLR Application</h3>
              <p>Complete assistance for Learner's License (LLR) application, form filling, and RTO guidance.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">🏆</div>
              <h3>Driving Test Prep</h3>
              <p>Focused training sessions to prepare you specifically for the RTO driving test. High pass rate.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">📄</div>
              <h3>Permanent License</h3>
              <p>Full support and guidance for obtaining your permanent driving license from the RTO.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">🔄</div>
              <h3>License Renewal & Transfer</h3>
              <p>Assistance with license renewal, name/address transfer, and other RTO documentation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="section section-alt" id="process">
        <div className="container">
          <div className="section-title">
            <h2>How It Works</h2>
            <p>Get your driving license in 4 simple steps</p>
            <div className="line" />
          </div>
          <div className="process-steps">
            <div className="step">
              <div className="step-num">1</div>
              <h4>Enroll</h4>
              <p>Call or WhatsApp us to register</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h4>LLR</h4>
              <p>We help apply for your Learner's License</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h4>Training</h4>
              <p>Daily lessons with expert instructors</p>
            </div>
            <div className="step">
              <div className="step-num">4</div>
              <h4>License</h4>
              <p>Pass the test & get your license</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section" id="about">
        <div className="container">
          <div className="section-title">
            <h2>Why Choose Us?</h2>
            <p>Cuddalore's most trusted driving school</p>
            <div className="line" />
          </div>
          <div className="why-grid">
            <div className="why-card">
              <div className="icon">👨‍🏫</div>
              <h3>Expert Instructors</h3>
              <p>Trained, patient, and licensed instructors with years of experience teaching all skill levels.</p>
            </div>
            <div className="why-card">
              <div className="icon">⏰</div>
              <h3>Flexible Timings</h3>
              <p>Classes from 8 AM to 6 PM, Monday to Saturday. Choose slots that fit your schedule.</p>
            </div>
            <div className="why-card">
              <div className="icon">🛡️</div>
              <h3>Safety First</h3>
              <p>Dual-control training vehicles. We prioritise your safety at every lesson.</p>
            </div>
            <div className="why-card">
              <div className="icon">📍</div>
              <h3>Local & Trusted</h3>
              <p>Based in Ashok Nagar, Cuddalore. We know local roads, RTO rules, and test routes.</p>
            </div>
            <div className="why-card">
              <div className="icon">📱</div>
              <h3>Easy Booking</h3>
              <p>Book lessons via phone or WhatsApp. Track your progress through our mobile app.</p>
            </div>
            <div className="why-card">
              <div className="icon">💰</div>
              <h3>Affordable Fees</h3>
              <p>Transparent pricing with no hidden charges. Installment payment options available.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="section section-alt" id="contact">
        <div className="container">
          <div className="section-title">
            <h2>Visit Us</h2>
            <p>Come to our school or contact us anytime</p>
            <div className="line" />
          </div>
          <div className="contact-grid">
            <div className="contact-info">
              <div className="contact-card">
                <div className="contact-card-icon">📍</div>
                <div>
                  <h4>Address</h4>
                  <p>{address}</p>
                </div>
              </div>
              <div className="contact-card">
                <div className="contact-card-icon">📞</div>
                <div>
                  <h4>Phone Numbers</h4>
                  <p><a href={`tel:${phone1}`}>+91 {phone1}</a></p>
                  <p><a href={`tel:${phone2}`}>+91 {phone2}</a></p>
                </div>
              </div>
              <div className="contact-card">
                <div className="contact-card-icon">🕐</div>
                <div style={{ width: '100%' }}>
                  <h4>Working Hours</h4>
                  <table className="hours-table" style={{ marginTop: 8 }}>
                    <tbody>
                      <tr><td>Monday – Saturday</td><td>8:00 AM – 6:00 PM</td></tr>
                      <tr className="closed"><td>Sunday</td><td>Closed</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="contact-btns">
                <a href={`tel:${phone1}`} className="contact-btn-call">📞 Call Now</a>
                <a href={`https://wa.me/91${phone1}?text=${waMsg}`} className="contact-btn-wa" target="_blank" rel="noopener noreferrer">
                  💬 WhatsApp
                </a>
              </div>
            </div>
            <div>
              <div className="map-container">
                <iframe
                  src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                  allowFullScreen
                  loading="lazy"
                  title="Senthil Velan Driving School Location"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <h3>Senthil Velan Driving School</h3>
              <p>
                Trusted driving school in Cuddalore, Tamil Nadu.<br />
                Expert training for Car, Bike, LLR, and License assistance.<br />
                Mon – Sat · 8 AM – 6 PM
              </p>
            </div>
            <div>
              <h3>Services</h3>
              <ul className="footer-links">
                <li><a href="#services">Car Driving (LMV)</a></li>
                <li><a href="#services">Two-Wheeler Training</a></li>
                <li><a href="#services">LLR Application</a></li>
                <li><a href="#services">Driving Test Prep</a></li>
                <li><a href="#services">Permanent License</a></li>
              </ul>
            </div>
            <div>
              <h3>Contact</h3>
              <p>
                Shop No-1, SPT MANINAGAR,<br />
                Ashok Nagar, Cuddalore,<br />
                Vadakuthu, Tamil Nadu 607308<br /><br />
                📞 +91 94898 60333<br />
                📞 +91 98421 60333
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            © {new Date().getFullYear()} Senthil Velan Driving School. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={`https://wa.me/91${phone1}?text=${waMsg}`}
        className="wa-float"
        target="_blank"
        rel="noopener noreferrer"
        title="Chat on WhatsApp"
      >
        💬
      </a>
    </>
  );
}

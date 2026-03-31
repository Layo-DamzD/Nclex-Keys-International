import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Contact = () => {
  const contactInfo = {
    email: 'nclexkeysintl.academy@gmail.com',
    phone: '+2347037367480',
    whatsappLink: 'https://wa.me/2347037367480',
  };

  return (
    <>
      <Navbar />
      
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0d6efd 0%, #6f42c1 60%)',
        color: 'white',
        padding: '100px 0 60px',
        marginTop: '80px',
        borderRadius: '0 0 50px 50px'
      }}>
        <div className="container text-center">
          <h1 className="display-4 fw-bold mb-3">Get In Touch</h1>
          <p className="lead opacity-90">We're here to help you achieve NCLEX success</p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-5" style={{ background: '#f8fafc' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              {/* Contact Cards */}
              <div className="row g-4 mb-5">
                {/* Email Card */}
                <div className="col-md-6">
                  <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '16px' }}>
                    <div className="card-body text-center p-4">
                      <div style={{
                        width: '70px',
                        height: '70px',
                        background: 'linear-gradient(135deg, #0d6efd, #6f42c1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px'
                      }}>
                        <i className="fas fa-envelope fa-2x text-white"></i>
                      </div>
                      <h4 className="mb-3">Email Us</h4>
                      <p className="text-muted mb-3">For general inquiries and support</p>
                      <a 
                        href={`mailto:${contactInfo.email}`}
                        className="btn btn-outline-primary"
                        style={{ borderRadius: '25px', padding: '10px 30px' }}
                      >
                        <i className="fas fa-paper-plane me-2"></i>
                        {contactInfo.email}
                      </a>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Card */}
                <div className="col-md-6">
                  <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '16px' }}>
                    <div className="card-body text-center p-4">
                      <div style={{
                        width: '70px',
                        height: '70px',
                        background: 'linear-gradient(135deg, #25D366, #128C7E)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px'
                      }}>
                        <i className="fab fa-whatsapp fa-2x text-white"></i>
                      </div>
                      <h4 className="mb-3">WhatsApp</h4>
                      <p className="text-muted mb-3">Quick response via chat</p>
                      <a 
                        href={contactInfo.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-success"
                        style={{ borderRadius: '25px', padding: '10px 30px' }}
                      >
                        <i className="fab fa-whatsapp me-2"></i>
                        {contactInfo.phone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="text-center p-4 bg-white rounded-4 shadow-sm">
                <i className="fas fa-clock text-primary fa-2x mb-3"></i>
                <h5>Response Time</h5>
                <p className="text-muted mb-0">
                  We typically respond within 24-48 hours during business days.
                  For urgent matters, please reach out via WhatsApp.
                </p>
              </div>

              {/* CTA Section */}
              <div className="text-center mt-5 p-5 rounded-4" style={{
                background: 'linear-gradient(135deg, #0d6efd 0%, #6f42c1 60%)',
                color: 'white'
              }}>
                <h3 className="mb-3">Ready to Start Your NCLEX Journey?</h3>
                <p className="mb-4 opacity-90">Join thousands of successful nurses who passed with NCLEX KEYS</p>
                <Link to="/signup" className="btn btn-light btn-lg" style={{ borderRadius: '25px', padding: '12px 40px' }}>
                  <i className="fas fa-user-plus me-2"></i>
                  Get Started Today
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Contact;

import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const About = () => {
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
          <h1 className="display-4 fw-bold mb-3">About NCLEX KEYS International</h1>
          <p className="lead opacity-90">Empowering International Nurses to Achieve NCLEX Success</p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-5" style={{ background: '#f8fafc' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              {/* Mission Card */}
              <div className="card border-0 shadow-sm mb-5" style={{ borderRadius: '20px' }}>
                <div className="card-body p-5">
                  <div className="text-center mb-4">
                    <div style={{
                      width: '80px',
                      height: '80px',
                      background: 'linear-gradient(135deg, #0d6efd, #6f42c1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto'
                    }}>
                      <i className="fas fa-bullseye fa-2x text-white"></i>
                    </div>
                  </div>
                  <h2 className="text-center mb-4">Our Mission</h2>
                  <p className="lead text-center text-muted">
                    NCLEX KEYS International provides comprehensive training for nursing graduates 
                    to pass the NCLEX-RN/PN exams with confidence. Join thousands of successful nurses.
                  </p>
                </div>
              </div>

              {/* Stats Section */}
              <div className="row g-4 mb-5">
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100 text-center" style={{ borderRadius: '16px' }}>
                    <div className="card-body p-4">
                      <div className="display-4 fw-bold text-primary mb-2">97%</div>
                      <p className="text-muted mb-0">First-Time Pass Rate</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100 text-center" style={{ borderRadius: '16px' }}>
                    <div className="card-body p-4">
                      <div className="display-4 fw-bold text-primary mb-2">10K+</div>
                      <p className="text-muted mb-0">Practice Questions</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100 text-center" style={{ borderRadius: '16px' }}>
                    <div className="card-body p-4">
                      <div className="display-4 fw-bold text-primary mb-2">1000+</div>
                      <p className="text-muted mb-0">Successful Nurses</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* What We Offer */}
              <div className="card border-0 shadow-sm mb-5" style={{ borderRadius: '20px' }}>
                <div className="card-body p-5">
                  <h3 className="mb-4 text-center">What We Offer</h3>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="d-flex align-items-start">
                        <div className="me-3" style={{
                          width: '50px',
                          height: '50px',
                          background: 'rgba(13, 110, 253, 0.1)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <i className="fas fa-user-check text-primary"></i>
                        </div>
                        <div>
                          <h5>Personalized Study Plans</h5>
                          <p className="text-muted small">Tailored learning paths based on your strengths and weaknesses</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex align-items-start">
                        <div className="me-3" style={{
                          width: '50px',
                          height: '50px',
                          background: 'rgba(13, 110, 253, 0.1)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <i className="fas fa-clipboard-list text-primary"></i>
                        </div>
                        <div>
                          <h5>10,000+ Practice Questions</h5>
                          <p className="text-muted small">Comprehensive question bank with detailed explanations</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex align-items-start">
                        <div className="me-3" style={{
                          width: '50px',
                          height: '50px',
                          background: 'rgba(13, 110, 253, 0.1)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <i className="fas fa-video text-primary"></i>
                        </div>
                        <div>
                          <h5>Live Virtual Classes</h5>
                          <p className="text-muted small">Interactive sessions with expert NCLEX instructors</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex align-items-start">
                        <div className="me-3" style={{
                          width: '50px',
                          height: '50px',
                          background: 'rgba(13, 110, 253, 0.1)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <i className="fas fa-robot text-primary"></i>
                        </div>
                        <div>
                          <h5>AI-Powered Learning</h5>
                          <p className="text-muted small">Smart study tools with Brainiac AI assistant</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Who We Are */}
              <div className="card border-0 shadow-sm mb-5" style={{ borderRadius: '20px' }}>
                <div className="card-body p-5">
                  <h3 className="mb-4 text-center">Who We Are</h3>
                  <p className="text-muted text-center">
                    NCLEX KEYS International Academy is dedicated to empowering international nurses 
                    to achieve NCLEX success through comprehensive training programs. Our team of 
                    experienced educators and healthcare professionals have helped thousands of 
                    nursing graduates realize their dream of practicing in the United States.
                  </p>
                  <p className="text-muted text-center">
                    We understand the unique challenges faced by international nurses and have 
                    developed targeted strategies to address each area of the NCLEX exam. Our 
                    proven methodology combines cutting-edge technology with personalized support 
                    to maximize your chances of passing on the first attempt.
                  </p>
                </div>
              </div>

              {/* CTA Section */}
              <div className="text-center p-5 rounded-4" style={{
                background: 'linear-gradient(135deg, #0d6efd 0%, #6f42c1 60%)',
                color: 'white'
              }}>
                <h3 className="mb-3">Start Your Journey Today</h3>
                <p className="mb-4 opacity-90">Join our community of successful NCLEX candidates</p>
                <div className="d-flex justify-content-center gap-3 flex-wrap">
                  <Link to="/signup" className="btn btn-light btn-lg" style={{ borderRadius: '25px', padding: '12px 40px' }}>
                    <i className="fas fa-user-plus me-2"></i>
                    Sign Up Now
                  </Link>
                  <Link to="/contact" className="btn btn-outline-light btn-lg" style={{ borderRadius: '25px', padding: '12px 40px' }}>
                    <i className="fas fa-envelope me-2"></i>
                    Contact Us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default About;

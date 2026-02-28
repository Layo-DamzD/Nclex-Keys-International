import React from 'react';

const DEFAULT_CONTENT = {
  brandLinkUrl: '/',
  companyBlurb:
    'Empowering international nurses to achieve NCLEX success through comprehensive training programs.',
  socialLinks: {
    facebook: 'https://facebook.com/yourpage',
    x: 'https://x.com/yourpage',
    linkedin: 'https://linkedin.com/company/yourpage',
    youtube: 'https://youtube.com/yourpage',
  },
  contact: {
    email: 'nclexkeysintl.academy@gmail.com',
    phone: '07037367480',
  },
  legal: {
    copyrightText:
      '© 2026 NCLEX KEYS International. All rights reserved.',
    privacyUrl: '/documents/privacy-policy.pdf',
    termsUrl: '/documents/terms-of-service.pdf',
  },
};

const Footer = ({ content = {} }) => {
  const data = {
    ...DEFAULT_CONTENT,
    ...content,
    socialLinks: {
      ...DEFAULT_CONTENT.socialLinks,
      ...(content.socialLinks || {}),
    },
    contact: {
      ...DEFAULT_CONTENT.contact,
      ...(content.contact || {}),
    },
    legal: {
      ...DEFAULT_CONTENT.legal,
      ...(content.legal || {}),
    },
  };
  if (String(data.contact.phone || '').trim() === '+1 (800) 555-1234') {
    data.contact.phone = '07037367480';
  }

  const whatsappDigits = String(data.contact.phone || '').replace(/[^\d]/g, '');
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}`
    : '#';

  return (
    <footer
      className="footer"
      style={{
        background: '#1d3557',
        color: 'white',
        padding: '60px 0 30px',
      }}
    >
      <div className="container">
        <div className="row">
          {/* BRAND SECTION */}
          <div className="col-lg-5 mb-4">
            <div className="footer-brand d-flex align-items-center">
              <a
                href={data.brandLinkUrl}
                className="d-flex align-items-center text-white text-decoration-none"
              >
                <img
                  src="/images/logo.png.jpg"
                  alt="NCLEX KEYS"
                  width="50"
                  height="50"
                  style={{ objectFit: 'contain', marginRight: '12px' }}
                />
                <div>
                  <span className="fw-bold fs-4">NCLEX</span>
                  <span
                    className="fw-bold fs-4"
                    style={{ color: '#28a745' }}
                  >
                    KEYS
                  </span>
                  <div
                    className="text-white-50 small"
                    style={{ fontSize: '0.8rem', lineHeight: 1.2 }}
                  >
                    International
                  </div>
                </div>
              </a>
            </div>

            <p
              className="mt-3"
              style={{ opacity: 0.9, maxWidth: '350px' }}
            >
              {data.companyBlurb}
            </p>

            <div className="social-links mt-4">
              <a
                href={data.socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="me-3 text-white"
                style={{ fontSize: '1.5rem' }}
              >
                <i className="fab fa-facebook"></i>
              </a>

              <a
                href={data.socialLinks.x}
                target="_blank"
                rel="noopener noreferrer"
                className="me-3 text-white"
                style={{ fontSize: '1.5rem' }}
              >
                <i className="fab fa-x-twitter"></i>
              </a>

              <a
                href={data.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="me-3 text-white"
                style={{ fontSize: '1.5rem' }}
              >
                <i className="fab fa-linkedin"></i>
              </a>

              <a
                href={data.socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="me-3 text-white"
                style={{ fontSize: '1.5rem' }}
              >
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>

          <div className="col-lg-3"></div>

          {/* CONTACT SECTION */}
          <div className="col-lg-4 mb-4">
            <h5 className="mb-3" style={{ fontWeight: 600 }}>
              Contact Info
            </h5>

            <ul className="list-unstyled">
              <li className="mb-2">
                <i
                  className="fas fa-envelope me-2"
                  style={{ color: '#28a745' }}
                ></i>
                <a
                  href={`mailto:${data.contact.email}`}
                  className="text-white-50"
                >
                  {data.contact.email}
                </a>
              </li>

              <li className="mb-2">
                <i
                  className="fab fa-whatsapp me-2"
                  style={{ color: '#28a745' }}
                ></i>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="text-white-50">
                  {data.contact.phone}
                </a>
              </li>

            </ul>
          </div>
        </div>

        <hr
          className="bg-white"
          style={{ opacity: 0.1, margin: '40px 0 20px' }}
        />

        <div className="row">
          <div className="col-md-6">
            <p className="mb-0 small">
              {data.legal.copyrightText}
            </p>
          </div>

          <div className="col-md-6 text-md-end">
            <a
              href={data.legal.privacyUrl}
              download
              className="text-white-50 me-3"
            >
              Privacy Policy
            </a>

            <a
              href={data.legal.termsUrl}
              download
              className="text-white-50 small"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

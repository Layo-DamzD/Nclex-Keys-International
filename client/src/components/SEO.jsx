import React from 'react';
import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://nclexkeysintl.com';
const DEFAULT_TITLE = 'NCLEX KEYS International - Pass Your NCLEX Exam with Confidence';
const DEFAULT_DESCRIPTION = 'NCLEX KEYS International Academy provides comprehensive NCLEX-RN and NCLEX-PN exam preparation. Expert tutors, practice tests, AI-powered study tools, and personalized learning paths.';
const DEFAULT_OG_IMAGE = 'https://nclexkeysintl.com/og-image.png';

/**
 * Reusable SEO component for per-route meta tags.
 * Wrap each public page with <SEO /> to give Google unique
 * <title>, <meta description>, <link canonical>, and Open Graph tags.
 *
 * Usage:
 *   <SEO
 *     title="About Us"
 *     description="Learn about NCLEX KEYS International Academy..."
 *     canonicalPath="/about"
 *   />
 */
const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '/',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noIndex = false,
}) => {
  const fullTitle = title ? `${title} | NCLEX KEYS International` : DEFAULT_TITLE;
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  return (
    <Helmet>
      {/* Primary Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="NCLEX KEYS International" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;

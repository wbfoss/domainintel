import '../styles/globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Providers } from '../components/providers';
import Footer from '../components/Footer';

export const metadata = {
  metadataBase: new URL('https://www.domainintel.in'),
  title: 'DomainIntel - Modern Domain Intelligence & Security Platform',
  description: 'Advanced domain intelligence and cybersecurity platform. RDAP lookup, threat detection, security analysis for domains, IPs, and network infrastructure. Free tools for security researchers.',
  keywords: [
    'RDAP lookup',
    'domain lookup', 
    'WHOIS alternative',
    'domain intelligence',
    'IP lookup',
    'ASN lookup',
    'domain security',
    'DNS security',
    'DNSSEC checker',
    'domain registration data',
    'registry data',
    'domain expiry checker',
    'nameserver lookup',
    'domain contacts',
    'SSL certificate checker',
    'email security',
    'SPF checker',
    'DMARC checker',
    'DKIM checker',
    'domain analysis',
    'cybersecurity tools',
    'network tools'
  ],
  authors: [{ name: 'DomainIntel Team' }],
  creator: 'DomainIntel Team',
  publisher: 'DomainIntel',
  category: 'Technology',
  classification: 'Network Tools',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.domainintel.in',
    siteName: 'DomainIntel',
    title: 'DomainIntel - Modern Domain Intelligence & Security Platform',
    description: 'Advanced domain intelligence and cybersecurity platform. RDAP lookup, threat detection, security analysis for domains, IPs, and network infrastructure.',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'DomainIntel - Modern Domain Intelligence & Security Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@domainintel',
    creator: '@domainintel',
    title: 'DomainIntel - Modern Domain Intelligence & Security Platform',
    description: 'Advanced domain intelligence and cybersecurity platform. RDAP lookup, threat detection, security analysis for domains, IPs, and network infrastructure.',
    images: ['/api/og?title=DomainIntel&description=Domain+Intelligence+Platform'],
  },
  alternates: {
    canonical: 'https://www.domainintel.in',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'DomainIntel',
    'application-name': 'DomainIntel',
    'msapplication-TileColor': '#2563eb',
    'theme-color': '#2563eb',
  },
};

export default function RootLayout({ children }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "DomainIntel",
    "description": "Advanced domain intelligence and cybersecurity platform. RDAP lookup, threat detection, security analysis for domains, IPs, and network infrastructure.",
    "url": "https://www.domainintel.in",
    "applicationCategory": "NetworkApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Organization",
      "name": "DomainIntel Team"
    },
    "featureList": [
      "Domain Intelligence Lookup",
      "IP Address Intelligence Lookup", 
      "ASN Intelligence Lookup",
      "Entity Intelligence Lookup",
      "DNSSEC Verification",
      "SSL Certificate Analysis",
      "Email Security Analysis",
      "SPF Record Checker",
      "DMARC Record Checker", 
      "DKIM Record Checker",
      "Nameserver Analysis",
      "Domain Expiry Monitoring",
      "Blacklist Checking",
      "JSON Export",
      "Privacy Compliant"
    ],
    "audience": {
      "@type": "Audience",
      "audienceType": "IT Professionals, Domain Administrators, Security Researchers, Network Engineers"
    }
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <Providers>
          {children}
          <Analytics />
          <SpeedInsights />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

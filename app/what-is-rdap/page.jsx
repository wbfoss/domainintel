import { BookOpen, Zap, Shield, Globe, Server, Database, Lock, Search, CheckCircle, ArrowRight } from "lucide-react";
import Header from "../../components/Header";
import Breadcrumb from "../../components/Breadcrumb";

export const metadata = {
  title: 'What is RDAP? Complete Guide to Registration Data Access Protocol | RDAP vs WHOIS',
  description: 'Learn what RDAP (Registration Data Access Protocol) is, how it works, and why it\'s replacing WHOIS. Comprehensive guide covering RDAP benefits, API usage, security features, and implementation for domain lookup, IP queries, and network intelligence.',
  keywords: [
    'what is RDAP',
    'RDAP vs WHOIS',
    'Registration Data Access Protocol',
    'RDAP protocol explained',
    'RDAP API documentation',
    'how does RDAP work',
    'RDAP benefits over WHOIS',
    'RDAP JSON format',
    'RDAP security features',
    'RDAP privacy compliance',
    'RDAP GDPR compliance',
    'RDAP implementation guide',
    'RDAP query examples',
    'RDAP REST API',
    'RDAP structured data',
    'RDAP internationalization',
    'RDAP domain lookup tutorial',
    'RDAP IP address lookup',
    'RDAP ASN lookup guide',
    'RDAP authentication',
    'RDAP rate limiting',
    'RDAP bootstrap service',
    'RDAP server list',
    'RDAP RFC 7483',
    'IETF RDAP standard'
  ],
  alternates: {
    canonical: 'https://www.domainintel.in/what-is-rdap',
  },
  openGraph: {
    title: 'What is RDAP? Complete Guide to Registration Data Access Protocol',
    description: 'Learn everything about RDAP - the modern replacement for WHOIS. Understand how RDAP works, its benefits, API usage, and why it\'s the future of domain and network intelligence.',
    url: 'https://www.domainintel.in/what-is-rdap',
    type: 'article',
  },
};

export default function WhatIsRdapPage() {
  const breadcrumbItems = [
    { label: "What is RDAP?", href: null }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">What is RDAP?</h1>
              <p className="text-gray-600">Understanding Registration Data Access Protocol</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6">
          {/* Introduction */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">What is RDAP?</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-700">
                RDAP (Registration Data Access Protocol) is a modern internet protocol designed to replace the 40-year-old WHOIS protocol for querying registration data of internet resources like domain names, IP addresses, and Autonomous System Numbers (ASNs). Developed by the Internet Engineering Task Force (IETF) and standardized in RFC 7483, RDAP provides structured, machine-readable data in JSON format.
              </p>
              <p className="text-gray-700">
                Unlike WHOIS which returns unstructured plain text that varies between registrars, RDAP delivers consistent, standardized responses that applications can easily parse and process. This makes RDAP essential for developers building domain monitoring tools, cybersecurity applications, and compliance systems.
              </p>
            </div>
          </div>

          {/* Key Advantages */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900">RDAP vs WHOIS: Key Advantages</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Database className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Structured JSON Data</h3>
                    <p className="text-sm text-gray-600">
                      Standardized JSON format eliminates parsing issues, enables reliable automation and integration with modern APIs.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Enhanced Security & GDPR</h3>
                    <p className="text-sm text-gray-600">
                      HTTPS encryption by default with tiered access control for GDPR compliance and privacy protection.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Globe className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Internationalization</h3>
                    <p className="text-sm text-gray-600">
                      Native support for non-ASCII characters and IDNs in multiple languages including Chinese, Arabic, and Cyrillic.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Zap className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">RESTful API</h3>
                    <p className="text-sm text-gray-600">
                      Predictable URL patterns like /domain/example.com make it intuitive for developers.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Lock className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Authentication Support</h3>
                    <p className="text-sm text-gray-600">
                      OAuth 2.0 support with built-in rate limiting for fair access and abuse prevention.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Server className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Bootstrap Discovery</h3>
                    <p className="text-sm text-gray-600">
                      Automatic discovery of correct RDAP server eliminates need for registry endpoints knowledge.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">How Does RDAP Work?</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-700">
                RDAP operates as a RESTful web service over HTTPS. When you query a domain, IP address, or ASN, the RDAP client first consults the IANA bootstrap service to determine the authoritative RDAP server. The query is then forwarded to the appropriate registry or registrar's RDAP endpoint.
              </p>
              
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-3">RDAP returns structured JSON data containing:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    "Object class information",
                    "Registration details & dates",
                    "Status codes & lock states",
                    "Contact data (privacy-compliant)",
                    "Nameserver information",
                    "DNSSEC details",
                    "Related links & resources",
                    "Events history"
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <p className="text-green-400 text-sm mb-2"># Example RDAP queries:</p>
                <pre className="text-gray-300 text-sm">
{`GET https://rdap.verisign.com/domain/example.com
GET https://rdap.arin.net/registry/ip/192.0.2.0
GET https://rdap.arin.net/registry/autnum/65536`}
                </pre>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Common RDAP Use Cases</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2">🔍 Domain Intelligence</h3>
                <p className="text-sm text-gray-600">
                  Track expiration dates, monitor ownership changes, detect suspicious registrations, and manage domain portfolios.
                </p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="font-semibold text-gray-900 mb-2">🛡️ Cybersecurity</h3>
                <p className="text-sm text-gray-600">
                  Investigate malicious domains, trace attack infrastructure, and build automated threat detection systems.
                </p>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h3 className="font-semibold text-gray-900 mb-2">⚖️ Compliance & Legal</h3>
                <p className="text-sm text-gray-600">
                  Verify ownership for legal proceedings, ensure trademark compliance, and maintain audit trails.
                </p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="font-semibold text-gray-900 mb-2">🌐 Network Operations</h3>
                <p className="text-sm text-gray-600">
                  Query IP allocations, research ASN information, troubleshoot routing issues, and maintain network docs.
                </p>
              </div>
            </div>
          </div>

          {/* Implementation Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">RDAP Implementation Status</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-700">
                RDAP is now mandatory for all ICANN-accredited registrars and registries:
              </p>
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    gTLDs
                  </span>
                  <span className="text-gray-600">All generic top-level domains (.com, .org, .net)</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    ccTLDs
                  </span>
                  <span className="text-gray-600">Many country codes (.uk, .ca, .au)</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                    RIRs
                  </span>
                  <span className="text-gray-600">ARIN, RIPE NCC, APNIC, LACNIC, AFRINIC</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Registrars
                  </span>
                  <span className="text-gray-600">GoDaddy, Namecheap, Cloudflare, and more</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-blue-600 text-white rounded-lg p-6 text-center">
            <Search className="w-8 h-8 text-blue-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Try DomainIntel Now</h2>
            <p className="text-blue-100 mb-4">
              Experience the power of RDAP with our free lookup tool. Get comprehensive domain intelligence, IP information, and network data instantly.
            </p>
            <a 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Start Domain Lookup
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-blue-600 mb-1">Is RDAP replacing WHOIS completely?</h3>
                <p className="text-sm text-gray-600">
                  Yes, RDAP is the designated successor to WHOIS. While WHOIS remains for backward compatibility, RDAP is now the primary protocol.
                </p>
              </div>
              <hr className="border-gray-200" />
              <div>
                <h3 className="font-semibold text-blue-600 mb-1">Is RDAP free to use?</h3>
                <p className="text-sm text-gray-600">
                  Yes, basic RDAP queries are free. Some registries may require authentication for enhanced data or high-volume queries.
                </p>
              </div>
              <hr className="border-gray-200" />
              <div>
                <h3 className="font-semibold text-blue-600 mb-1">How is RDAP more privacy-compliant?</h3>
                <p className="text-sm text-gray-600">
                  RDAP supports tiered access control, redacting personal information for unauthenticated queries while ensuring GDPR compliance.
                </p>
              </div>
              <hr className="border-gray-200" />
              <div>
                <h3 className="font-semibold text-blue-600 mb-1">Can I query expired domains?</h3>
                <p className="text-sm text-gray-600">
                  Yes, RDAP can return information about expired domains, including expiration dates and redemption status.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
import { Info, Code as CodeIcon, Zap, GitBranch, Users, Shield, Globe, Star, TrendingUp, ExternalLink } from "lucide-react";
import Header from "../../components/Header";
import Breadcrumb from "../../components/Breadcrumb";

export const metadata = {
  title: 'About DomainIntel - Open Source Domain Intelligence & Security Platform',
  description: 'DomainIntel is a free, open source platform for domain intelligence, cybersecurity research, and network analysis. Built with Next.js and React. Contribute on GitHub and join the security community.',
  keywords: [
    'RDAP lookup open source',
    'free RDAP tool',
    'open source domain lookup',
    'GitHub RDAP project',
    'RDAP lookup tool source code',
    'domain intelligence open source',
    'free domain lookup API',
    'WHOIS alternative open source',
    'Next.js RDAP tool',
    'React domain lookup',
    'contribute RDAP project',
    'RDAP tool GitHub repository',
    'domain lookup tool development',
    'network intelligence open source',
    'IP lookup open source tool',
    'ASN lookup GitHub project',
    'RDAP API implementation',
    'domain security scanner open source',
    'DNS lookup tool GitHub',
    'free domain intelligence platform',
    'RDAP client implementation',
    'domain monitoring open source',
    'RDAP lookup tool features',
    'domain expiry checker free',
    'SSL certificate checker open source'
  ],
  alternates: {
    canonical: 'https://www.domainintel.in/about',
  },
  openGraph: {
    title: 'About DomainIntel - Open Source Domain Intelligence & Security Platform',
    description: 'Free, open source domain intelligence and cybersecurity platform. Built with Next.js, React, and modern web technologies. Join the security community.',
    url: 'https://www.domainintel.in/about',
    type: 'website',
  },
};

export default function AboutPage() {
  const breadcrumbItems = [
    { label: "About", href: null }
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
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">About DomainIntel</h1>
              <p className="text-gray-600">Domain Intelligence & Security Platform</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6">
          {/* Mission Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Open Source Domain Intelligence</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-700">
                DomainIntel is a completely free, open source platform that provides comprehensive domain intelligence, cybersecurity research tools, and network analysis capabilities. Built with modern web technologies and designed for security researchers, IT professionals, and cybersecurity analysts.
              </p>
              <p className="text-gray-700">
                As an open source project hosted on GitHub, we believe in transparency, community collaboration, and making powerful domain intelligence tools freely available. Our mission is to democratize access to cybersecurity research tools and provide advanced threat detection capabilities.
              </p>
            </div>
          </div>

          {/* GitHub CTA */}
          <div className="bg-gray-900 text-white rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <GitBranch className="w-6 h-6" />
              <h2 className="text-lg font-bold">Join Our Open Source Community</h2>
            </div>
            <p className="text-gray-300 mb-4">
              Help us build the future of cybersecurity and domain intelligence tools. Star our repository, contribute code, or report issues.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/wbfoss/rdap-lookup"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <Star className="w-4 h-4" />
                Star on GitHub
              </a>
              <a
                href="https://github.com/wbfoss/rdap-lookup/fork"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                <GitBranch className="w-4 h-4" />
                Fork Repository
              </a>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Domain Intelligence Lookup</h3>
              </div>
              <p className="text-sm text-gray-600">
                Query any domain name to get registration details, nameservers, status codes, and expiration dates in structured JSON format.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Security Analysis</h3>
              </div>
              <p className="text-sm text-gray-600">
                Comprehensive security checks including DNSSEC validation, SSL certificate analysis, and email authentication.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-gray-900">IP & ASN Lookup</h3>
              </div>
              <p className="text-sm text-gray-600">
                Look up IP addresses and Autonomous System Numbers to get network allocation details and organization information.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <CodeIcon className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Developer Friendly</h3>
              </div>
              <p className="text-sm text-gray-600">
                Export results as JSON, access raw RDAP responses, and integrate with your applications. Perfect for automation.
              </p>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Technology Stack</h2>
            </div>
            <p className="text-gray-700 mb-4">
              Built with modern, performant web technologies ensuring fast lookups and smooth user experience:
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Next.js 14
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-800">
                React 18
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Tailwind CSS
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                RDAP APIs
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Vercel
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Contact & Community</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://github.com/wbfoss/rdap-lookup/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>GitHub Discussions</span>
              </a>
              <a
                href="https://github.com/wbfoss/rdap-lookup/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Report Issues</span>
              </a>
              <a
                href="https://github.com/wbfoss/rdap-lookup"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>GitHub Repository</span>
              </a>
              <a
                href="https://github.com/wbfoss"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Organization Profile</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
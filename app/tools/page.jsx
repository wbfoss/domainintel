'use client';

import { useState } from "react";
import { 
  Shield, 
  Globe, 
  Lock, 
  Mail, 
  Clock, 
  Search, 
  AlertTriangle, 
  Database,
  Eye,
  Target,
  CheckCircle
} from "lucide-react";
import Header from "../../components/Header";
import Breadcrumb from "../../components/Breadcrumb";
import DomainAgeCalculator from "../../components/tools/DomainAgeCalculator";
import TyposquattingDetection from "../../components/tools/TyposquattingDetection";
import HomographAttackDetection from "../../components/tools/HomographAttackDetection";
import DomainReputationScoring from "../../components/tools/DomainReputationScoring";
import SuspiciousTLDFlagging from "../../components/tools/SuspiciousTLDFlagging";
import SSLConfigAssessment from "../../components/tools/SSLConfigAssessment";
import SPFAnalysis from "../../components/tools/SPFAnalysis";
import DMARCAssessment from "../../components/tools/DMARCAssessment";
import BlacklistAggregation from "../../components/tools/BlacklistAggregation";
import PhishingLookup from "../../components/tools/PhishingLookup";
import FastFluxDetection from "../../components/tools/FastFluxDetection";
import DomainParkingAnalysis from "../../components/tools/DomainParkingAnalysis";
import MalwareC2Detection from "../../components/tools/MalwareC2Detection";
import CertificateTransparencyMonitoring from "../../components/tools/CertificateTransparencyMonitoring";

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState(null);
  const breadcrumbItems = [
    { label: "Tools", href: null }
  ];

  const phase1Tools = [
    {
      id: 'domain-age',
      title: 'Domain Age Calculator',
      description: 'Calculate exact domain age and flag newly registered domains (< 30 days)',
      icon: Clock,
      status: 'available',
      category: 'Domain Security',
      color: 'blue'
    },
    {
      id: 'typosquatting',
      title: 'Typosquatting Detection',
      description: 'Generate and check variations of popular domains (character substitution, insertion, omission)',
      icon: Search,
      status: 'available',
      category: 'Domain Security',
      color: 'purple'
    },
    {
      id: 'homograph',
      title: 'Homograph Attack Detection',
      description: 'Identify domains using similar-looking Unicode characters',
      icon: Eye,
      status: 'available',
      category: 'Domain Security',
      color: 'yellow'
    },
    {
      id: 'domain-reputation',
      title: 'Domain Reputation Scoring',
      description: 'Aggregate score based on age, registrar, hosting provider, and historical data',
      icon: Shield,
      status: 'available',
      category: 'Domain Security',
      color: 'green'
    },
    {
      id: 'suspicious-tld',
      title: 'Suspicious TLD Flagging',
      description: 'Flag domains using commonly abused TLDs (.tk, .ml, .ga, etc.)',
      icon: AlertTriangle,
      status: 'available',
      category: 'Domain Security',
      color: 'red'
    },
    {
      id: 'fast-flux',
      title: 'Fast Flux Detection',
      description: 'Monitor rapid IP address changes indicating malicious infrastructure',
      icon: Globe,
      status: 'available',
      category: 'Domain Security',
      color: 'indigo'
    },
    {
      id: 'domain-parking',
      title: 'Domain Parking Analysis',
      description: 'Detect parked domains that could be weaponized',
      icon: Target,
      status: 'available',
      category: 'Domain Security',
      color: 'orange'
    },
    {
      id: 'malware-c2',
      title: 'Malware C2 Detection',
      description: 'Check against known Command & Control infrastructure databases',
      icon: Database,
      status: 'available',
      category: 'Threat Intelligence',
      color: 'red'
    },
    {
      id: 'phishing-lookup',
      title: 'Phishing Database Lookup',
      description: 'Cross-reference with PhishTank, OpenPhish, and other feeds',
      icon: Shield,
      status: 'available',
      category: 'Threat Intelligence',
      color: 'red'
    },
    {
      id: 'blacklist-check',
      title: 'Blacklist Aggregation',
      description: 'Check against multiple security vendor blacklists',
      icon: AlertTriangle,
      status: 'available',
      category: 'Threat Intelligence',
      color: 'red'
    },
    {
      id: 'cert-transparency',
      title: 'Certificate Transparency Monitoring',
      description: 'Track certificate issuance patterns and anomalies',
      icon: Lock,
      status: 'available',
      category: 'Certificate & SSL',
      color: 'blue'
    },
    {
      id: 'ssl-config',
      title: 'SSL Configuration Assessment',
      description: 'Analyze cipher suites, protocol versions, and security issues',
      icon: Lock,
      status: 'available',
      category: 'Certificate & SSL',
      color: 'green'
    },
    {
      id: 'spf-analysis',
      title: 'Advanced SPF Analysis',
      description: 'Parse SPF records and identify misconfigurations',
      icon: Mail,
      status: 'available',
      category: 'Email Security',
      color: 'blue'
    },
    {
      id: 'dmarc-assessment',
      title: 'DMARC Policy Assessment',
      description: 'Analyze DMARC policies and provide security recommendations',
      icon: Mail,
      status: 'available',
      category: 'Email Security',
      color: 'purple'
    }
  ];

  const categories = [...new Set(phase1Tools.map(tool => tool.category))];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-50 border-blue-200 text-blue-600',
      purple: 'bg-purple-50 border-purple-200 text-purple-600',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
      green: 'bg-green-50 border-green-200 text-green-600',
      red: 'bg-red-50 border-red-200 text-red-600',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600',
      orange: 'bg-orange-50 border-orange-200 text-orange-600'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Security Tools</h1>
              <p className="text-gray-600">Advanced cybersecurity and threat intelligence tools</p>
            </div>
          </div>
          <p className="text-gray-700 max-w-3xl">
            Comprehensive security analysis tools for domains, IPs, and network infrastructure. 
            These Phase 1 tools provide essential cybersecurity intelligence for threat hunting, 
            incident response, and security research.
          </p>
        </div>

        {/* Tools by Category */}
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {phase1Tools
                  .filter(tool => tool.category === category)
                  .map((tool) => {
                    const IconComponent = tool.icon;
                    return (
                      <div key={tool.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg border ${getColorClasses(tool.color)}`}>
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900">{tool.title}</h3>
                              {tool.status === 'coming-soon' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  Coming Soon
                                </span>
                              )}
                              {tool.status === 'available' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Available
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {tool.description}
                            </p>
                            {tool.status === 'coming-soon' && (
                              <button 
                                disabled 
                                className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-md cursor-not-allowed"
                              >
                                Coming Soon
                              </button>
                            )}
                            {tool.status === 'available' && (
                              <button 
                                onClick={() => setActiveTool(tool.id)}
                                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                              >
                                Launch Tool
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          ))}
        </div>

        {/* Implementation Notice */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Development Roadmap</h3>
              <p className="text-gray-700 mb-3">
                These Phase 1 security tools are currently in development. They will be rolled out gradually 
                based on community feedback and demand. Each tool will integrate seamlessly with the existing 
                RDAP lookup functionality.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  14 Tools Planned
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  High Priority
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  Open Source
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Want to contribute?</h3>
          <p className="text-gray-600 mb-4">
            Help us build these security tools faster by contributing to the open source project.
          </p>
          <a
            href="https://github.com/wbfoss/rdap-lookup"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Database className="w-4 h-4" />
            View on GitHub
          </a>
        </div>
      </main>

      {/* Tool Modals */}
      {activeTool === 'domain-age' && (
        <DomainAgeCalculator onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'typosquatting' && (
        <TyposquattingDetection onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'homograph' && (
        <HomographAttackDetection onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'domain-reputation' && (
        <DomainReputationScoring onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'suspicious-tld' && (
        <SuspiciousTLDFlagging onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'ssl-config' && (
        <SSLConfigAssessment onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'spf-analysis' && (
        <SPFAnalysis onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'dmarc-assessment' && (
        <DMARCAssessment onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'blacklist-check' && (
        <BlacklistAggregation onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'phishing-lookup' && (
        <PhishingLookup onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'fast-flux' && (
        <FastFluxDetection onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'domain-parking' && (
        <DomainParkingAnalysis onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'malware-c2' && (
        <MalwareC2Detection onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'cert-transparency' && (
        <CertificateTransparencyMonitoring onClose={() => setActiveTool(null)} />
      )}
    </div>
  );
}
![GitHub stars](https://img.shields.io/github/stars/wbfoss/rdap-lookup?style=social)
![GitHub forks](https://img.shields.io/github/forks/wbfoss/rdap-lookup?style=social)
![GitHub issues](https://img.shields.io/github/issues/wbfoss/rdap-lookup)
![GitHub pull requests](https://img.shields.io/github/issues-pr/wbfoss/rdap-lookup)
![GitHub](https://img.shields.io/github/license/wbfoss/rdap-lookup)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/wbfoss/rdap-lookup)
![GitHub contributors](https://img.shields.io/github/contributors/wbfoss/rdap-lookup)
![GitHub last commit](https://img.shields.io/github/last-commit/wbfoss/rdap-lookup)
![GitHub top language](https://img.shields.io/github/languages/top/wbfoss/rdap-lookup)
![Code size](https://img.shields.io/github/languages/code-size/wbfoss/rdap-lookup)
![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.png?v=103)

# 🔍 RDAP Lookup - Modern Domain Intelligence & Security Platform

A comprehensive **RDAP (Registration Data Access Protocol)** lookup tool and cybersecurity platform built with **Next.js 16**, **React 19**, and **Tailwind CSS**. This modern, open-source application provides domain intelligence, network analysis, and security research capabilities for cybersecurity professionals, IT administrators, and security researchers.

🌐 **Live Demo:** [https://www.domainintel.in](https://www.domainintel.in)

----------

## 🚀 Why RDAP Over WHOIS?

**RDAP** is the modern, standardized replacement for the legacy WHOIS protocol, offering significant advantages:

### ✅ **Technical Superiority**
- **🔧 Structured JSON Data**: Machine-readable responses vs. unstructured text
- **🌍 Internationalization**: Native support for IDNs and Unicode characters
- **🔒 Security First**: HTTPS encryption and authentication support
- **⚡ RESTful API**: Standard HTTP methods and status codes
- **🎯 Standardized**: Consistent format across all registries and registrars

### ✅ **Modern Features**
- **🛡️ Privacy Compliance**: Built-in GDPR and privacy regulation support
- **📊 Structured Responses**: Consistent JSON format eliminates parsing issues
- **🔍 Enhanced Search**: Better support for IP ranges, ASNs, and entities
- **⚙️ Extensible**: Designed for future enhancements and integrations

----------

## 🎯 Core Features

### 🔍 **RDAP Lookup Capabilities**
- **Domain Lookup**: Complete registration data, nameservers, contacts, and dates
- **IP Address Lookup**: Network allocation, organization details, and CIDR blocks
- **ASN Lookup**: Autonomous System information and routing data
- **Entity Lookup**: Registrar and contact information

### 🛡️ **Security Analysis Suite (14 Tools)**
- **SSL/TLS Certificate Analysis**: Certificate validation, chain verification, and security assessment
- **Email Security**: SPF, DMARC, and DKIM record validation and analysis
- **DNSSEC Validation**: Domain security extension verification
- **Blacklist Checking**: Multi-provider RBL/DNSBL verification
- **Domain Intelligence**: Age calculation, reputation scoring, and registration analysis
- **Threat Detection**: Typosquatting, homograph attacks, and malware C2 detection
- **Certificate Transparency**: CT log monitoring and anomaly detection
- **Advanced Analysis**: Domain parking, fast flux detection, and suspicious TLD flagging

### 🎨 **User Experience**
- **Clean, Minimalistic UI**: Professional interface focused on usability
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Real-time Results**: Fast, comprehensive analysis with structured display
- **Export Capabilities**: Copy results as JSON for integration

### 🔧 **Developer Features**
- **Rate Limiting**: Configurable limits to prevent abuse
- **Error Handling**: User-friendly error messages and fallback mechanisms
- **API Ready**: Built for future API exposure and integrations
- **Open Source**: Fully transparent and community-driven development

----------

## 🛠️ Technology Stack

- **⚡ Next.js 14**: React framework with App Router for optimal performance
- **⚛️ React 18**: Modern React with latest features and optimizations
- **🎨 Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **🔧 TypeScript Ready**: Prepared for type-safe development
- **☁️ Vercel Deployment**: Optimized for edge computing and global performance
- **🔒 Security Focused**: Built-in security headers and best practices

----------

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Optional: hCaptcha account for bot protection

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/wbfoss/rdap-lookup.git
   cd rdap-lookup
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment setup** (optional):
   Create `.env.local` for advanced features:
   ```env
   # hCaptcha (optional - for bot protection)
   HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key
   NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key

   # Rate limiting (optional)
   RDAP_LOOKUP_MAX_QUERIES=100
   RDAP_LOOKUP_RATE_LIMIT_SECONDS=15
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for production**:
   ```bash
   npm run build
   npm run start
   ```

----------

## 📖 Usage Guide

### Basic RDAP Lookup
1. **Select Query Type**: Choose from Domain, IP, ASN, or Entity
2. **Enter Target**: Input domain name (e.g., `google.com`), IP address (e.g., `8.8.8.8`), or ASN (e.g., `AS15169`)
3. **Optional Settings**: For domains, specify DKIM selector if needed
4. **Execute Lookup**: Click "Lookup" to retrieve comprehensive RDAP data
5. **Analyze Results**: Review structured data in the Overview tab or raw JSON in the Raw tab

### Advanced Features
- **Copy Results**: Export complete analysis as JSON for further processing
- **Security Analysis**: Automatic SSL, DNS, and email security checks for domains
- **Security Tools Suite**: Access to 14 specialized cybersecurity analysis tools
- **Fallback Mechanisms**: Automatic failover to IANA RDAP service for reliability
- **Rate Limiting**: Built-in protection against abuse while allowing legitimate research

----------

## 🛡️ Security Tools Suite (14 Tools Available)

Our comprehensive cybersecurity toolkit is now available (see `/tools` page):

### 🎯 **Phase 1: Core Security Intelligence** ✅ **COMPLETED**

#### 📊 **Domain Intelligence Tools**
- ✅ **Domain Age Calculator** - Identify newly registered domains and flag suspicious young domains
- ✅ **Domain Reputation Scoring** - Multi-factor risk assessment and reputation analysis
- ✅ **Domain Parking Analysis** - Detect parked domains and potential cybersquatting

#### 🔍 **Threat Detection Tools**
- ✅ **Typosquatting Detection** - Find domain variations and suspicious registrations
- ✅ **Homograph Attack Detection** - Identify Unicode character attacks and spoofing attempts
- ✅ **Malware C2 Detection** - Command & control infrastructure analysis
- ✅ **Fast Flux Detection** - Identify fast-changing malicious hosting patterns
- ✅ **Suspicious TLD Flagging** - Risk assessment based on top-level domains

#### 🔒 **Certificate & SSL Tools**
- ✅ **SSL Configuration Assessment** - Comprehensive SSL/TLS security analysis
- ✅ **Certificate Transparency Monitoring** - CT log analysis and anomaly detection

#### 📧 **Email Security Tools**
- ✅ **SPF Analysis** - Sender Policy Framework record validation and assessment
- ✅ **DMARC Assessment** - DMARC policy analysis and implementation guidance

#### 🛡️ **Threat Intelligence Tools**
- ✅ **Blacklist Aggregation** - Multi-provider security vendor blacklist checking
- ✅ **Phishing Lookup** - Domain-based phishing detection and analysis

### 🔍 **Future Phases**
- Threat intelligence integration
- Passive DNS analysis
- Network topology mapping
- Machine learning threat detection
- Enterprise monitoring and alerting

----------

## 🤝 Contributing

We welcome contributions from the cybersecurity and development community!

### How to Contribute
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Areas
- 🔧 **Core Features**: RDAP parsing improvements and new query types
- 🛡️ **Security Tools**: Implementation of planned cybersecurity features
- 🎨 **UI/UX**: Interface improvements and user experience enhancements
- 📚 **Documentation**: Guides, tutorials, and API documentation
- 🧪 **Testing**: Test coverage and quality assurance

----------

## 📊 Project Stats

- **🎯 Purpose**: Domain intelligence and cybersecurity research
- **👥 Target Users**: Security researchers, IT professionals, cybersecurity analysts
- **🛡️ Security Tools**: 14 specialized tools available with 54+ more planned
- **📈 Roadmap**: Phase 1 complete, continuing development across 4 phases
- **🔄 Updates**: Active development with regular feature releases
- **🌍 Accessibility**: Free, open-source, and globally available

----------

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Open Source Commitment
- ✅ **Free Forever**: Core functionality will always be free
- ✅ **Community Driven**: Development guided by user feedback
- ✅ **Transparent**: All code and development processes are public
- ✅ **Secure**: Regular security audits and updates

----------

## 🙏 Acknowledgments

Special thanks to:
- **IANA** for RDAP bootstrap data and standards
- **IETF** for RDAP protocol development (RFC 7483)
- **Vercel** for hosting and deployment platform
- **Open Source Community** for contributions and feedback

----------

## 📞 Support & Community

- **🐛 Issues**: [GitHub Issues](https://github.com/wbfoss/rdap-lookup/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/wbfoss/rdap-lookup/discussions)
- **📧 Security**: Report security issues responsibly via GitHub Security tab
- **⭐ Star**: Show support by starring the repository

---

**Built with ❤️ by the cybersecurity community for the cybersecurity community.**

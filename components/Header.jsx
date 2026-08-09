"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Star,
  Menu,
  X,
  Zap
} from "lucide-react";

export default function Header() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [starCount, setStarCount] = useState(null);
  const pathname = usePathname();

  // Fetch GitHub star count
  useEffect(() => {
    const fetchStarCount = async () => {
      try {
        const response = await fetch("https://api.github.com/repos/wbfoss/rdap-lookup");
        const data = await response.json();
        setStarCount(data.stargazers_count);
      } catch (error) {
        console.error("Failed to fetch star count:", error);
      }
    };
    fetchStarCount();
  }, []);

  const navigation = [
    { name: "Home", href: "/", current: pathname === "/" },
    { name: "Tools", href: "/tools", current: pathname === "/tools" },
    { name: "About", href: "/about", current: pathname === "/about" },
    { name: "What is RDAP?", href: "/what-is-rdap", current: pathname === "/what-is-rdap" },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900">DomainIntel</h1>
                <p className="text-xs text-gray-500">Domain Intelligence Platform</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  item.current
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="hidden md:flex items-center space-x-3">
            {/* GitHub Button with Star Count */}
            <a
              href="https://github.com/wbfoss/rdap-lookup"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-all hover:scale-105"
            >
              <Star className="w-4 h-4" />
              <span>Star</span>
              {starCount && (
                <span className="bg-white text-gray-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {starCount.toLocaleString()}
                </span>
              )}
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setShowMobileMenu(false)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              <div className="px-3 py-2">
                <a
                  href="https://github.com/wbfoss/rdap-lookup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors w-full justify-center"
                >
                  <Star className="w-4 h-4" />
                  <span>Star on GitHub</span>
                  {starCount && (
                    <span className="bg-white text-gray-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {starCount.toLocaleString()}
                    </span>
                  )}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
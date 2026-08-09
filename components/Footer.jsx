import Link from "next/link";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} DomainIntel. All Rights Reserved.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Built with <Heart className="inline w-3 h-3 text-red-500" /> by the open-source community.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/about" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">About</Link>
            <Link href="/what-is-rdap" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">What is RDAP?</Link>
            <a href="https://github.com/wbfoss/rdap-lookup" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
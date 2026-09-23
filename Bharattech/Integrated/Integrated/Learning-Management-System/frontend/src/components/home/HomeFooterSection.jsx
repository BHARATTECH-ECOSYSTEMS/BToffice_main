import React from "react";
import { Link } from "react-router-dom";

export default function HomeFooterSection() {
  return (
    <div className="flex flex-col lg:flex-row bg-slate-900 border-t border-slate-700">
      {/* Left Footer */}
      <div className="w-full lg:w-[40%] p-6 sm:p-8 md:p-12 lg:p-16 relative overflow-hidden lg:border-r border-b lg:border-b-0 border-slate-700">
        <div className="absolute bottom-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-red-900 rounded-full blur-3xl opacity-30"></div>
        <div className="relative z-10">
          <div className="h-px bg-gray-600 mb-4 sm:mb-6"></div>
          <p className="text-gray-400 text-xs sm:text-sm">
            © Bharattech Softech Pvt Ltd - 2024. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Footer */}
      <div className="w-full lg:w-[60%] bg-white p-6 sm:p-8 md:p-12 lg:p-16">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Send Money</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
              <li><Link to="/contact" className="hover:text-orange-500">Help</Link></li>
              <li><Link to="/contact" className="hover:text-orange-500">Contact</Link></li>
              <li><Link to="/services" className="hover:text-orange-500">Fees</Link></li>
              <li><Link to="/about" className="hover:text-orange-500">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Company</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
              <li><Link to="/services" className="hover:text-orange-500">Money apps</Link></li>
              <li><Link to="/about" className="hover:text-orange-500">About us</Link></li>
              <li><Link to="/startups" className="hover:text-orange-500">Deals</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Services</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
              <li><Link to="/services" className="hover:text-orange-500">What we do</Link></li>
              <li><Link to="/services" className="hover:text-orange-500">Benefits</Link></li>
              <li><Link to="/about" className="hover:text-orange-500">News</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Resources</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
              <li><Link to="/contact" className="hover:text-orange-500">FAQ</Link></li>
              <li><Link to="/login" className="hover:text-orange-500">Your account</Link></li>
              <li><Link to="/services" className="hover:text-orange-500">Cash transfer</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

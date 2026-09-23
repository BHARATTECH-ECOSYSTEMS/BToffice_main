import React from "react";
import { ArrowRight } from "lucide-react";
import { services } from "./HomeHeroSection";

export default function HomeServicesSection({ navigate }) {
  return (
    <div className="flex flex-col lg:flex-row bg-white">
      {/* Left Section - Extra Reviews */}
      <div className="w-full lg:w-[40%] bg-slate-900 p-6 sm:p-8 md:p-12 lg:p-16">
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
          <p className="text-gray-300 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
            Consectetur corporis totaled quasi id voluptas molestiae aut harum. Perspiciatis omnis ad et nostrud turip ad ipsum odio qui amet et nisi non.
          </p>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-orange-500 flex items-center justify-center bg-slate-700 text-white font-semibold">
              A
            </div>
            <div>
              <div className="text-white font-semibold text-sm sm:text-base">Albert Flores</div>
              <div className="text-gray-400 text-xs sm:text-sm">Project Manager</div>
              <div className="text-gray-500 text-xs mt-1">GB 4 Weeks ago</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Services Grid */}
      <div className="w-full lg:w-[60%] bg-white p-6 sm:p-8 md:p-12 lg:p-16 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-gray-900 mb-4 sm:mb-6 leading-tight">
            A Wide Choice of Ways to Send Money Online from the UK
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl">
            Worldremit is a fast and secure service that lets you transfer money online using a computer, smartphone, or our app.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6 sm:mt-8">
            {services.map((service, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="text-orange-500 mb-2 sm:mb-3">{service.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">{service.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">{service.description}</p>
                {idx === 3 && (
                  <button
                    onClick={() => navigate("/services")}
                    className="text-orange-500 text-xs sm:text-sm font-medium flex items-center gap-1 hover:text-orange-600"
                  >
                    Learn <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

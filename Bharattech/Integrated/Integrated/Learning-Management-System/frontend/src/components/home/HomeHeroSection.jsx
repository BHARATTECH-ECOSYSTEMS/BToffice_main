import React from "react";
import { Star, ArrowRight, Send, Smartphone, Radio, MapPin } from "lucide-react";

export const reviews = [
  {
    id: 1,
    text: "Consectetur corporis totaled quasi id voluptas molestiae aut harum. Perspiciatis omnis ad et nostrud turip ad ipsum odio qui amet et nisi non.",
    name: "Darrell Steward",
    role: "President of Sales",
    location: "BD",
    time: "2 Weeks ago",
    avatarColor: "blue",
  },
  {
    id: 2,
    text: "Consectetur corporis totaled quasi id voluptas molestiae aut harum. Perspiciatis omnis ad et nostrud turip ad ipsum odio qui amet et nisi non.",
    name: "Cameron Williamson",
    role: "Software Developer",
    location: "JP",
    time: "1 Weeks ago",
    avatarColor: "orange",
  },
];

export const services = [
  { icon: <Send className="w-6 h-6" />, title: "Transfer", description: "Send a unique bank transfer directly, with our secure" },
  { icon: <Smartphone className="w-6 h-6" />, title: "Money", description: "Send directly to mobile money account across the glob." },
  { icon: <Radio className="w-6 h-6" />, title: "Top Up", description: "You're here, but your friend and family are thousands of miles" },
  { icon: <MapPin className="w-6 h-6" />, title: "Pickup", description: "Cash is visible to collect with in minutes from many location." },
];

export default function HomeHeroSection({
  emailInput,
  setEmailInput,
  isLoading,
  setIsLoading,
  navigate,
}) {
  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-86px)]">
      {/* Left Section - Dark Background */}
      <div className="w-full lg:w-[40%] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 md:mb-8 leading-tight">
            50k Reviews from Our Clients
          </h2>

          <div className="space-y-4 sm:space-y-6 mt-8 sm:mt-12">
            {reviews.slice(0, 2).map((review) => (
              <div key={review.id} className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
                <p className="text-gray-300 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">{review.text}</p>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex-shrink-0 ${
                      review.avatarColor === "blue" ? "border-blue-500" : "border-orange-500"
                    } flex items-center justify-center bg-slate-700`}
                  >
                    <span className="text-white font-semibold text-sm sm:text-base">{review.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm sm:text-base truncate">{review.name}</div>
                    <div className="text-gray-400 text-xs sm:text-sm">{review.role}</div>
                    <div className="text-gray-500 text-xs mt-1">{review.location} {review.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Section - Light Background with CTA */}
      <div className="w-full lg:w-[60%] bg-gradient-to-br from-white via-orange-50/30 to-purple-50/20 relative overflow-hidden">
        <div className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 leading-tight">
            <span className="text-gray-900">A Better Way to</span>
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-orange-600 to-purple-600 bg-clip-text text-transparent">
              Send Money
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl leading-relaxed">
            95% of our translators are ready in minutes. We use industry-leading technology to protect your money.
          </p>

          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md">
              <input
                type="email"
                placeholder="Enter your email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && emailInput.trim()) navigate("/login");
                }}
                className="w-full px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={() => {
                  if (emailInput.trim()) {
                    setIsLoading(true);
                    setTimeout(() => {
                      setIsLoading(false);
                      navigate("/login");
                    }, 500);
                  } else {
                    navigate("/login");
                  }
                }}
                disabled={isLoading}
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 text-white rounded-xl font-bold text-sm sm:text-base hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg"
              >
                {isLoading ? "Signing up..." : "Sign up free"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-8 sm:mb-12 flex-wrap">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-green-500 text-green-500" />
            <span className="text-green-600 font-semibold text-sm sm:text-base">Trustpilot</span>
            <span className="text-gray-600 text-xs sm:text-sm">95/129 Great Review</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-8 sm:mt-12">
            {services.map((service, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="text-orange-500 mb-2 sm:mb-3">{service.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">{service.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">{service.description}</p>
                {idx === 3 && (
                  <button className="text-orange-500 text-xs sm:text-sm font-medium flex items-center gap-1">
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

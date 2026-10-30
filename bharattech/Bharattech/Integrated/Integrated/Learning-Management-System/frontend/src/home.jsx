import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import TopNav from "./components/topnav";
import { ChevronDown, Star, ArrowRight, Send, Smartphone, Radio, MapPin } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [activeTab, setActiveTab] = useState("General");
  const [emailInput, setEmailInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const reviews = [
    {
      id: 1,
      text: "Consectetur corporis totaled quasi id voluptas molestiae aut harum. Perspiciatis omnis ad et nostrud turip ad ipsum odio qui amet et nisi non.",
      name: "Darrell Steward",
      role: "President of Sales",
      location: "BD",
      time: "2 Weeks ago",
      avatarColor: "blue"
    },
    {
      id: 2,
      text: "Consectetur corporis totaled quasi id voluptas molestiae aut harum. Perspiciatis omnis ad et nostrud turip ad ipsum odio qui amet et nisi non.",
      name: "Cameron Williamson",
      role: "Software Developer",
      location: "JP",
      time: "1 Weeks ago",
      avatarColor: "orange"
    },
    {
      id: 3,
      text: "Consectetur corporis totaled quasi id voluptas molestiae aut harum. Perspiciatis omnis ad et nostrud turip ad ipsum odio qui amet et nisi non.",
      name: "Albert Flores",
      role: "Project Manager",
      location: "GB",
      time: "4 Weeks ago",
      avatarColor: "orange"
    },
    {
      id: 4,
      text: "Consectetur corporis totaled quasi id voluptas molestiae aut harum. Perspiciatis omnis ad et nostrud turip ad ipsum odio qui amet et nisi non.",
      name: "Savannah Nguyen",
      role: "Project Manager",
      location: "FR",
      time: "3 Weeks ago",
      avatarColor: "yellow"
    }
  ];

  const faqTabs = ["General", "Transaction", "Payment"];

  const faqItems = {
    General: [
      { question: "How Safe Our Transaction is?", answer: "Our transactions are secured with industry-leading encryption..." },
      { question: "What Verification do I Need for Send Money", answer: "You need to provide valid identification documents..." }
    ],
    Transaction: [
      { question: "How Long will It Take for My Money to Arrive", answer: "Most transactions are completed within minutes..." },
      { question: "How much do I need for a down payment?", answer: "The minimum amount varies by transaction type..." }
    ],
    Payment: [
      { question: "What payment methods are accepted?", answer: "We accept credit cards, bank transfers, and mobile payments..." }
    ]
  };

  const services = [
    {
      icon: <Send className="w-6 h-6" />,
      title: "Transfer",
      description: "Send a unique bank transfer directly, with our secure"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Money",
      description: "Send directly to mobile money account across the glob."
    },
    {
      icon: <Radio className="w-6 h-6" />,
      title: "Top Up",
      description: "You're here, but your friend and family are thousands of miles"
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Pickup",
      description: "Cash is visible to collect with in minutes from many location."
    }
  ];

  return (
    <>
      <TopNav />
      
      {/* Main Content */}
      <div className="pt-[86px]">
        {/* Hero Section - Split Layout */}
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-86px)]">
          {/* Left Section - Dark Background */}
          <div className="w-full lg:w-[40%] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute inset-0 opacity-10 hidden md:block">
              <div className="absolute top-20 right-20 text-4xl md:text-6xl font-bold text-white/20">DE</div>
              <div className="absolute top-40 right-40 text-4xl md:text-6xl font-bold text-white/20">JP</div>
              <div className="absolute top-60 right-20 text-4xl md:text-6xl font-bold text-white/20">RU</div>
              <div className="absolute top-80 right-40 text-4xl md:text-6xl font-bold text-white/20">BD</div>
              <div className="absolute top-32 right-60 text-4xl md:text-6xl font-bold text-white/20">GB</div>
            </div>

            <div className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 md:mb-8 leading-tight">
                50k Reviews from Our Clients
              </h2>

              {/* Review Cards */}
              <div className="space-y-4 sm:space-y-6 mt-8 sm:mt-12">
                {reviews.slice(0, 2).map((review) => (
                  <div key={review.id} className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
                    <p className="text-gray-300 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">{review.text}</p>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex-shrink-0 ${
                        review.avatarColor === "blue" ? "border-blue-500" : 
                        review.avatarColor === "orange" ? "border-orange-500" : 
                        "border-yellow-500"
                      } flex items-center justify-center bg-slate-700`}>
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

          {/* Right Section - Light Background with Premium Styling */}
          <div className="w-full lg:w-[60%] bg-gradient-to-br from-white via-orange-50/30 to-purple-50/20 relative overflow-hidden">
            {/* Enhanced Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-gradient-to-br from-purple-300 to-purple-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-96 sm:h-96 bg-gradient-to-tr from-orange-300 to-orange-500 rounded-full blur-3xl opacity-25 animate-float"></div>
            <div className="absolute top-20 left-20 w-4 h-4 bg-orange-400 rounded-full blur-sm hidden sm:block animate-float" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-40 right-40 w-8 h-8 bg-purple-400 rounded-full blur-sm hidden sm:block animate-float" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-20 right-20 w-6 h-6 bg-orange-300 rounded-full blur-md hidden sm:block animate-float" style={{ animationDelay: '1.5s' }}></div>

            <div className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-16 animate-fade-in-up">
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

              {/* Enhanced Sign Up Form */}
              <div className="mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md">
                  <div className="flex-1 relative group">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && emailInput.trim()) {
                          navigate("/login");
                        }
                      }}
                      className="w-full px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 hover:border-orange-300 shadow-sm"
                    />
                  </div>
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
                    className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 text-white rounded-xl font-bold text-sm sm:text-base hover:from-orange-600 hover:via-orange-700 hover:to-orange-600 transition-all duration-300 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 relative overflow-hidden group"
                  >
                    <span className="relative z-10">{isLoading ? "Signing up..." : "Sign up free"}</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                  </button>
                </div>
              </div>

              {/* Trustpilot Rating */}
              <div className="flex items-center gap-2 mb-8 sm:mb-12 flex-wrap">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-green-500 text-green-500" />
                <span className="text-green-600 font-semibold text-sm sm:text-base">Trustpilot</span>
                <span className="text-gray-600 text-xs sm:text-sm">95/129 Great Review</span>
              </div>

              {/* Service Cards */}
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

        {/* Additional Content Section */}
        <div className="flex flex-col lg:flex-row bg-white">
          {/* Left Section - More Reviews */}
          <div className="w-full lg:w-[40%] bg-slate-900 p-6 sm:p-8 md:p-12 lg:p-16">
            <div className="space-y-4 sm:space-y-6">
              {reviews.slice(2, 4).map((review) => (
                <div key={review.id} className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
                  <p className="text-gray-300 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">{review.text}</p>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex-shrink-0 ${
                      review.avatarColor === "orange" ? "border-orange-500" : "border-yellow-500"
                    } flex items-center justify-center bg-slate-700`}>
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

          {/* Right Section - Main Content */}
          <div className="w-full lg:w-[60%] bg-white p-6 sm:p-8 md:p-12 lg:p-16 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-48 h-48 sm:w-96 sm:h-96 bg-purple-100 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-orange-100 rounded-full blur-3xl opacity-20"></div>
            
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-gray-900 mb-4 sm:mb-6 leading-tight">
                A Wide Choice of Ways to Send Money Online from the UK
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl">
                Worldremit is a fast and secure service that lets you transfer money online using a computer, smartphone, or our app.
              </p>

              {/* Service Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6 sm:mt-8">
                {services.map((service, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="text-orange-500 mb-2 sm:mb-3">{service.icon}</div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">{service.title}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">{service.description}</p>
                    {idx === 3 && (
                      <button 
                        onClick={() => navigate("/services")}
                        className="text-orange-500 text-xs sm:text-sm font-medium flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer"
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

        {/* Bottom Content Section */}
        <div className="flex flex-col lg:flex-row bg-white">
          {/* Left Section - FAQ Navigation */}
          <div className="w-full lg:w-[40%] bg-slate-900 p-6 sm:p-8 md:p-12 lg:p-16 lg:border-r border-b lg:border-b-0 border-slate-700">
            <div className="mb-4 sm:mb-6">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-gray-400 hover:text-white mb-3 sm:mb-4 text-sm sm:text-base transition-colors cursor-pointer"
              >
                Return
              </button>
              <div className="text-white text-lg sm:text-xl mb-4 sm:mb-6">Client</div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {faqItems.Transaction.map((item, idx) => (
                <div key={idx} className="bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-700">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === `transaction-${idx}` ? null : `transaction-${idx}`)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="text-white text-xs sm:text-sm pr-2">{item.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                        expandedFaq === `transaction-${idx}` ? "transform rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedFaq === `transaction-${idx}` && (
                    <p className="text-gray-400 mt-3 text-xs sm:text-sm">{item.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Section - Content Cards */}
          <div className="w-full lg:w-[60%] bg-white p-6 sm:p-8 md:p-12 lg:p-16 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-48 h-48 sm:w-96 sm:h-96 bg-pink-100 rounded-full blur-3xl opacity-20"></div>
            
            <div className="relative z-10 space-y-4 sm:space-y-6 mb-8 sm:mb-12">
              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">API, straight to user.</h3>
                <button 
                  onClick={() => navigate("/services")}
                  className="text-orange-500 text-xs sm:text-sm font-medium flex items-center gap-1 mt-3 sm:mt-4 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  Learn More <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Secure transactions.</h3>
                <button 
                  onClick={() => navigate("/services")}
                  className="text-orange-500 text-xs sm:text-sm font-medium flex items-center gap-1 mt-3 sm:mt-4 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  Learn More <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Fast processing.</h3>
                <button 
                  onClick={() => navigate("/services")}
                  className="text-orange-500 text-xs sm:text-sm font-medium flex items-center gap-1 mt-3 sm:mt-4 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  Learn More <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-gray-900 mb-4 sm:mb-6 leading-tight">
                A Fast and Secure Way to Send Money on the Go in the UK
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl leading-relaxed">
                Get access to a new way to pay. Sign up for an account and checkout with payment or millions of online stores with us. Checking out with crypto is a taxable transaction. Fees and exchange rates will apply.
              </p>
              <button 
                onClick={() => navigate("/login")}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-black text-white rounded-lg font-medium text-sm sm:text-base hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Sign up free
              </button>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div id="faq-section" className="flex flex-col lg:flex-row bg-slate-900 min-h-screen">
          {/* Left Sidebar - FAQ Navigation */}
          <div className="w-full lg:w-[40%] p-6 sm:p-8 md:p-12 lg:p-16 lg:border-r border-b lg:border-b-0 border-slate-700">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-white mb-6 sm:mb-8 leading-tight">
              Ask Anything if You have Any Question
            </h2>
            <div className="space-y-2 mt-6 sm:mt-8">
              {faqTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                    activeTab === tab
                      ? "bg-slate-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Right Content - FAQ Items */}
          <div className="w-full lg:w-[60%] p-6 sm:p-8 md:p-12 lg:p-16">
            <div className="space-y-3 sm:space-y-4">
              {faqItems[activeTab]?.map((item, idx) => (
                <div key={idx} className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-3"
                  >
                    <span className="text-white font-medium text-sm sm:text-base pr-2">{item.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform flex-shrink-0 ${
                        expandedFaq === idx ? "transform rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedFaq === idx && (
                    <p className="text-gray-400 mt-3 sm:mt-4 text-sm sm:text-base">{item.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col lg:flex-row bg-slate-900 border-t border-slate-700">
          {/* Left Footer - Dark */}
          <div className="w-full lg:w-[40%] p-6 sm:p-8 md:p-12 lg:p-16 relative overflow-hidden lg:border-r border-b lg:border-b-0 border-slate-700">
            <div className="absolute bottom-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-red-900 rounded-full blur-3xl opacity-30"></div>
            <div className="relative z-10">
              <div className="h-px bg-gray-600 mb-4 sm:mb-6"></div>
              <p className="text-gray-400 text-xs sm:text-sm">
                © Bharattech Softech Pvt Ltd - 2024. All rights reserved.
              </p>
            </div>
          </div>

          {/* Right Footer - Links */}
          <div className="w-full lg:w-[60%] bg-white p-6 sm:p-8 md:p-12 lg:p-16">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Send Money</h4>
                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                  <li><Link to="/contact" className="hover:text-orange-500 transition-colors">Help</Link></li>
                  <li><Link to="/contact" className="hover:text-orange-500 transition-colors">Contact</Link></li>
                  <li><Link to="/services" className="hover:text-orange-500 transition-colors">Fees</Link></li>
                  <li><Link to="/about" className="hover:text-orange-500 transition-colors">Careers</Link></li>
                  <li><Link to="/services" className="hover:text-orange-500 transition-colors">Apps-Shop</Link></li>
                  <li><Link to="/contact" className="hover:text-orange-500 transition-colors">Feedback</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Send Money</h4>
                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                  <li><Link to="/services" className="hover:text-orange-500 transition-colors">Money apps</Link></li>
                  <li><Link to="/about" className="hover:text-orange-500 transition-colors">About us</Link></li>
                  <li><Link to="/services" className="hover:text-orange-500 transition-colors">Directories</Link></li>
                  <li><Link to="/startups" className="hover:text-orange-500 transition-colors">Deals</Link></li>
                  <li><Link to="/about" className="hover:text-orange-500 transition-colors">Blog</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Send Money</h4>
                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                  <li><Link to="/services" className="hover:text-orange-500 transition-colors">What we do</Link></li>
                  <li><Link to="/services" className="hover:text-orange-500 transition-colors">Benefits</Link></li>
                  <li><Link to="/services" className="hover:text-orange-500 transition-colors">Mobile apps</Link></li>
                  <li><Link to="/about" className="hover:text-orange-500 transition-colors">Work us</Link></li>
                  <li><Link to="/about" className="hover:text-orange-500 transition-colors">News</Link></li>
                  <li><Link to="/about" className="hover:text-orange-500 transition-colors">Blog</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Resources</h4>
                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                  <li><button onClick={() => window.scrollTo({ top: document.getElementById('faq-section')?.offsetTop || 0, behavior: 'smooth' })} className="hover:text-orange-500 transition-colors text-left">FAQ</button></li>
                  <li><Link to="/contact" className="hover:text-orange-500 transition-colors">Get started FAQ</Link></li>
                  <li><Link to="/login" className="hover:text-orange-500 transition-colors">Your account</Link></li>
                  <li><Link to="/services" className="hover:text-orange-500 transition-colors">Cash transfer</Link></li>
                  <li><Link to="/services" className="hover:text-orange-500 transition-colors">Bank transfer</Link></li>
                  <li><Link to="/contact" className="hover:text-orange-500 transition-colors">Address tutorial</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


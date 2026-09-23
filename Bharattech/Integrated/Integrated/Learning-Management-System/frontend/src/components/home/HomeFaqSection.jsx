import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export const faqTabs = ["General", "Transaction", "Payment"];

export const faqItems = {
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

export default function HomeFaqSection() {
  const [activeTab, setActiveTab] = useState("General");
  const [expandedFaq, setExpandedFaq] = useState(null);

  return (
    <div id="faq-section" className="flex flex-col lg:flex-row bg-slate-900 min-h-screen">
      {/* Left Sidebar */}
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
                activeTab === tab ? "bg-slate-800 text-white" : "text-gray-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Right Content */}
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
  );
}

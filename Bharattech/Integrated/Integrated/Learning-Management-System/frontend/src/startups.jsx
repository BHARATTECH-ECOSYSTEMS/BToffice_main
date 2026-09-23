import React from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { ArrowRight } from "lucide-react";
import StartupProgramsSection from "./components/startups/StartupProgramsSection";
import StartupStoriesSection from "./components/startups/StartupStoriesSection";

const STEPS = [
  { step: "01", title: "Submit Application", desc: "Tell us about your startup idea" },
  { step: "02", title: "Initial Review", desc: "Our team evaluates your application" },
  { step: "03", title: "Pitch Session", desc: "Present your idea to our panel" },
  { step: "04", title: "Program Start", desc: "Begin your acceleration journey" }
];

const Startups = () => {
  const navigate = useNavigate();
  
  const handleApply = (program = "Startup Program") => {
    navigate("/contact", { state: { interest: program } });
  };
  
  const handleScheduleCall = () => {
    window.open("mailto:support@bharattech.com?subject=Startup Program Inquiry", "_blank");
  };

  return (
    <>
      <TopNav />
      <div className="min-h-screen bg-white pt-28">
        <div className="max-w-7xl mx-auto px-6">
          {/* Hero Section */}
          <section className="relative py-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-white to-white" />
            <div className="relative z-10 text-center max-w-4xl mx-auto">
              <Badge variant="outline" className="mb-4 px-4 py-1.5 rounded-md text-sm">
                Startup Support
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="text-gray-900">Empowering</span>
                <br />
                <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                  Startups
                </span>
                <span className="text-gray-900"> with Deep-Tech</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                From ideation to scale, we provide comprehensive support to transform your startup dreams into successful tech ventures.
              </p>
              <Button 
                onClick={() => handleApply("Startup Program")}
                className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-6 py-3 rounded-md font-medium cursor-pointer"
              >
                Apply Now <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </section>

          {/* Programs Section */}
          <StartupProgramsSection onLearnMore={(title) => handleApply(title)} />

          {/* Success Stories */}
          <StartupStoriesSection />

          {/* Application Process */}
          <section className="py-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How to Apply</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">Simple steps to join our startup ecosystem and accelerate your growth.</p>
            </div>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
              {STEPS.map((step, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-gradient-to-r from-orange-50/50 to-purple-50/50 rounded-2xl mb-12">
            <div className="text-center max-w-4xl mx-auto px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Ready to Scale Your Startup?</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">Join our ecosystem of innovative startups and get the support you need to succeed.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => handleApply("Startup Program Application")}
                  className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 text-white px-6 py-3 rounded-md font-medium cursor-pointer"
                >
                  Apply for Program
                </Button>
                <Button onClick={handleScheduleCall} variant="outline" size="lg" className="cursor-pointer">
                  Schedule a Call
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default Startups;

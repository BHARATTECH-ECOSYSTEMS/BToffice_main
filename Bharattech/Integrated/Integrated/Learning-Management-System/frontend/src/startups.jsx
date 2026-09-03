import React from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { ArrowRight, Rocket, Users, Target, Lightbulb, TrendingUp, Award } from "lucide-react";

const Startups = () => {
  const navigate = useNavigate();
  
  const handleApplyNow = () => {
    navigate("/contact", { state: { interest: "Startup Program" } });
  };
  
  const handleLearnMore = (programTitle) => {
    navigate("/contact", { state: { interest: programTitle } });
  };
  
  const handleApplyProgram = () => {
    navigate("/contact", { state: { interest: "Startup Program Application" } });
  };
  
  const handleScheduleCall = () => {
    window.open("mailto:support@bharattech.com?subject=Startup Program Inquiry", "_blank");
  };
  const programs = [
    {
      icon: <Rocket className="w-8 h-8" />,
      title: "Startup Incubation",
      description: "Complete support from idea to market launch",
      duration: "6-12 months",
      features: ["Mentorship", "Funding Support", "Technical Guidance", "Market Research"],
      investment: "Equity-based"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Tech Acceleration",
      description: "Fast-track your product development with our tech expertise",
      duration: "3-6 months",
      features: ["MVP Development", "AI Integration", "Cloud Infrastructure", "Technical Team"],
      investment: "₹5,00,000+"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Market Entry",
      description: "Strategic support for market penetration and growth",
      duration: "4-8 months",
      features: ["Go-to-Market Strategy", "Customer Acquisition", "Sales Support", "Partnerships"],
      investment: "Revenue Share"
    }
  ];

  const successStories = [
    {
      name: "TechVenture AI",
      industry: "Healthcare",
      growth: "300% in 18 months",
      description: "AI-powered diagnostic platform that revolutionized medical imaging."
    },
    {
      name: "AgriSmart",
      industry: "Agriculture",
      growth: "₹50L ARR in 1 year",
      description: "IoT and AI solution for precision farming and crop optimization."
    },
    {
      name: "FinanceFlow",
      industry: "Fintech",
      growth: "100K+ users",
      description: "Blockchain-based payment solution for SMEs and startups."
    }
  ];

  return (
    <>
      <TopNav />
      
      <div className="min-h-screen bg-white pt-28">
        <div className="max-w-7xl mx-auto px-6">
          {/* Hero Section */}
          <section className="relative py-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-white to-white" />
            
            <div className="relative z-10">
              <div className="text-center max-w-4xl mx-auto">
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
                  onClick={handleApplyNow}
                  className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-6 py-3 rounded-md font-medium cursor-pointer"
                >
                  Apply Now <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* Programs Section */}
          <section className="py-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Our Startup Programs
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Tailored programs designed to accelerate your startup journey at every stage.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {programs.map((program, index) => (
                <Card key={index} className="border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="w-16 h-16 bg-orange-500 rounded-lg flex items-center justify-center text-white mb-4">
                      {program.icon}
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">{program.title}</CardTitle>
                    <CardDescription className="text-gray-600">{program.description}</CardDescription>
                    <Badge variant="secondary" className="w-fit mt-2">
                      {program.duration}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {program.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="text-lg font-semibold text-orange-500 mb-4">
                      {program.investment}
                    </div>
                    <Button 
                      onClick={() => handleLearnMore(program.title)}
                      variant="outline" 
                      className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Learn More
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Success Stories */}
          <section className="py-20 bg-gray-50 rounded-2xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Success Stories
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Meet the startups that have transformed their industries with our support.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {successStories.map((story, index) => (
                <Card key={index} className="border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-lg font-bold text-gray-900">{story.name}</CardTitle>
                      <Award className="w-5 h-5 text-orange-500" />
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {story.industry}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-500 mb-2 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-1" />
                      {story.growth}
                    </div>
                    <p className="text-gray-600 text-sm">
                      {story.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Application Process */}
          <section className="py-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How to Apply
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Simple steps to join our startup ecosystem and accelerate your growth.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { step: "01", title: "Submit Application", desc: "Tell us about your startup idea" },
                  { step: "02", title: "Initial Review", desc: "Our team evaluates your application" },
                  { step: "03", title: "Pitch Session", desc: "Present your idea to our panel" },
                  { step: "04", title: "Program Start", desc: "Begin your acceleration journey" }
                ].map((step, index) => (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                      {step.step}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600 text-sm">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-gradient-to-r from-orange-50/50 to-purple-50/50 rounded-2xl mb-12">
            <div className="text-center max-w-4xl mx-auto px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Ready to Scale Your Startup?
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Join our ecosystem of innovative startups and get the support you need to succeed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={handleApplyProgram}
                  className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-6 py-3 rounded-md font-medium cursor-pointer"
                >
                  Apply for Program
                </Button>
                <Button 
                  onClick={handleScheduleCall}
                  variant="outline" 
                  size="lg"
                  className="cursor-pointer"
                >
                  Schedule Call
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


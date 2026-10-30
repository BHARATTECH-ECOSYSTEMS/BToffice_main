import React from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import { Button } from "./components/ui/button"; 
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "./components/ui/card";
import { Badge } from "./components/ui/badge";

import { 
  ArrowRight, 
  Bot, 
  Brain, 
  Code, 
  Database, 
  Shield, 
  Zap 
} from "lucide-react";

const Services = () => {
  const navigate = useNavigate();
  
  const handleGetStarted = () => {
    navigate("/contact");
  };
  
  const handleLearnMore = (serviceTitle) => {
    // Could navigate to a detailed service page or scroll to more info
    navigate("/contact", { state: { interest: serviceTitle } });
  };
  
  const handleScheduleConsultation = () => {
    window.open("mailto:support@bharattech.com?subject=Consultation Request", "_blank");
  };
  
  const handleStartProject = () => {
    navigate("/contact");
  };
  const services = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: "AI Development",
      description: "Custom AI solutions tailored to your business needs",
      features: [
        "Machine Learning Models",
        "Natural Language Processing",
        "Computer Vision",
        "Predictive Analytics"
      ],
      pricing: "Starting from ₹2,50,000",
      highlighted: false
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Deep Tech Solutions",
      description: "Cutting-edge technology solutions for complex problems",
      features: [
        "Advanced Algorithms",
        "Quantum Computing",
        "IoT Integration",
        "Blockchain Development"
      ],
      pricing: "Starting from ₹5,00,000",
      highlighted: true
    },
    {
      icon: <Code className="w-8 h-8" />,
      title: "Software Development",
      description: "Full-stack development with modern technologies",
      features: [
        "Web Applications",
        "Mobile Apps",
        "Cloud Solutions",
        "API Development"
      ],
      pricing: "Starting from ₹1,50,000",
      highlighted: false
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: "Data Engineering",
      description: "Data infrastructure and analytics solutions",
      features: [
        "Data Pipelines",
        "ETL Processes",
        "Data Warehousing",
        "Real-time Analytics"
      ],
      pricing: "Starting from ₹3,00,000",
      highlighted: false
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Cybersecurity",
      description: "Comprehensive security solutions for digital assets",
      features: [
        "Security Audits",
        "Penetration Testing",
        "Compliance",
        "Risk Assessment"
      ],
      pricing: "Starting from ₹2,00,000",
      highlighted: true
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Digital Transformation",
      description: "End-to-end digital transformation services",
      features: [
        "Process Automation",
        "Legacy Modernization",
        "Cloud Migration",
        "Digital Strategy"
      ],
      pricing: "Starting from ₹4,00,000",
      highlighted: false
    }
  ];

  return (
    <>
      <TopNav />
      
      <div className="min-h-screen bg-white pt-28">
        <div className="max-w-7xl mx-auto px-6">
      
          {/* HERO SECTION */}
          <section className="relative py-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-white to-white" />
            
            <div className="relative z-10">
              <div className="text-center max-w-4xl mx-auto">
                
                <Badge variant="outline" className="mb-4 px-4 py-1.5 rounded-md text-sm">
                  Our Services
                </Badge>

                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  <span className="text-gray-900">Deep-Tech AI Solutions for</span>
                  <br />
                  <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                    Tomorrow
                  </span>
                </h1>

                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                  We deliver cutting-edge AI and deep-tech solutions that transform businesses and drive innovation across industries.
                </p>

                <Button 
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-6 py-3 rounded-md font-medium cursor-pointer"
                >
                  Get Started <ArrowRight className="ml-2 w-4 h-4" />
                </Button>

              </div>
            </div>
          </section>

          {/* SERVICES GRID */}
          <section className="py-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <Card 
                  key={index}
                  className="border rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="w-16 h-16 bg-orange-500 rounded-lg flex items-center justify-center text-white mb-4">
                      {service.icon}
                    </div>

                    <CardTitle className="text-xl font-bold text-gray-900">
                      {service.title}
                    </CardTitle>

                    <CardDescription className="text-gray-600">
                      {service.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {service.features.map((feature, idx) => (
                        <li 
                          key={idx}
                          className="flex items-center text-sm text-gray-600"
                        >
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="text-lg font-semibold text-orange-500 mb-4">
                      {service.pricing}
                    </div>

                    <Button 
                      onClick={() => handleLearnMore(service.title)}
                      className={`w-full ${
                        service.highlighted
                          ? 'bg-orange-500 hover:bg-orange-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      } px-4 py-2 rounded-md font-medium transition-colors cursor-pointer`}
                    >
                      Learn More
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA SECTION */}
          <section className="py-20 bg-gray-50 rounded-2xl mb-12">
            <div className="text-center max-w-4xl mx-auto px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Ready to Transform Your Business?
              </h2>

              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Let's discuss how our deep-tech AI solutions can accelerate your growth and innovation.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={handleStartProject}
                  className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-6 py-3 rounded-md font-medium cursor-pointer"
                >
                  Start Your Project
                </Button>
                <Button 
                  onClick={handleScheduleConsultation}
                  variant="outline" 
                  size="lg"
                  className="cursor-pointer"
                >
                Schedule Consultation
                </Button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
};

export default Services;

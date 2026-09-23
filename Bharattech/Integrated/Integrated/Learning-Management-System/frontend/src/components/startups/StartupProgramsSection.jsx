import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Rocket, Users, Target } from "lucide-react";

export default function StartupProgramsSection({ onLearnMore }) {
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

  return (
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
                onClick={() => onLearnMore(program.title)}
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
  );
}

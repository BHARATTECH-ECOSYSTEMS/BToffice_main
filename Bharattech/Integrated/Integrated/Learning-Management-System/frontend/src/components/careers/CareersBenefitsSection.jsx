import React from "react";
import { DollarSign, Heart, GraduationCap, Zap, Users, Globe } from "lucide-react";
import { Card, CardContent } from "../ui/card";

export const benefits = [
  { icon: <DollarSign className="w-6 h-6" />, title: "Competitive Salary", description: "Industry-leading compensation packages" },
  { icon: <Heart className="w-6 h-6" />, title: "Health & Wellness", description: "Comprehensive health insurance and wellness programs" },
  { icon: <GraduationCap className="w-6 h-6" />, title: "Learning & Development", description: "Continuous learning opportunities and certifications" },
  { icon: <Zap className="w-6 h-6" />, title: "Flexible Work", description: "Remote work options and flexible hours" },
  { icon: <Users className="w-6 h-6" />, title: "Great Team", description: "Work with talented and passionate professionals" },
  { icon: <Globe className="w-6 h-6" />, title: "Global Impact", description: "Work on projects that impact millions" },
];

export default function CareersBenefitsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            Why <span className="text-orange-500">Join</span> <span className="text-purple-600">Bharattech?</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We offer more than just a job - we offer a career path with growth, learning, and impact.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

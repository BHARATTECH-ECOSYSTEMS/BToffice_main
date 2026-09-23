import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Award, TrendingUp } from "lucide-react";

export default function StartupStoriesSection() {
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
  );
}

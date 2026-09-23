import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

export default function CareersHeroSection({ navigate }) {
  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-br from-orange-50 via-white to-purple-50">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-200/30 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-200/30 to-transparent rounded-full blur-3xl"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 rounded-md text-sm">
            Join Our Team
          </Badge>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
            <span className="text-gray-900">Build Your Career at</span>
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-orange-600 to-purple-600 bg-clip-text text-transparent">
              Bharattech
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join a team of innovators working on cutting-edge AI solutions that shape the future of technology.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => document.getElementById("openings")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 hover:from-orange-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-orange-500/30"
            >
              View Open Positions <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              onClick={() => navigate("/contact")}
              variant="outline"
              size="lg"
              className="border-2 border-gray-300 hover:border-orange-500 hover:text-orange-600"
            >
              Get in Touch
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

import React from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import { Target, Eye, Award, Users, Lightbulb, Globe } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";

const About = () => {
  const navigate = useNavigate();
  
  const handleCareerClick = () => {
    navigate("/careers");
  };
  
  const handlePartnerClick = () => {
    navigate("/contact");
  };
  const values = [
    {
      icon: Lightbulb,
      title: "Innovation First",
      description:
        "We push the boundaries of what's possible with cutting-edge AI research and development.",
    },
    {
      icon: Users,
      title: "Customer Centricity",
      description:
        "Every solution we build is designed with our clients' success and user experience at the core.",
    },
    {
      icon: Award,
      title: "Excellence",
      description:
        "We maintain the highest standards in technology, security, and service delivery.",
    },
    {
      icon: Globe,
      title: "Global Impact",
      description:
        "Our mission extends beyond borders, creating AI solutions that benefit humanity worldwide.",
    },
  ];

  const teamMembers = [
    {
      name: "Dr. Rajesh Kumar",
      role: "Founder & CEO",
      description:
        "AI Research Pioneer with 15+ years in deep learning and computer vision.",
    },
    {
      name: "Priya Sharma",
      role: "CTO",
      description:
        "Former Google AI Engineer specializing in neural networks and MLOps.",
    },
    {
      name: "Arjun Patel",
      role: "Head of Products",
      description:
        "Product strategist with expertise in scaling AI solutions for enterprises.",
    },
    {
      name: "Dr. Meera Singh",
      role: "Chief Data Scientist",
      description:
        "PhD in Machine Learning, published researcher in NLP and computer vision.",
    },
  ];

  return (
    <>
      <TopNav />

      <div className="min-h-screen bg-white pt-28">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Hero Section */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                About <span className="text-orange-500">Bharattech</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-4xl mx-auto">
                We are a deep-tech AI company committed to building intelligent solutions
                that solve complex challenges and drive technological advancement in India and globally.
              </p>
            </div>
          </section>

          {/* Mission + Vision Section */}
          <section className="mb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left - Image */}
              <div className="order-2 lg:order-1">
                <div
                  className="rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-blue-50 to-purple-50"
                  style={{
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20"></div>
                    <Users className="w-32 h-32 text-gray-300 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Right - Mission and Vision Cards */}
              <div className="order-1 lg:order-2 space-y-8">
                {/* Mission Card */}
                <Card className="border rounded-xl shadow-sm">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      To democratize artificial intelligence by creating accessible,
                      scalable, and impactful AI solutions that empower businesses, enhance human capabilities, and contribute to societal progress through innovative technology.
                    </p>
                  </CardContent>
                </Card>

                {/* Vision Card */}
                <Card className="border rounded-xl shadow-sm">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-900 flex items-center justify-center flex-shrink-0">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Our Vision</h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      To be the leading deep-tech AI company that shapes the future of
                      intelligent systems, establishing India as a global hub for AI innovation while creating solutions that benefit humanity at scale.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Core Values Section */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Our <span className="text-orange-500">Core</span> <span className="text-purple-600">Values</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                The principles that guide our work and define our company culture.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <div
                    key={value.title}
                    className="text-center"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500 mb-6">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-gray-900">{value.title}</h3>
                    <p className="text-gray-600">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Leadership Team Section */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Meet Our <span className="text-orange-500">Leadership</span> <span className="text-purple-600">Team</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Experienced professionals and visionaries driving innovation in AI and deep technology.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {teamMembers.map((member, index) => (
                <Card
                  key={member.name}
                  className="border rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-orange-500 mx-auto mb-4 flex items-center justify-center">
                      <Users className="w-10 h-10 text-white" />
                    </div>

                    <h3 className="text-lg font-semibold mb-1 text-gray-900">{member.name}</h3>
                    <p className="text-orange-500 font-medium mb-3">{member.role}</p>
                    <p className="text-sm text-gray-600">{member.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 bg-gradient-to-b from-white to-orange-50/30 rounded-2xl">
            <div className="max-w-4xl mx-auto text-center px-4">
              <h2 className="text-4xl font-bold mb-6 text-gray-900">Join Our Mission to Shape the Future</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Be part of a team that's revolutionizing industries through innovative AI solutions.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={handleCareerClick}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-medium cursor-pointer"
                >
                  View Career Opportunities
                </Button>
                <Button 
                  onClick={handlePartnerClick}
                  variant="outline" 
                  size="lg"
                  className="cursor-pointer"
                >
                 Partner with Us
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default About;

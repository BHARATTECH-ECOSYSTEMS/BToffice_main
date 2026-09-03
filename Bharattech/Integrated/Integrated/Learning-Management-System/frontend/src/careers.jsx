import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Zap, 
  Heart, 
  GraduationCap,
  Search,
  Filter,
  ArrowRight,
  CheckCircle,
  Star,
  TrendingUp,
  Code,
  Brain,
  Shield,
  Globe
} from "lucide-react";

const Careers = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const departments = [
    { id: "all", name: "All Departments" },
    { id: "engineering", name: "Engineering" },
    { id: "ai-ml", name: "AI/ML" },
    { id: "data", name: "Data Science" },
    { id: "product", name: "Product" },
    { id: "design", name: "Design" },
    { id: "sales", name: "Sales & Marketing" }
  ];

  const benefits = [
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Competitive Salary",
      description: "Industry-leading compensation packages"
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Health & Wellness",
      description: "Comprehensive health insurance and wellness programs"
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: "Learning & Development",
      description: "Continuous learning opportunities and certifications"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Flexible Work",
      description: "Remote work options and flexible hours"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Great Team",
      description: "Work with talented and passionate professionals"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Global Impact",
      description: "Work on projects that impact millions"
    }
  ];

  const jobOpenings = [
    {
      id: 1,
      title: "Senior AI Engineer",
      department: "ai-ml",
      location: "Bengaluru, India / Remote",
      type: "Full-time",
      experience: "5+ years",
      salary: "₹15L - ₹25L",
      posted: "2 days ago",
      description: "Lead AI research and development projects, work with cutting-edge ML models",
      skills: ["Python", "TensorFlow", "PyTorch", "Deep Learning", "NLP"]
    },
    {
      id: 2,
      title: "Full Stack Developer",
      department: "engineering",
      location: "Bengaluru, India",
      type: "Full-time",
      experience: "3+ years",
      salary: "₹10L - ₹18L",
      posted: "5 days ago",
      description: "Build scalable web applications using modern technologies",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"]
    },
    {
      id: 3,
      title: "Data Scientist",
      department: "data",
      location: "Remote",
      type: "Full-time",
      experience: "4+ years",
      salary: "₹12L - ₹20L",
      posted: "1 week ago",
      description: "Analyze complex datasets and build predictive models",
      skills: ["Python", "R", "SQL", "Machine Learning", "Statistics"]
    },
    {
      id: 4,
      title: "Product Manager",
      department: "product",
      location: "Bengaluru, India",
      type: "Full-time",
      experience: "6+ years",
      salary: "₹18L - ₹30L",
      posted: "3 days ago",
      description: "Drive product strategy and roadmap for AI-powered solutions",
      skills: ["Product Strategy", "Agile", "Analytics", "AI/ML", "Leadership"]
    },
    {
      id: 5,
      title: "UI/UX Designer",
      department: "design",
      location: "Bengaluru, India / Remote",
      type: "Full-time",
      experience: "3+ years",
      salary: "₹8L - ₹15L",
      posted: "1 week ago",
      description: "Design beautiful and intuitive user interfaces for AI products",
      skills: ["Figma", "User Research", "Prototyping", "Design Systems", "AI UX"]
    },
    {
      id: 6,
      title: "DevOps Engineer",
      department: "engineering",
      location: "Bengaluru, India",
      type: "Full-time",
      experience: "4+ years",
      salary: "₹12L - ₹20L",
      posted: "4 days ago",
      description: "Build and maintain cloud infrastructure for AI workloads",
      skills: ["Kubernetes", "Docker", "AWS", "CI/CD", "Terraform"]
    }
  ];

  const filteredJobs = jobOpenings.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDepartment = selectedDepartment === "all" || job.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleApplyNow = (jobId) => {
    navigate("/contact", { 
      state: { 
        interest: `Job Application - ${jobOpenings.find(j => j.id === jobId)?.title}` 
      } 
    });
  };

  return (
    <>
      <TopNav />
      
      <div className="min-h-screen bg-white pt-28">
        {/* Hero Section */}
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
                  onClick={() => document.getElementById('openings').scrollIntoView({ behavior: 'smooth' })}
                  className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 hover:from-orange-600 hover:via-orange-700 hover:to-orange-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-300"
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

        {/* Why Join Us Section */}
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
                <Card 
                  key={index}
                  className="border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 card-hover group"
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300">
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

        {/* Job Openings Section */}
        <section id="openings" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Open <span className="text-orange-500">Positions</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Explore our current job openings and find the perfect role for you.
              </p>
            </div>

            {/* Search and Filter */}
            <div className="mb-8">
              <Card className="border rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="text"
                        placeholder="Search jobs by title, skills, or keywords..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 border-2 border-gray-200 focus:border-orange-500 rounded-xl"
                      />
                    </div>
                    <div className="md:w-64">
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="w-full h-12 px-4 border-2 border-gray-200 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Job Listings */}
            {filteredJobs.length === 0 ? (
              <Card className="border rounded-xl shadow-sm">
                <CardContent className="p-12 text-center">
                  <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
                  <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <Card 
                    key={job.id}
                    className="border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 card-hover"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                              <Briefcase className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h3>
                              <div className="flex flex-wrap items-center gap-3 mb-3">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  {departments.find(d => d.id === job.department)?.name}
                                </Badge>
                                <div className="flex items-center gap-1 text-gray-600 text-sm">
                                  <MapPin className="w-4 h-4" />
                                  {job.location}
                                </div>
                                <div className="flex items-center gap-1 text-gray-600 text-sm">
                                  <Clock className="w-4 h-4" />
                                  {job.type}
                                </div>
                                <div className="flex items-center gap-1 text-gray-600 text-sm">
                                  <TrendingUp className="w-4 h-4" />
                                  {job.experience}
                                </div>
                              </div>
                              <p className="text-gray-600 mb-4">{job.description}</p>
                              <div className="flex flex-wrap gap-2 mb-3">
                                {job.skills.map((skill, idx) => (
                                  <Badge 
                                    key={idx}
                                    variant="outline"
                                    className="text-xs border-gray-300 text-gray-700"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>Posted {job.posted}</span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  {job.salary}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="lg:ml-4 flex-shrink-0">
                          <Button
                            onClick={() => handleApplyNow(job.id)}
                            className="w-full lg:w-auto bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 hover:from-orange-600 hover:via-orange-700 hover:to-orange-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-300"
                          >
                            Apply Now <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Culture Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Our <span className="text-orange-500">Culture</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                We foster an environment of innovation, collaboration, and continuous learning.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Innovation First</h3>
                  <p className="text-gray-600">We encourage experimentation and bold ideas that push boundaries.</p>
                </CardContent>
              </Card>

              <Card className="border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Collaborative Spirit</h3>
                  <p className="text-gray-600">We believe in the power of teamwork and shared success.</p>
                </CardContent>
              </Card>

              <Card className="border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Excellence</h3>
                  <p className="text-gray-600">We strive for excellence in everything we do, every single day.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-orange-500 via-orange-600 to-purple-600">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Don't See the Right Role?
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              We're always looking for talented individuals. Send us your resume and we'll keep you in mind for future opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate("/contact", { state: { interest: "General Career Inquiry" } })}
                variant="outline"
                size="lg"
                className="bg-white text-orange-600 hover:bg-gray-100 border-0 font-semibold px-8 py-3 rounded-xl shadow-lg"
              >
                Send Your Resume
              </Button>
              <Button 
                onClick={() => navigate("/about")}
                variant="outline"
                size="lg"
                className="bg-transparent text-white hover:bg-white/10 border-2 border-white font-semibold px-8 py-3 rounded-xl"
              >
                Learn More About Us
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Careers;


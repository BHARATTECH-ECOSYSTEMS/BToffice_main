import React from "react";
import { Search, Briefcase, MapPin, Clock, TrendingUp, DollarSign, ArrowRight } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export const departments = [
  { id: "all", name: "All Departments" },
  { id: "engineering", name: "Engineering" },
  { id: "ai-ml", name: "AI/ML" },
  { id: "data", name: "Data Science" },
  { id: "product", name: "Product" },
  { id: "design", name: "Design" },
  { id: "sales", name: "Sales & Marketing" },
];

export const jobOpenings = [
  { id: 1, title: "Senior AI Engineer", department: "ai-ml", location: "Bengaluru, India / Remote", type: "Full-time", experience: "5+ years", salary: "₹15L - ₹25L", posted: "2 days ago", description: "Lead AI research and development projects, work with cutting-edge ML models", skills: ["Python", "TensorFlow", "PyTorch", "Deep Learning", "NLP"] },
  { id: 2, title: "Full Stack Developer", department: "engineering", location: "Bengaluru, India", type: "Full-time", experience: "3+ years", salary: "₹10L - ₹18L", posted: "5 days ago", description: "Build scalable web applications using modern technologies", skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"] },
  { id: 3, title: "Data Scientist", department: "data", location: "Remote", type: "Full-time", experience: "4+ years", salary: "₹12L - ₹20L", posted: "1 week ago", description: "Analyze complex datasets and build predictive models", skills: ["Python", "R", "SQL", "Machine Learning", "Statistics"] },
  { id: 4, title: "Product Manager", department: "product", location: "Bengaluru, India", type: "Full-time", experience: "6+ years", salary: "₹18L - ₹30L", posted: "3 days ago", description: "Drive product strategy and roadmap for AI-powered solutions", skills: ["Product Strategy", "Agile", "Analytics", "AI/ML", "Leadership"] },
  { id: 5, title: "UI/UX Designer", department: "design", location: "Bengaluru, India / Remote", type: "Full-time", experience: "3+ years", salary: "₹8L - ₹15L", posted: "1 week ago", description: "Design beautiful and intuitive user interfaces for AI products", skills: ["Figma", "User Research", "Prototyping", "Design Systems", "AI UX"] },
  { id: 6, title: "DevOps Engineer", department: "engineering", location: "Bengaluru, India", type: "Full-time", experience: "4+ years", salary: "₹12L - ₹20L", posted: "4 days ago", description: "Build and maintain cloud infrastructure for AI workloads", skills: ["Kubernetes", "Docker", "AWS", "CI/CD", "Terraform"] },
];

export default function CareersJobListSection({
  searchQuery,
  setSearchQuery,
  selectedDepartment,
  setSelectedDepartment,
  navigate,
}) {
  const filteredJobs = jobOpenings.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDepartment = selectedDepartment === "all" || job.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleApplyNow = (jobId) => {
    const job = jobOpenings.find((j) => j.id === jobId);
    navigate("/contact", { state: { interest: `Job Application - ${job?.title}` } });
  };

  return (
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

        <div className="mb-8">
          <Card className="border rounded-xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search jobs by title, skills, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 border-2 border-gray-200 rounded-xl"
                  />
                </div>
                <div className="md:w-64">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:outline-none"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
              <Card key={job.id} className="border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
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
                              {departments.find((d) => d.id === job.department)?.name}
                            </Badge>
                            <span className="flex items-center gap-1 text-gray-600 text-sm"><MapPin className="w-4 h-4" /> {job.location}</span>
                            <span className="flex items-center gap-1 text-gray-600 text-sm"><Clock className="w-4 h-4" /> {job.type}</span>
                            <span className="flex items-center gap-1 text-gray-600 text-sm"><TrendingUp className="w-4 h-4" /> {job.experience}</span>
                          </div>
                          <p className="text-gray-600 mb-4">{job.description}</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {job.skills.map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs border-gray-300 text-gray-700">{skill}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Posted {job.posted}</span>
                            <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> {job.salary}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleApplyNow(job.id)}
                      className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 hover:from-orange-600 text-white px-6 py-2 rounded-xl font-semibold shadow-md self-start lg:self-center"
                    >
                      Apply Now <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { 
  User, 
  Star, 
  BookOpen,
  Users,
  MessageSquare,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Award,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import placeholder from '../placeholder.svg';

const Instructors = () => {
  const instructors = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      title: "Senior Data Scientist",
      company: "TechCorp AI",
      avatar: placeholder,
      rating: 4.9,
      totalStudents: 15420,
      courses: 8,
      specializations: ["Data Science", "Machine Learning", "Python", "Statistics"],
      bio: "Dr. Johnson is a leading expert in machine learning with over 10 years of experience in both academia and industry. She holds a PhD in Computer Science from MIT and has published numerous papers on deep learning algorithms.",
      email: "sarah.johnson@bharattech.com",
      phone: "+1 (555) 123-4567",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/sarahjohnson",
      officeHours: "Tuesdays & Thursdays, 2-4 PM PST",
      achievements: [
        "PhD in Computer Science - MIT",
        "Google Research Scholar 2020",
        "Published 50+ research papers",
        "TED Talk: Future of AI"
      ],
      activeCourses: [
        "Python for Data Science & Machine Learning",
        "Advanced Deep Learning Techniques"
      ]
    },
    {
      id: 2,
      name: "Alex Rodriguez",
      title: "Senior Frontend Developer",
      company: "Meta",
      avatar: placeholder,
      rating: 4.8,
      totalStudents: 12300,
      courses: 6,
      specializations: ["React", "JavaScript", "TypeScript", "Frontend Architecture"],
      bio: "Alex is a passionate frontend developer with extensive experience building scalable web applications. Currently working at Meta, he specializes in React ecosystem and modern JavaScript frameworks.",
      email: "alex.rodriguez@bharattech.com",
      phone: "+1 (555) 987-6543",
      location: "Austin, TX",
      linkedin: "linkedin.com/in/alexrodriguez",
      officeHours: "Mondays & Wednesdays, 1-3 PM CST",
      achievements: [
        "8+ years at top tech companies",
        "React.js contributor",
        "JavaScript Conference Speaker",
        "Open Source Maintainer"
      ],
      activeCourses: [
        "Advanced React Development",
        "JavaScript Mastery Course"
      ]
    },
    {
      id: 3,
      name: "Michael Chen",
      title: "UX Design Director",
      company: "Adobe",
      avatar: placeholder,
      rating: 4.7,
      totalStudents: 9800,
      courses: 5,
      specializations: ["UI/UX Design", "Design Systems", "User Research", "Prototyping"],
      bio: "Michael is a design leader with a passion for creating user-centered experiences. With 12 years in the industry, he has led design teams at Adobe and helped shape products used by millions worldwide.",
      email: "michael.chen@bharattech.com",
      phone: "+1 (555) 456-7890",
      location: "Seattle, WA",
      linkedin: "linkedin.com/in/michaelchen",
      officeHours: "Fridays, 10 AM - 12 PM PST",
      achievements: [
        "Design Director at Adobe",
        "IXDA Award Winner 2021",
        "Design Mentor for 500+ designers",
        "Published Design Thinking author"
      ],
      activeCourses: [
        "UI/UX Design Fundamentals",
        "Advanced Prototyping Techniques"
      ]
    },
    {
      id: 4,
      name: "Emma Wilson",
      title: "Database Architect",
      company: "Amazon Web Services",
      avatar: placeholder,
      rating: 4.6,
      totalStudents: 7500,
      courses: 4,
      specializations: ["Database Design", "SQL", "Cloud Architecture", "Performance Optimization"],
      bio: "Emma is a database expert with deep knowledge of both relational and NoSQL databases. She currently works at AWS helping enterprises optimize their data infrastructure and has consulted for Fortune 500 companies.",
      email: "emma.wilson@bharattech.com",
      phone: "+1 (555) 321-0987",
      location: "Portland, OR",
      linkedin: "linkedin.com/in/emmawilson",
      officeHours: "Thursdays, 3-5 PM PST",
      achievements: [
        "AWS Certified Solutions Architect",
        "Database Performance Expert",
        "Speaking at 20+ conferences",
        "Oracle ACE Director"
      ],
      activeCourses: [
        "Database Management Systems",
        "Advanced SQL Techniques"
      ]
    }
  ];

  const myInstructors = instructors.slice(0, 2);

  return (
    <div className="flex flex-col min-h-screen bg-background mt-4 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      

      <Tabs defaultValue="all-instructors" className=" w-full space-y-6">
        <TabsList className="grid  grid-cols-2 sm:grid-cols-3">
          <TabsTrigger value="all-instructors">All Instructors</TabsTrigger>
          <TabsTrigger value="my-instructors">My Instructors</TabsTrigger>
          <TabsTrigger value="office-hours">Office Hours</TabsTrigger>
        </TabsList>

        {/* All Instructors Tab */}
        <TabsContent value="all-instructors" className="space-y-6 mt-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search instructors..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="flex-shrink-0 whitespace-nowrap">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Instructors Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {instructors.map((instructor) => (
              <Card key={instructor.id} className="hover:shadow-lg transition-all border border-gray-200">
                <CardHeader className="p-5 sm:p-6 pb-4">
                  <div className="flex items-start gap-4">
                    <img 
                      src={instructor.avatar} 
                      alt={instructor.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl mb-1 line-clamp-1">{instructor.name}</CardTitle>
                      <CardDescription className="text-sm mb-3 line-clamp-1">
                        {instructor.title} at {instructor.company}
                      </CardDescription>
                      <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{instructor.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{instructor.totalStudents.toLocaleString()} students</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{instructor.courses} courses</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-5 sm:p-6 pt-0">
                  <p className="text-sm text-muted-foreground mb-5 line-clamp-3">
                    {instructor.bio}
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Specializations</h4>
                      <div className="flex flex-wrap gap-2">
                        {instructor.specializations.map((spec) => (
                          <Badge key={spec} variant="secondary" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Active Courses</h4>
                      <div className="space-y-1">
                        {instructor.activeCourses.map((course, index) => (
                          <p key={index} className="text-xs text-muted-foreground line-clamp-1">
                            • {course}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button size="sm" className="flex-1 h-10">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm" className="h-10 flex-shrink-0">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* My Instructors Tab */}
        <TabsContent value="my-instructors" className="space-y-6 mt-4">
          <div className="space-y-6">
            {myInstructors.map((instructor) => (
              <Card key={instructor.id} className="hover:shadow-lg transition-all border border-gray-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Instructor Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start gap-4 mb-6">
                        <img 
                          src={instructor.avatar} 
                          alt={instructor.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl sm:text-2xl font-semibold mb-2 line-clamp-1">{instructor.name}</h3>
                          <p className="text-lg sm:text-xl text-muted-foreground mb-3 line-clamp-1">
                            {instructor.title} at {instructor.company}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{instructor.rating}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{instructor.totalStudents.toLocaleString()}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3">{instructor.bio}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 sm:p-6 border border-gray-200 rounded-xl bg-muted/20">
                        <div>
                          <h4 className="font-semibold mb-4 text-base">Achievements</h4>
                          <ul className="space-y-2">
                            {instructor.achievements.map((achievement, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                <Award className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-2">{achievement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-4 text-base">My Courses</h4>
                          <div className="space-y-2">
                            {instructor.activeCourses.map((course, index) => (
                              <p key={index} className="text-sm text-muted-foreground line-clamp-2">
                                • {course}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="lg:col-span-1">
                      <Card className="border border-gray-200">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-base sm:text-lg">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 p-4 sm:p-5">
                          <div className="flex items-start gap-3 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground break-all">{instructor.email}</span>
                          </div>
                          <div className="flex items-start gap-3 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{instructor.phone}</span>
                          </div>
                          <div className="flex items-start gap-3 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{instructor.location}</span>
                          </div>
                          <div className="flex items-start gap-3 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{instructor.officeHours}</span>
                          </div>
                          
                          <div className="pt-4 space-y-2">
                            <Button size="sm" className="w-full h-10">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Send Message
                            </Button>
                            <Button variant="outline" size="sm" className="w-full h-10">
                              <Calendar className="w-4 h-4 mr-2" />
                              Book Office Hours
                            </Button>
                            <Button variant="outline" size="sm" className="w-full h-10">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              LinkedIn
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Office Hours Tab */}
        <TabsContent value="office-hours" className="mt-4">
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle>Office Hours Schedule</CardTitle>
              <CardDescription>Book one-on-one sessions with your instructors</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {myInstructors.map((instructor) => (
                  <div key={instructor.id} className="p-5 border border-gray-200 rounded-xl hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <img 
                          src={instructor.avatar} 
                          alt={instructor.name}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-base sm:text-lg line-clamp-1">{instructor.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{instructor.officeHours}</p>
                        </div>
                      </div>
                      <Button size="sm" className="h-11 whitespace-nowrap">
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Session
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Instructors;
  
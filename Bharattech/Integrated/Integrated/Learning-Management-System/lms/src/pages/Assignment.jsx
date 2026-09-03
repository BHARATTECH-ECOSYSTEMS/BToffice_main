import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { 
  FileText, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Calendar,
  Upload,
  Download,
  Eye
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

const Assignments = () => {
  const pendingAssignments = [
    {
      id: 1,
      title: "Data Visualization Project",
      course: "Python for Data Science & Machine Learning",
      dueDate: "Dec 15, 2024",
      daysLeft: 3,
      type: "Project",
      points: 100,
      description: "Create comprehensive data visualizations using matplotlib and seaborn",
      instructions: "Submit a Jupyter notebook with at least 5 different chart types",
      status: "pending"
    },
    {
      id: 2,
      title: "CSS Flexbox & Grid Quiz",
      course: "Complete Web Development Bootcamp",
      dueDate: "Dec 18, 2024",
      daysLeft: 6,
      type: "Quiz",
      points: 50,
      description: "Test your knowledge of modern CSS layout techniques",
      instructions: "Complete all 20 questions within 45 minutes",
      status: "pending"
    }
  ];

  const submittedAssignments = [
    {
      id: 3,
      title: "React Component Library",
      course: "Advanced React Development",
      submittedDate: "Dec 8, 2024",
      grade: 95,
      maxPoints: 100,
      type: "Project",
      feedback: "Excellent work on component architecture and documentation. Minor improvements needed in accessibility.",
      status: "graded"
    },
    {
      id: 4,
      title: "JavaScript Fundamentals Test",
      course: "JavaScript Mastery Course",
      submittedDate: "Dec 5, 2024",
      grade: 88,
      maxPoints: 100,
      type: "Quiz",
      feedback: "Good understanding of core concepts. Review async/await patterns.",
      status: "graded"
    }
  ];

  const upcomingDeadlines = [
    {
      title: "UI Design Mockup",
      course: "UI/UX Design Fundamentals",
      dueDate: "Dec 20, 2024",
      type: "Assignment"
    },
    {
      title: "Database Design Project",
      course: "Database Management Systems",
      dueDate: "Dec 22, 2024",
      type: "Project"
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'submitted': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'graded': return 'text-green-600 bg-green-50 border-green-200';
      case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getGradeColor = (grade) => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background overflow-x-hidden">
     

      <div className="flex-1 p-4 md:p-6">
        
        <Tabs defaultValue="pending" className="space-y-6">
          
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="pending">Pending ({pendingAssignments.length})</TabsTrigger>
            <TabsTrigger value="submitted">Submitted ({submittedAssignments.length})</TabsTrigger>
            <TabsTrigger value="grades">Grades</TabsTrigger>
          </TabsList>

          
          <TabsContent value="pending" className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-2">
              <Card className="p-3 md:p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold">{pendingAssignments.length}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Pending</div>
                  </div>
                </div>
              </Card>

              <Card className="p-3 md:p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold">3</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Days Average</div>
                  </div>
                </div>
              </Card>

              <Card className="p-3 md:p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold">{submittedAssignments.length}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Completed</div>
                  </div>
                </div>
              </Card>
            </div>

           
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-4">
                <h3 className="text-md md:text-lg font-semibold">Due Soon</h3>
                
                {pendingAssignments.map((assignment) => (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow border border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1 min-w-[60%]">
                          <CardTitle className="text-sm md:text-base mb-1">{assignment.title}</CardTitle>
                          <CardDescription className="text-xs md:text-sm">
                            {assignment.course}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={getStatusColor(assignment.status)}>
                          {assignment.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3 text-sm md:text-base">
                        <p className="text-xs md:text-sm text-muted-foreground">{assignment.description}</p>

                        <div className="flex flex-wrap gap-4 text-xs md:text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>Due: {assignment.dueDate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-primary" />
                            <span className="text-primary font-medium">{assignment.daysLeft} days left</span>
                          </div>
                        </div>

                        <div className="text-xs md:text-sm">
                          <span className="text-muted-foreground">Points: </span>
                          <span className="font-medium">{assignment.points}</span>
                        </div>

                        <div className="pt-2">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                            <Button size="sm">
                              <Upload className="w-4 h-4 mr-1" />
                              Submit
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              
              <div className="space-y-4">
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-md md:text-lg">Upcoming Deadlines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {upcomingDeadlines.map((deadline, index) => (
                        <div key={index} className="flex flex-wrap items-center gap-3 p-3 border border-gray-200 rounded-lg">
                          <Calendar className="w-5 h-5 text-primary" />
                          <div className="flex-1 min-w-[55%]">
                            <p className="text-xs md:text-sm font-medium">{deadline.title}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground">{deadline.course}</p>
                            <p className="text-[10px] md:text-xs text-primary font-medium">{deadline.dueDate}</p>
                          </div>
                          <Badge variant="secondary">{deadline.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          
          <TabsContent value="submitted" className="space-y-4">
            <h3 className="text-md md:text-lg font-semibold">Submitted Assignments</h3>
            {submittedAssignments.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow border border-gray-200">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-sm md:text-base mb-1">{assignment.title}</CardTitle>
                      <CardDescription className="text-xs md:text-sm">{assignment.course}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className={`text-base md:text-lg font-bold ${getGradeColor(assignment.grade)}`}>
                        {assignment.grade}/{assignment.maxPoints}
                      </div>
                      <Badge variant="outline" className={getStatusColor(assignment.status)}>
                        {assignment.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 space-y-3 text-xs md:text-sm">
                  <div>
                    <span className="text-muted-foreground">Submitted: </span>
                    <span>{assignment.submittedDate}</span>
                  </div>

                  {assignment.feedback && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium mb-1">Instructor Feedback:</p>
                      <p className="text-muted-foreground">{assignment.feedback}</p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

        
          <TabsContent value="grades">
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle>Grade Overview</CardTitle>
                <CardDescription>Your academic performance across all courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm md:text-base text-muted-foreground">Detailed grade analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default Assignments;

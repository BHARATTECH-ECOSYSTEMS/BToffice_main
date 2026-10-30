import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { 
  Trophy, 
  TrendingUp, 
  BarChart3,
  Award,
  Target,
  Download,
  Filter
} from 'lucide-react';

const Grades = () => {
  const overallStats = {
    gpa: 3.8,
    totalCredits: 45,
    completedCourses: 8,
    avgGrade: 89.2
  };

  const courseGrades = [
    {
      id: 1,
      course: "Python for Data Science & Machine Learning",
      instructor: "Sarah Johnson",
      grade: 95,
      credits: 6,
      status: "In Progress",
      assignments: [
        { name: "Data Visualization Project", grade: 98, maxGrade: 100, weight: 30 },
        { name: "Machine Learning Quiz", grade: 92, maxGrade: 100, weight: 20 },
        { name: "Final Project", grade: null, maxGrade: 100, weight: 50 }
      ]
    },
    {
      id: 2,
      course: "UI/UX Design Fundamentals",
      instructor: "Michael Chen",
      grade: 88,
      credits: 4,
      status: "In Progress",
      assignments: [
        { name: "Design Portfolio", grade: 90, maxGrade: 100, weight: 40 },
        { name: "User Research Report", grade: 85, maxGrade: 100, weight: 30 },
        { name: "Prototype Design", grade: null, maxGrade: 100, weight: 30 }
      ]
    },
    {
      id: 3,
      course: "JavaScript Mastery Course",
      instructor: "Alex Rodriguez",
      grade: 92,
      credits: 5,
      status: "Completed",
      assignments: [
        { name: "React Component Library", grade: 95, maxGrade: 100, weight: 35 },
        { name: "JavaScript Fundamentals Test", grade: 88, maxGrade: 100, weight: 25 },
        { name: "Final Web Application", grade: 94, maxGrade: 100, weight: 40 }
      ]
    }
  ];

  const getGradeColor = (grade) => {
    if (grade >= 90) return 'text-green-600 bg-green-50';
    if (grade >= 80) return 'text-blue-600 bg-blue-50';
    if (grade >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getGradeText = (grade) => {
    if (grade >= 97) return 'A+';
    if (grade >= 93) return 'A';
    if (grade >= 90) return 'A-';
    if (grade >= 87) return 'B+';
    if (grade >= 83) return 'B';
    if (grade >= 80) return 'B-';
    if (grade >= 77) return 'C+';
    if (grade >= 73) return 'C';
    if (grade >= 70) return 'C-';
    return 'F';
  };

  return (
    <div className="flex flex-col min-h-screen bg-background mt-8 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Academic Performance</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button variant="outline" size="sm" className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full space-y-6">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
          <TabsTrigger value="courses" className="text-sm">Courses</TabsTrigger>
          <TabsTrigger value="analytics" className="text-sm">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Stats Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 sm:p-6 border border-gray-300 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-bold">{overallStats.gpa}</div>
                  <div className="text-sm text-muted-foreground mt-1">Overall GPA</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 sm:p-6 border border-gray-300 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-accent rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-bold">{overallStats.avgGrade}%</div>
                  <div className="text-sm text-muted-foreground mt-1">Average Grade</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 sm:p-6 border border-gray-300 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-bold">{overallStats.totalCredits}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Credits</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 sm:p-6 border border-gray-300 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-accent rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-bold">{overallStats.completedCourses}</div>
                  <div className="text-sm text-muted-foreground mt-1">Completed</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Course Grades Card */}
          <Card className="border border-gray-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Course Grades</CardTitle>
              <CardDescription className="text-sm">Your current grades across all enrolled courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courseGrades.map((course) => (
                  <div key={course.id} className="p-4 border border-gray-200 rounded-lg bg-muted/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg line-clamp-2">{course.course}</h3>
                        <p className="text-sm text-muted-foreground mt-1">Instructor: {course.instructor}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-base sm:text-lg font-bold ${getGradeColor(course.grade)}`}>
                          {course.grade}% ({getGradeText(course.grade)})
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {course.credits} Credits
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Progress</span>
                          <span>{course.grade}%</span>
                        </div>
                        <Progress value={course.grade} className="h-2 [&>div]:h-2" />
                      </div>
                      <Badge 
                        variant={course.status === "Completed" ? "default" : "secondary"}
                        className="whitespace-nowrap mt-2 sm:mt-0"
                      >
                        {course.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-6 mt-4">
          <div className="space-y-6">
            {courseGrades.map((course) => (
              <Card key={course.id} className="border border-gray-300">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg sm:text-xl">{course.course}</CardTitle>
                      <CardDescription className="text-sm">Instructor: {course.instructor}</CardDescription>
                    </div>
                    <div className="text-right sm:text-lg">
                      <div className={`inline-flex items-center px-4 py-2 rounded-full font-bold ${getGradeColor(course.grade)}`}>
                        {course.grade}%
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {getGradeText(course.grade)} Grade
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-medium text-lg">Assignment Breakdown</h4>
                    {course.assignments.map((assignment, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted rounded-lg gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm line-clamp-2">{assignment.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">Weight: {assignment.weight}%</p>
                        </div>
                        <div className="text-right sm:text-base">
                          {assignment.grade !== null ? (
                            <div className={`font-bold ${assignment.grade >= 90 ? 'text-green-600' : assignment.grade >= 80 ? 'text-blue-600' : 'text-yellow-600'}`}>
                              {assignment.grade}/{assignment.maxGrade}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs">Pending</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card className="border border-gray-300">
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Detailed analysis of your academic performance trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 sm:py-16">
                <BarChart3 className="w-16 h-16 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-6" />
                <p className="text-lg sm:text-xl text-muted-foreground font-medium">Detailed analytics and charts coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Grades;

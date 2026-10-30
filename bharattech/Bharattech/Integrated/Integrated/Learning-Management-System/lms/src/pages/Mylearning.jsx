import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import placeholder from "../placeholder.svg"
import { 
  BookOpen, 
  Clock, 
  PlayCircle,
  CheckCircle2,
  Calendar,
  Award,
  TrendingUp
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useContext } from 'react';
import {AuthContext} from "../context/AuthContext"
import { useState } from 'react';
import { useEffect } from 'react';
import axios from 'axios';
import { duration } from '@mui/material';

const MyLearning = () => {
  const {user,setUser} = useContext(AuthContext)
  const [enrolledCourses,setEnrolledCourses] = useState([])
const[totalDuration,setTotalDuration] = useState(0)
 useEffect(() => {
  const fetchCourses = async () => {
    const res = await axios.get("http://localhost:5000/api/courses/enrolled", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    const courses = res.data.enrolledCourses;
    setEnrolledCourses(courses);

    const total = courses.reduce((sum, course) => sum + Number(course.duration || 0), 0);
    setTotalDuration(total);
  };

  fetchCourses();
}, []);




  const recentActivity = [
    {
      type: "lesson_completed",
      title: "Completed: Pandas DataFrames",
      course: "Python for Data Science",
      time: "2 hours ago",
      icon: CheckCircle2
    },
    {
      type: "quiz_passed",
      title: "Passed Quiz: Machine Learning Basics",
      course: "Python for Data Science",
      time: "1 day ago",
      icon: Award
    },
    {
      type: "lesson_started",
      title: "Started: Design Principles",
      course: "UI/UX Design Fundamentals",
      time: "2 days ago",
      icon: PlayCircle
    }
  ];

  const upcomingDeadlines = [
    {
      title: "Assignment: Data Visualization Project",
      course: "Python for Data Science",
      dueDate: "Dec 15, 2024",
      type: "assignment"
    },
    {
      title: "Quiz: CSS Flexbox & Grid",
      course: "Web Development Bootcamp",
      dueDate: "Dec 18, 2024",
      type: "quiz"
    }
  ];

  return (
    <div className="flex min-h-screen bg-background mt-2">
      
      
      <div className="flex-1 p-6">
       

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold ">{enrolledCourses.length}</div>
                    <div className="text-sm text-muted-foreground ">Enrolled Courses</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center text-white">
                    <Clock className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{totalDuration} m</div>
                    <div className="text-sm text-muted-foreground">Total Time</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-primary bg-gradient-primary text-white rounded-lg" />
                  </div>
                  <div>
                    <div className="text-xl font-bold ">1</div>
                    <div className="text-sm text-muted-foreground ">Completed</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center text-white">
                    <Award className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">1</div>
                    <div className="text-sm text-muted-foreground">Certificates</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Enrolled Courses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Continue Learning</h3>
                {enrolledCourses.map((course) => (
                  <Card key={course.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-4">
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <CardTitle className="text-base mb-1">{course.title}</CardTitle>
                          <CardDescription className="text-sm">by {course.instructor}</CardDescription>
                          <Badge variant="secondary" className="mt-2">
                            {course.category}
                          </Badge>
                        </div>
                        {course.certificate && (
                          <Badge className="bg-accent text-accent-foreground">
                            <Award className="w-3 h-3 mr-1" />
                            Certified
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Progress</span>
                            <span>{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-2 text-gradient-primary bg-gradient-accent" />
                        </div>
                        
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{course.completedLessons} of {course.totalLessons} lessons</span>
                          <span>{course.timeSpent} spent</span>
                        </div>
                        
                        {course.nextLesson && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Next: </span>
                            <span className="font-medium">{course.nextLesson}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-xs text-muted-foreground">
                            Last accessed {course.lastAccessed}
                          </span>
                          <Button size="sm">
                            {course.progress === 100 ? "Review" : "Continue"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <activity.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">{activity.course}</p>
                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Deadlines */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {upcomingDeadlines.map((deadline, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                          <Calendar className="w-5 h-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{deadline.title}</p>
                            <p className="text-xs text-muted-foreground">{deadline.course}</p>
                            <p className="text-xs text-primary font-medium">{deadline.dueDate}</p>
                          </div>
                          <Badge variant="outline">{deadline.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Learning Progress</CardTitle>
                <CardDescription>Your learning analytics and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Progress analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates">
            <Card>
              <CardHeader>
                <CardTitle>My Certificates</CardTitle>
                <CardDescription>View and download your earned certificates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Certificates section coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyLearning;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { 
  Video, 
  Calendar, 
  Clock,
  Users,
  Mic,
  Camera,
  Settings,
  Play,
  Square,
  Volume2,
  MessageSquare,
  Hand,
  Monitor,
  Wifi
} from 'lucide-react';
import placeholder from "../placeholder.svg";

const LiveClasses = () => {
  const liveNow = [
    {
      id: 1,
      title: "Advanced React Patterns & Performance",
      instructor: "Alex Rodriguez",
      course: "Advanced React Development",
      participants: 124,
      duration: "45 minutes remaining",
      thumbnail: placeholder,
      isLive: true,
      startTime: "10:00 AM",
      canJoin: true
    }
  ];

  const upcomingClasses = [
    {
      id: 2,
      title: "Machine Learning Model Deployment",
      instructor: "Dr. Sarah Johnson",
      course: "Python for Data Science",
      scheduledTime: "2:00 PM Today",
      duration: "90 minutes",
      participants: 89,
      thumbnail: placeholder,
      description: "Learn how to deploy ML models to production environments"
    },
    {
      id: 3,
      title: "UI/UX Design Critique Session",
      instructor: "Michael Chen",
      course: "UI/UX Design Fundamentals",
      scheduledTime: "Tomorrow 10:00 AM",
      duration: "60 minutes",
      participants: 156,
      thumbnail: placeholder,
      description: "Interactive session reviewing student design portfolios"
    },
    {
      id: 4,
      title: "Database Optimization Techniques",
      instructor: "Emma Wilson",
      course: "Database Management Systems",
      scheduledTime: "Dec 13, 3:00 PM",
      duration: "75 minutes",
      participants: 67,
      thumbnail: placeholder,
      description: "Advanced techniques for optimizing database performance"
    }
  ];

  const recentRecordings = [
    {
      id: 1,
      title: "JavaScript ES6+ Features Deep Dive",
      instructor: "Alex Rodriguez",
      course: "JavaScript Mastery Course",
      recordedDate: "Dec 8, 2024",
      duration: "1h 25m",
      views: 234,
      thumbnail: placeholder
    },
    {
      id: 2,
      title: "Data Visualization with Python",
      instructor: "Dr. Sarah Johnson",
      course: "Python for Data Science",
      recordedDate: "Dec 6, 2024",
      duration: "1h 15m",
      views: 189,
      thumbnail: placeholder
    }
  ];

  return (
    <div className="flex mt-17 flex-col min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
      
    
      <Tabs defaultValue="live" className="w-full space-y-6">
        <TabsList className="grid  grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="live" className="text-sm py-2">Live Now</TabsTrigger>
          <TabsTrigger value="upcoming" className="text-sm py-2">Upcoming</TabsTrigger>
          <TabsTrigger value="recordings" className="text-sm py-2">Recordings</TabsTrigger>
          <TabsTrigger value="schedule" className="text-sm py-2">Schedule</TabsTrigger>
        </TabsList>

        {/* Live Now Tab */}
        <TabsContent value="live" className="space-y-6 mt-4">
          {liveNow.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-red-600">LIVE NOW</span>
              </div>
              
              {liveNow.map((session) => (
                <Card key={session.id} className="border-red-200 bg-red-50/50">
                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 order-2 lg:order-1">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <div className="relative flex-shrink-0">
                            <img 
                              src={session.thumbnail} 
                              alt="Live session"
                              className="w-32 sm:w-40 h-24 sm:h-28 object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center">
                                <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-semibold mb-2 line-clamp-2">{session.title}</h3>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              by {session.instructor} • {session.course}
                            </p>
                            <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{session.participants} participants</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{session.duration}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="lg:col-span-1 order-1 lg:order-2">
                        <div className="bg-white rounded-xl p-4 sm:p-5">
                          <h4 className="font-semibold mb-4 text-sm sm:text-base">Quick Settings</h4>
                          <div className="space-y-3 mb-5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm">Camera</span>
                              <Button variant="outline" size="sm" className="h-8 w-10 sm:w-auto">
                                <Camera className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm">Microphone</span>
                              <Button variant="outline" size="sm" className="h-8 w-10 sm:w-auto">
                                <Mic className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm">Audio</span>
                              <Button variant="outline" size="sm" className="h-8 w-10 sm:w-auto">
                                <Volume2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <Button className="w-full bg-red-500 hover:bg-red-600 text-sm h-11">
                            <Video className="w-4 h-4 mr-2" />
                            Join Live Session
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12 sm:py-16">
                <Video className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No Live Sessions</h3>
                <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                  There are no live classes at the moment. Check back later!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {upcomingClasses.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-all">
                <CardHeader className="p-4 sm:p-5 pb-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <img 
                      src={session.thumbnail} 
                      alt={session.title}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm sm:text-base font-semibold mb-1 line-clamp-2">{session.title}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm mb-2">by {session.instructor}</CardDescription>
                      <Badge variant="secondary" className="text-xs sm:text-sm">
                        {session.course}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 sm:p-5 pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 line-clamp-2">{session.description}</p>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{session.scheduledTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{session.duration}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{session.participants} registered</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button size="sm" className="flex-1 h-10">
                      <Calendar className="w-4 h-4 mr-2" />
                      Add to Calendar
                    </Button>
                    <Button variant="outline" size="sm" className="h-10 flex-shrink-0">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recordings Tab */}
        <TabsContent value="recordings" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {recentRecordings.map((recording) => (
              <Card key={recording.id} className="group hover:shadow-lg transition-all overflow-hidden">
                <div className="relative">
                  <img 
                    src={recording.thumbnail} 
                    alt={recording.title}
                    className="w-full h-40 sm:h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <Button size="sm" className="bg-primary hover:bg-primary/90 backdrop-blur-sm">
                      <Play className="w-4 h-4 mr-2" />
                      Watch
                    </Button>
                  </div>
                  <Badge className="absolute top-3 left-3 bg-black/80 text-white text-xs">
                    {recording.duration}
                  </Badge>
                </div>
                
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <CardTitle className="text-sm sm:text-base line-clamp-2">{recording.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">by {recording.instructor}</CardDescription>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 pt-0 pb-4">
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-xs">
                      {recording.course}
                    </Badge>
                    <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm text-muted-foreground gap-2">
                      <span>{recording.recordedDate}</span>
                      <span>{recording.views} views</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>My Class Schedule</CardTitle>
              <CardDescription>Your personalized schedule for upcoming live sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 sm:py-16">
                <Calendar className="w-16 h-16 sm:w-20 sm:h-20 text-muted-foreground mx-auto mb-6" />
                <p className="text-lg sm:text-xl text-muted-foreground font-medium max-w-md mx-auto">
                  Your personalized schedule coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveClasses;

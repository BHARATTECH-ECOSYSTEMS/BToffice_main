import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Video, Calendar } from 'lucide-react';
import placeholder from "../placeholder.svg";
import LiveNowCard from '../components/live/LiveNowCard';
import UpcomingClassesGrid from '../components/live/UpcomingClassesGrid';
import RecordingsGrid from '../components/live/RecordingsGrid';

const LIVE_NOW = [
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

const UPCOMING_CLASSES = [
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

const RECENT_RECORDINGS = [
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

export default function LiveClasses() {
  return (
    <div className="flex mt-17 flex-col min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
      <Tabs defaultValue="live" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="live" className="text-sm py-2">Live Now</TabsTrigger>
          <TabsTrigger value="upcoming" className="text-sm py-2">Upcoming</TabsTrigger>
          <TabsTrigger value="recordings" className="text-sm py-2">Recordings</TabsTrigger>
          <TabsTrigger value="schedule" className="text-sm py-2">Schedule</TabsTrigger>
        </TabsList>

        {/* Live Now */}
        <TabsContent value="live" className="space-y-6 mt-4">
          {LIVE_NOW.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-red-600">LIVE NOW</span>
              </div>
              {LIVE_NOW.map((session) => (
                <LiveNowCard key={session.id} session={session} />
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

        {/* Upcoming */}
        <TabsContent value="upcoming" className="space-y-6 mt-4">
          <UpcomingClassesGrid upcomingClasses={UPCOMING_CLASSES} />
        </TabsContent>

        {/* Recordings */}
        <TabsContent value="recordings" className="space-y-6 mt-4">
          <RecordingsGrid recentRecordings={RECENT_RECORDINGS} />
        </TabsContent>

        {/* Schedule */}
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
}

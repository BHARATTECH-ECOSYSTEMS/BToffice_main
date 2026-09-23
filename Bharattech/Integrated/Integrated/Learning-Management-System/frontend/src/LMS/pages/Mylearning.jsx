import React, { useContext, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { CheckCircle2, Award, PlayCircle, TrendingUp } from 'lucide-react';
import { AuthContext } from "../context/AuthContext";
import axios from 'axios';
import { getMyCertificates } from '../../services/certificateService';
import LearningStatsCards from '../components/learning/LearningStatsCards';
import EnrolledCoursesList from '../components/learning/EnrolledCoursesList';
import LearningActivitySidebar from '../components/learning/LearningActivitySidebar';
import EarnedCertificatesList from '../components/grades/EarnedCertificatesList';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");
  const role =
    localStorage.getItem("userRole") || localStorage.getItem("role") || "";

  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(role && { "x-demo-role": role }),
  };
};

const RECENT_ACTIVITY = [
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

const UPCOMING_DEADLINES = [
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

export default function MyLearning() {
  const { user } = useContext(AuthContext);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [certificates, setCertificates] = useState([]);
  const [isLoadingCertificates, setIsLoadingCertificates] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/courses/enrolled`, {
          headers: getAuthHeaders(),
        });
        const courses = res.data.enrolledCourses || [];
        setEnrolledCourses(courses);
        const total = courses.reduce((sum, course) => sum + Number(course.duration || 0), 0);
        setTotalDuration(total);
      } catch (err) {
        console.error("Error fetching enrolled courses:", err);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setIsLoadingCertificates(true);
      const userCertificates = await getMyCertificates();
      const sorted = (Array.isArray(userCertificates) ? userCertificates : []).sort((a, b) => {
        const dateA = new Date(a.issueDate || a.createdAt || 0);
        const dateB = new Date(b.issueDate || b.createdAt || 0);
        return dateB - dateA;
      });
      setCertificates(sorted);
    } catch (error) {
      console.error('Error loading certificates:', error);
      setCertificates([]);
    } finally {
      setIsLoadingCertificates(false);
    }
  };

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
            <LearningStatsCards
              enrolledCount={enrolledCourses.length}
              totalDuration={totalDuration}
              completedCount={1}
              certificateCount={certificates.length}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EnrolledCoursesList enrolledCourses={enrolledCourses} />
              <LearningActivitySidebar
                recentActivity={RECENT_ACTIVITY}
                upcomingDeadlines={UPCOMING_DEADLINES}
              />
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
            <EarnedCertificatesList
              certificates={certificates}
              isLoading={isLoadingCertificates}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

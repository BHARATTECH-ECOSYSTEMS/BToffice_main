import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { BarChart3, Download, Filter } from 'lucide-react';
import { getMyCertificates } from '../../services/certificateService';
import { OVERALL_STATS, COURSE_GRADES } from '../components/grades/gradeUtils';
import GradeStatsOverview from '../components/grades/GradeStatsOverview';
import CourseGradesList from '../components/grades/CourseGradesList';
import CourseAssignmentsBreakdown from '../components/grades/CourseAssignmentsBreakdown';
import EarnedCertificatesList from '../components/grades/EarnedCertificatesList';

export default function Grades() {
  const [certificates, setCertificates] = useState([]);
  const [isLoadingCertificates, setIsLoadingCertificates] = useState(false);

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
    <div className="flex flex-col min-h-screen bg-background mt-8 px-4 sm:px-6 lg:px-8">
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
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="courses" className="text-xs sm:text-sm">Courses</TabsTrigger>
          <TabsTrigger value="certificates" className="text-xs sm:text-sm">Certificates ({certificates.length})</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <GradeStatsOverview stats={OVERALL_STATS} />
          <CourseGradesList courseGrades={COURSE_GRADES} />
        </TabsContent>

        <TabsContent value="courses" className="space-y-6 mt-4">
          <CourseAssignmentsBreakdown courseGrades={COURSE_GRADES} />
        </TabsContent>

        <TabsContent value="certificates" className="mt-4 space-y-6">
          <EarnedCertificatesList certificates={certificates} isLoading={isLoadingCertificates} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card>
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
}

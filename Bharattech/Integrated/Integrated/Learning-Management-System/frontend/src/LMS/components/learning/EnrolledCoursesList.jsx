import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { Award } from 'lucide-react';

export default function EnrolledCoursesList({ enrolledCourses }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Continue Learning</h3>
      {enrolledCourses.map((course) => (
        <Card key={course._id || course.id} className="hover:shadow-md transition-shadow">
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
  );
}

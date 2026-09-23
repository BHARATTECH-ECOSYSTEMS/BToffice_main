import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { getGradeColor, getGradeText } from './gradeUtils';

export default function CourseGradesList({ courseGrades }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Course Grades</CardTitle>
        <CardDescription className="text-sm">Your current grades across all enrolled courses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {courseGrades.map((course) => (
            <div key={course.id} className="p-4 rounded-lg bg-muted/50">
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
  );
}

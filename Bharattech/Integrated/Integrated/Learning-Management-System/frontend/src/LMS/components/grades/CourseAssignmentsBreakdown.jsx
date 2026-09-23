import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { getGradeColor, getGradeText } from './gradeUtils';

export default function CourseAssignmentsBreakdown({ courseGrades }) {
  return (
    <div className="space-y-6">
      {courseGrades.map((course) => (
        <Card key={course.id}>
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
  );
}

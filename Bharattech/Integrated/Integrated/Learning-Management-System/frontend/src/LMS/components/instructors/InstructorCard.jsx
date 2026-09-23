import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Star, Users, BookOpen, MessageSquare, User } from 'lucide-react';

export default function InstructorCard({ instructor }) {
  return (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader className="p-5 sm:p-6 pb-4">
        <div className="flex items-start gap-4">
          <img 
            src={instructor.avatar} 
            alt={instructor.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg sm:text-xl mb-1 line-clamp-1">{instructor.name}</CardTitle>
            <CardDescription className="text-sm mb-3 line-clamp-1">
              {instructor.title} at {instructor.company}
            </CardDescription>
            <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{instructor.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{instructor.totalStudents.toLocaleString()} students</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{instructor.courses} courses</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-5 sm:p-6 pt-0">
        <p className="text-sm text-muted-foreground mb-5 line-clamp-3">
          {instructor.bio}
        </p>
        
        <div className="space-y-4 mb-6">
          <div>
            <h4 className="text-sm font-semibold mb-3">Specializations</h4>
            <div className="flex flex-wrap gap-2">
              {instructor.specializations.map((spec) => (
                <Badge key={spec} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-3">Active Courses</h4>
            <div className="space-y-1">
              {instructor.activeCourses.map((course, index) => (
                <p key={index} className="text-xs text-muted-foreground line-clamp-1">
                  • {course}
                </p>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button size="sm" className="flex-1 h-10">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message
          </Button>
          <Button variant="outline" size="sm" className="h-10 flex-shrink-0">
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

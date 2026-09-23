import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button, CircularProgress } from "@mui/material";
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { Clock, Users, Star } from 'lucide-react';

export default function CourseCard({ course, isEnrolled, loading, onEnroll }) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 flex flex-col h-full">
      <div className="relative">
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-40 sm:h-48 object-cover rounded-t-lg border-0"
        />

        <Badge className="absolute top-3 left-3 text-white">
          {course.courseLevel}
        </Badge>

        {isEnrolled && (
          <Badge className="absolute top-3 right-3 bg-gradient-primary text-primary-foreground">
            Enrolled
          </Badge>
        )}
      </div>

      <CardHeader className="pb-3">
        <Badge variant="secondary" className="w-fit mb-2">
          {course.category}
        </Badge>
        <CardTitle className="text-sm font-semibold line-clamp-2">
          {course.title}
        </CardTitle>
        <CardDescription className="text-xs">
          by {course.trainer?.email}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {course.rating}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {course.duration}
          </div>
        </div>

        {course.enrolled && course.progress > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Progress</span>
              <span>{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-2" />
          </div>
        )}

        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mt-auto">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">
              Rs. {course.price}
            </span>
            <span className="text-sm text-muted-foreground line-through">
              {course.originalPrice}
            </span>
          </div>
          <Button
            onClick={() => onEnroll(course._id)}
            size="sm"
            variant={course.enrolled ? "secondary" : "default"}
            className="whitespace-nowrap"
            sx={{ bgcolor: isEnrolled ? "green" : "hsl(14 100% 50%)", color: "white" }}
          >
            {loading ? <CircularProgress color="inherit" size={20} /> : isEnrolled ? "Continue" : "Enroll"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

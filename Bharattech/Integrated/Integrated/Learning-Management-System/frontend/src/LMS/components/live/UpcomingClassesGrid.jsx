import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Calendar, Clock, Users, Settings } from 'lucide-react';

export default function UpcomingClassesGrid({ upcomingClasses }) {
  return (
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
  );
}

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Calendar } from 'lucide-react';

export default function OfficeHoursList({ instructors }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Office Hours Schedule</CardTitle>
        <CardDescription>Book one-on-one sessions with your instructors</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {instructors.map((instructor) => (
            <div key={instructor.id} className="p-5 rounded-xl hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <img 
                    src={instructor.avatar} 
                    alt={instructor.name}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-base sm:text-lg line-clamp-1">{instructor.name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{instructor.officeHours}</p>
                  </div>
                </div>
                <Button size="sm" className="h-11 whitespace-nowrap">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Session
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

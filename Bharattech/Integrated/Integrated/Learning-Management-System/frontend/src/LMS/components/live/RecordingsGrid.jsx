import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Play } from 'lucide-react';

export default function RecordingsGrid({ recentRecordings }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {recentRecordings.map((recording) => (
        <Card key={recording.id} className="group hover:shadow-lg transition-all overflow-hidden">
          <div className="relative">
            <img 
              src={recording.thumbnail} 
              alt={recording.title}
              className="w-full h-40 sm:h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
              <Button size="sm" className="bg-primary hover:bg-primary/90 backdrop-blur-sm">
                <Play className="w-4 h-4 mr-2" />
                Watch
              </Button>
            </div>
            <Badge className="absolute top-3 left-3 bg-black/80 text-white text-xs">
              {recording.duration}
            </Badge>
          </div>
          
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm sm:text-base line-clamp-2">{recording.title}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">by {recording.instructor}</CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 pt-0 pb-4">
            <div className="space-y-2">
              <Badge variant="secondary" className="text-xs">
                {recording.course}
              </Badge>
              <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm text-muted-foreground gap-2">
                <span>{recording.recordedDate}</span>
                <span>{recording.views} views</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

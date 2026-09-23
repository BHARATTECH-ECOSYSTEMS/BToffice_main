import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Video, Clock, Users, Camera, Mic, Volume2 } from 'lucide-react';

export default function LiveNowCard({ session }) {
  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="relative flex-shrink-0">
                <img 
                  src={session.thumbnail} 
                  alt="Live session"
                  className="w-32 sm:w-40 h-24 sm:h-28 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center">
                    <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold mb-2 line-clamp-2">{session.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  by {session.instructor} • {session.course}
                </p>
                <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{session.participants} participants</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{session.duration}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-white rounded-xl p-4 sm:p-5">
              <h4 className="font-semibold mb-4 text-sm sm:text-base">Quick Settings</h4>
              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm">Camera</span>
                  <Button variant="outline" size="sm" className="h-8 w-10 sm:w-auto">
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm">Microphone</span>
                  <Button variant="outline" size="sm" className="h-8 w-10 sm:w-auto">
                    <Mic className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm">Audio</span>
                  <Button variant="outline" size="sm" className="h-8 w-10 sm:w-auto">
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button className="w-full bg-red-500 hover:bg-red-600 text-sm h-11 text-white">
                <Video className="w-4 h-4 mr-2" />
                Join Live Session
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

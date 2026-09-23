import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Star, Users, Award, Mail, Phone, MapPin, Calendar, MessageSquare, ExternalLink } from 'lucide-react';

export default function MyInstructorDetailCard({ instructor }) {
  return (
    <Card className="hover:shadow-lg transition-all">
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-start gap-4 mb-6">
              <img 
                src={instructor.avatar} 
                alt={instructor.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 line-clamp-1">{instructor.name}</h3>
                <p className="text-lg sm:text-xl text-muted-foreground mb-3 line-clamp-1">
                  {instructor.title} at {instructor.company}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{instructor.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{instructor.totalStudents.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{instructor.bio}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 sm:p-6 rounded-xl bg-muted/20">
              <div>
                <h4 className="font-semibold mb-4 text-base">Achievements</h4>
                <ul className="space-y-2">
                  {instructor.achievements.map((achievement, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Award className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4 text-base">My Courses</h4>
                <div className="space-y-2">
                  {instructor.activeCourses.map((course, index) => (
                    <p key={index} className="text-sm text-muted-foreground line-clamp-2">
                      • {course}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground break-all">{instructor.email}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{instructor.phone}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{instructor.location}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{instructor.officeHours}</span>
                </div>
                
                <div className="pt-4 space-y-2">
                  <Button size="sm" className="w-full h-10">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline" size="sm" className="w-full h-10">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Office Hours
                  </Button>
                  <Button variant="outline" size="sm" className="w-full h-10">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    LinkedIn
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

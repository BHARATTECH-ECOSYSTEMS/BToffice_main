import React from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export default function ContactInfoCard() {
  const contactInfo = [
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Visit Us",
      details: ["Bharattech Solutions Pvt. Ltd.", "Bengaluru, Karnataka, India", "Tech Hub District"]
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Call Us",
      details: ["+91 98765 43210", "+91 98765 43211", "24/7 Support Available"]
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Us",
      details: ["hello@bharattech.com", "support@bharattech.com", "careers@bharattech.com"]
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Business Hours",
      details: ["Mon - Fri: 9:00 AM - 7:00 PM", "Sat: 10:00 AM - 4:00 PM", "Sun: Emergency Support Only"]
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Get in Touch</h2>
        <p className="text-gray-600 text-lg mb-8">
          We're here to help you succeed. Whether you're a startup looking for support or an enterprise seeking digital transformation, our team is ready to assist you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {contactInfo.map((info, index) => (
          <Card key={index} className="border rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  {info.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{info.title}</h3>
                  <div className="space-y-1">
                    {info.details.map((detail, idx) => (
                      <p key={idx} className="text-gray-600 text-sm">{detail}</p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-3">
          <Button 
            onClick={() => window.open("mailto:support@bharattech.com?subject=Schedule a Call Request", "_blank")}
            variant="outline" 
            className="justify-start h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <Phone className="w-4 h-4 mr-3" />
            Schedule a Call
          </Button>
          <Button 
            onClick={() => window.open("mailto:support@bharattech.com", "_blank")}
            variant="outline" 
            className="justify-start h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <Mail className="w-4 h-4 mr-3" />
            Email Support
          </Button>
          <Button 
            onClick={() => window.open("https://maps.google.com/?q=Bengaluru+Karnataka+India", "_blank")}
            variant="outline" 
            className="justify-start h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <MapPin className="w-4 h-4 mr-3" />
            Visit Our Office
          </Button>
        </div>
      </div>
    </div>
  );
}

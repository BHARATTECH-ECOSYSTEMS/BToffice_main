import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Send, CheckCircle, AlertCircle } from "lucide-react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSubmitStatus("success");
    setIsSubmitting(false);

    setTimeout(() => {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        subject: "",
        message: ""
      });
      setSubmitStatus(null);
    }, 3000);
  };

  return (
    <Card className="border rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-900">Send Us a Message</CardTitle>
        <CardDescription className="text-gray-600">
          Fill out the form below and we'll get back to you within 24 hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitStatus === "success" && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>Message sent successfully! We'll get back to you soon.</span>
            </div>
          )}
          {submitStatus === "error" && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>Failed to send message. Please try again.</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 mb-2">First Name</label>
              <Input id="firstName" placeholder="John" value={formData.firstName} onChange={handleInputChange} required />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 mb-2">Last Name</label>
              <Input id="lastName" placeholder="Doe" value={formData.lastName} onChange={handleInputChange} required />
            </div>
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">Email Address</label>
            <Input id="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleInputChange} required />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">Phone Number</label>
            <Input id="phone" type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={handleInputChange} />
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-900 mb-2">Company</label>
            <Input id="company" placeholder="Your Company Name" value={formData.company} onChange={handleInputChange} />
          </div>
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-900 mb-2">Subject</label>
            <Input id="subject" placeholder="What would you like to discuss?" value={formData.subject} onChange={handleInputChange} required />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">Message</label>
            <Textarea id="message" rows={6} placeholder="Tell us about your project requirements..." value={formData.message} onChange={handleInputChange} required />
          </div>
          
          <Button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-6 py-3 rounded-md font-medium disabled:opacity-70 cursor-pointer"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

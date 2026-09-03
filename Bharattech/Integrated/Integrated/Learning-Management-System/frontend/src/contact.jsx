import React, { useState } from "react";
import TopNav from "./components/topnav";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, AlertCircle } from "lucide-react";

const Contact = () => {
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
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' or 'error'
  
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate success
    setSubmitStatus('success');
    setIsSubmitting(false);
    
    // Reset form after success
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
  
  const handleScheduleCall = () => {
    window.open("mailto:support@bharattech.com?subject=Schedule a Call Request", "_blank");
  };
  
  const handleEmailSupport = () => {
    window.open("mailto:support@bharattech.com", "_blank");
  };
  
  const handleVisitOffice = () => {
    window.open("https://maps.google.com/?q=Bengaluru+Karnataka+India", "_blank");
  };
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
    <>
      <TopNav />
      
      <div className="min-h-screen bg-white pt-28">
        <div className="max-w-7xl mx-auto px-6">
          {/* Hero Section */}
          <section className="relative py-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-white to-white" />
            
            <div className="relative z-10">
              <div className="text-center max-w-4xl mx-auto">
                <Badge variant="outline" className="mb-4 px-4 py-1.5 rounded-md text-sm">
                  Get In Touch
                </Badge>

                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  <span className="text-gray-900">Let's Build Something</span>
                  <br />
                  <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                    Amazing Together
                  </span>
                </h1>

                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                  Ready to transform your business with cutting-edge AI and deep-tech solutions? We'd love to hear from you.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Form & Info */}
          <section className="py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div>
                <Card className="border rounded-xl shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900">Send Us a Message</CardTitle>
                    <CardDescription className="text-gray-600">
                      Fill out the form below and we'll get back to you within 24 hours.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {submitStatus === 'success' && (
                        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                          <CheckCircle className="w-5 h-5" />
                          <span>Message sent successfully! We'll get back to you soon.</span>
                        </div>
                      )}
                      {submitStatus === 'error' && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                          <AlertCircle className="w-5 h-5" />
                          <span>Failed to send message. Please try again.</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 mb-2">
                            First Name
                          </label>
                          <Input 
                            id="firstName" 
                            placeholder="John" 
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 mb-2">
                            Last Name
                          </label>
                          <Input 
                            id="lastName" 
                            placeholder="Doe" 
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                          Email Address
                        </label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="john@example.com" 
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">
                          Phone Number
                        </label>
                        <Input 
                          id="phone" 
                          type="tel" 
                          placeholder="+91 98765 43210" 
                          value={formData.phone}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-900 mb-2">
                          Company
                        </label>
                        <Input 
                          id="company" 
                          placeholder="Your Company Name" 
                          value={formData.company}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-900 mb-2">
                          Subject
                        </label>
                        <Input 
                          id="subject" 
                          placeholder="What would you like to discuss?" 
                          value={formData.subject}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
                          Message
                        </label>
                        <Textarea 
                          id="message" 
                          rows={6}
                          placeholder="Tell us about your project requirements, goals, and how we can help you achieve them..."
                          value={formData.message}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      
                      <Button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-6 py-3 rounded-md font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Send className="w-4 h-4 mr-2 animate-pulse" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Get in Touch
                  </h2>
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
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {info.title}
                            </h3>
                            <div className="space-y-1">
                              {info.details.map((detail, idx) => (
                                <p key={idx} className="text-gray-600 text-sm">
                                  {detail}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Quick Contact Buttons */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      onClick={handleScheduleCall}
                      variant="outline" 
                      className="justify-start h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      <Phone className="w-4 h-4 mr-3" />
                      Schedule a Call
                    </Button>
                    <Button 
                      onClick={handleEmailSupport}
                      variant="outline" 
                      className="justify-start h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      <Mail className="w-4 h-4 mr-3" />
                      Email Support
                    </Button>
                    <Button 
                      onClick={handleVisitOffice}
                      variant="outline" 
                      className="justify-start h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 mr-3" />
                      Visit Our Office
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-20 bg-gray-50 rounded-2xl mb-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Quick answers to common questions about our services and processes.
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {[
                {
                  question: "What technologies do you specialize in?",
                  answer: "We specialize in AI/ML, deep learning, blockchain, IoT, cloud computing, and modern web/mobile technologies."
                },
                {
                  question: "How long does a typical project take?",
                  answer: "Project timelines vary from 3-6 months for MVP development to 12+ months for complex enterprise solutions."
                },
                {
                  question: "Do you provide ongoing support and maintenance?",
                  answer: "Yes, we offer comprehensive post-launch support, maintenance, and continuous improvement services."
                },
                {
                  question: "Can you work with existing teams?",
                  answer: "Absolutely! We can augment your existing team or work collaboratively with your in-house developers."
                }
              ].map((faq, index) => (
                <Card key={index} className="border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600">
                      {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default Contact;


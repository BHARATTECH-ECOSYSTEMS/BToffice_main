import React from "react";
import TopNav from "./components/topnav";
import { Badge } from "./components/ui/badge";
import ContactForm from "./components/contact/ContactForm";
import ContactInfoCard from "./components/contact/ContactInfoCard";
import ContactFaqSection from "./components/contact/ContactFaqSection";

const Contact = () => {
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
              <ContactForm />
              <ContactInfoCard />
            </div>
          </section>

          {/* FAQ Section */}
          <ContactFaqSection />
        </div>
      </div>
    </>
  );
};

export default Contact;

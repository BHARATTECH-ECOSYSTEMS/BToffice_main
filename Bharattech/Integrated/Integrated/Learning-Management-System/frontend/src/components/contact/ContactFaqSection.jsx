import React from "react";
import { Card, CardContent } from "../ui/card";

const FAQS = [
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
];

export default function ContactFaqSection() {
  return (
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
        {FAQS.map((faq, index) => (
          <Card key={index} className="border rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

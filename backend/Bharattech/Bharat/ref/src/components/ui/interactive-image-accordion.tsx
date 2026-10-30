import React, { useState } from 'react';
import { cn } from '@/lib/utils';

const accordionItems = [
  {
    id: 1,
    title: 'Voice Assistant',
    imageUrl: 'https://images.unsplash.com/photo-1628258334105-2a0b3d6efee1?q=80&w=1974&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'AI Image Generation',
    imageUrl: 'https://images.unsplash.com/photo-1677756119517-756a188d2d94?q=80&w=2070&auto=format&fit=crop',
  },
  {
    id: 3,
    title: 'AI Chatbot + Local RAG',
    imageUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1974&auto=format&fit=crop',
  },
  {
    id: 4,
    title: 'AI Agent',
    imageUrl: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=2090&auto=format&fit=crop',
  },
  {
    id: 5,
    title: 'Visual Understanding',
    imageUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=2070&auto=format&fit=crop',
  },
];

interface AccordionItemProps {
  item: typeof accordionItems[number];
  isActive: boolean;
  onMouseEnter: () => void;
}

const AccordionItem = ({ item, isActive, onMouseEnter }: AccordionItemProps) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      className={cn(
        'relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 ease-in-out',
        isActive ? 'flex-[4]' : 'flex-[0.8]'
      )}
      style={{ minHeight: '400px' }}
    >
      <img
        src={item.imageUrl}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).onerror = null;
          (e.target as HTMLImageElement).src = 'https://placehold.co/400x450/2d3748/ffffff?text=Image+Error';
        }}
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className={cn(
          'text-white font-display font-semibold transition-all duration-300',
          isActive ? 'text-lg opacity-100' : 'text-sm opacity-70 [writing-mode:vertical-rl] rotate-180'
        )}>
          {item.title}
        </p>
      </div>
    </div>
  );
};

export function LandingAccordionItem() {
  const [activeIndex, setActiveIndex] = useState(4);

  return (
    <section className="py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side: Text Content */}
          <div className="flex flex-col justify-center">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
              Accelerate Gen-AI Tasks on Any Device
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Build high-performance AI apps on-device without the hassle of model compression or edge deployment.
            </p>
            <div>
              <button className="h-12 px-8 rounded-full bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors">
                Contact Us
              </button>
            </div>
          </div>

          {/* Right Side: Image Accordion */}
          <div className="w-full">
            <div className="flex flex-row gap-2 h-[400px] lg:h-[450px]">
              {accordionItems.map((item, index) => (
                <AccordionItem
                  key={item.id}
                  item={item}
                  isActive={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

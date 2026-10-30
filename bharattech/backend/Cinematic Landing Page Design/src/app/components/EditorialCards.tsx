import React from 'react';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';

const cards = [
  {
    title: "Ideas",
    desc: "Reimagining the primitive elements of computing.",
    img: "https://images.unsplash.com/photo-1531591022136-eb8b0da1e6d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dGlmdWwlMjBtb2Rlcm4lMjBhcmNoaXRlY3R1cmUlMjBhYnN0cmFjdHxlbnwxfHx8fDE3ODI1NjAyMzR8MA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    title: "Research",
    desc: "Pushing the boundaries of general reasoning models.",
    img: "https://images.unsplash.com/photo-1562813733-b31f71025d54?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhaSUyMHJlc2VhcmNoJTIwbGFiJTIwZGFya3xlbnwxfHx8fDE3ODI1NjAyMzN8MA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    title: "Impact",
    desc: "Deploying intelligence to solve civilization-scale problems.",
    img: "https://images.unsplash.com/photo-1695668548342-c0c1ad479aee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncHUlMjBzZXJ2ZXIlMjByYWNrJTIwZGFya3xlbnwxfHx8fDE3ODI1NjAyMzN8MA&ixlib=rb-4.1.0&q=80&w=1080"
  }
];

export const EditorialCards = () => {
  return (
    <section className="py-32 bg-[#FAFAFC]" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-8 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-6 group cursor-pointer"
            >
              <div className="w-full aspect-[4/3] rounded-[24px] overflow-hidden bg-[#EDEDF3]">
                <ImageWithFallback 
                  src={card.img}
                  alt={card.title}
                  className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-700 ease-out grayscale-[0.2] group-hover:grayscale-0"
                />
              </div>
              <div>
                <h3 className="text-2xl font-medium text-[#09090B] mb-2 group-hover:text-[#6A35FF] transition-colors">{card.title}</h3>
                <p className="text-[#09090B]/60 font-light">{card.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

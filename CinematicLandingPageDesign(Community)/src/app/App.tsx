import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Problems } from './components/Problems';
import { Capabilities } from './components/Capabilities';
import { Architecture } from './components/Architecture';
import { GlobalNetwork } from './components/GlobalNetwork';
import { Builders } from './components/Builders';
import { EditorialCards } from './components/EditorialCards';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="bg-[#FFFFFF] min-h-screen selection:bg-[#6A35FF] selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <Problems />
        <Capabilities />
        <Architecture />
        <GlobalNetwork />
        <Builders />
        <EditorialCards />
      </main>
      <Footer />
    </div>
  );
}

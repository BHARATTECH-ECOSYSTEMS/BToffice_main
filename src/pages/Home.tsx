import { Hero } from '../sections/Hero';
import { Intro } from '../sections/Intro';
import { HowItWorks } from '../sections/HowItWorks';
import { Audiences } from '../sections/Audiences';
import { Faq } from '../sections/Faq';
import { Problem } from '../sections/Problem';
import { Capabilities } from '../sections/Capabilities';
import { Architecture } from '../sections/Architecture';
import { Network } from '../sections/Network';
import { Laboratory } from '../sections/Laboratory';
import { Builders } from '../sections/Builders';
import { Journal } from '../sections/Journal';
import { Finale } from '../sections/Finale';

export function Home() {
  return (
    <>
      <Hero />
      <Intro />
      <Problem />
      <Capabilities />
      <HowItWorks />
      <Architecture />
      <Network />
      <Laboratory />
      <Audiences />
      <Builders />
      <Journal />
      <Faq />
      <Finale />
    </>
  );
}

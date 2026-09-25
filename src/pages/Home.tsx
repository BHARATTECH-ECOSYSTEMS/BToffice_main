import { Hero } from '../sections/Hero';
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
      <Problem />
      <Capabilities />
      <Architecture />
      <Network />
      <Laboratory />
      <Builders />
      <Journal />
      <Finale />
    </>
  );
}

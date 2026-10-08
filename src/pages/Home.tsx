import { Story } from '../sections/Story';
import { Capabilities } from '../sections/Capabilities';
import { HowItWorks } from '../sections/HowItWorks';
import { Architecture } from '../sections/Architecture';
import { Network } from '../sections/Network';
import { Research } from '../sections/Research';
import { Audiences } from '../sections/Audiences';
import { Journal } from '../sections/Journal';
import { Faq } from '../sections/Faq';
import { Finale } from '../sections/Finale';

export function Home() {
  return (
    <>
      <Story />
      <Capabilities />
      <HowItWorks />
      <Architecture />
      <Network />
      <Research />
      <Audiences />
      <Journal />
      <Faq />
      <Finale />
    </>
  );
}

import type { HueName } from '../gl/palette';
import { ResearchConstellation } from './ResearchConstellation';
import { DeveloperConstellation } from './DeveloperConstellation';
import { AudienceStory } from './AudienceStories';

interface AudienceArtProps {
  index: number;
  tone?: HueName;
}

export function AudienceArt({ index, tone = 'violet' }: AudienceArtProps) {
  return (
    <div className="audience-art-container" data-tone={tone}>
      {index === 0 && <ResearchConstellation tone={tone} />}
      {index === 1 && <DeveloperConstellation tone={tone} />}
      {index >= 2 && index <= 5 && <AudienceStory index={index - 2} tone={tone} />}
    </div>
  );
}

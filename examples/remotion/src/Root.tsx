import {Composition, staticFile} from 'remotion';
import {Meme, type MemeProps} from './Meme';

const FPS = 30;

/** Written by fetch-clip.mjs next to the keyed clip. */
type ClipInfo = {id: string; name: string; durationSeconds: number | null};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Meme"
    component={Meme}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 5}
    defaultProps={{background: 'background.jpg', clip: 'greenscreen.webm', caption: ''} satisfies MemeProps}
    // The video lasts as long as the clip.
    calculateMetadata={async () => {
      const info: ClipInfo = await fetch(staticFile('clip.json')).then(r => r.json());
      return {durationInFrames: Math.max(1, Math.round((info.durationSeconds ?? 5) * FPS))};
    }}
  />
);

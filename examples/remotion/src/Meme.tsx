import {AbsoluteFill, Img, OffthreadVideo, staticFile} from 'remotion';

export type MemeProps = {
  /** An image in public/, shown full-bleed behind the clip. */
  background: string;
  /** The clip, already keyed to a transparent WebM by fetch-clip.mjs. */
  clip: string;
  /** Optional caption at the top. */
  caption: string;
};

export const Meme: React.FC<MemeProps> = ({background, clip, caption}) => (
  <AbsoluteFill style={{backgroundColor: 'black'}}>
    <Img src={staticFile(background)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />

    {/* Clip at the bottom, full width, with its own sound. `transparent` keeps the
        alpha channel when Remotion extracts frames during a render. */}
    <AbsoluteFill style={{justifyContent: 'flex-end'}}>
      <OffthreadVideo src={staticFile(clip)} transparent style={{width: '100%'}} />
    </AbsoluteFill>

    {caption ? (
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 200, paddingLeft: 60, paddingRight: 60}}>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.15,
            padding: '14px 28px',
            borderRadius: 18,
            textAlign: 'center',
          }}
        >
          {caption}
        </div>
      </AbsoluteFill>
    ) : null}
  </AbsoluteFill>
);

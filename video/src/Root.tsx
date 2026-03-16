import { Composition } from "remotion";
import { PocketWatch } from "./PocketWatch";
import { FPS, TOTAL_FRAMES } from "./design";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PocketWatchVideo"
      component={PocketWatch}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};

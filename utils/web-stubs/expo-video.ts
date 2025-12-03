// Web stub for expo-video - this module doesn't work on web
// Use HTML5 video element instead

export const VideoView = () => null;

export const useVideoPlayer = (source: string | null, callback?: (player: any) => void) => {
  // Return a mock player object for web
  const mockPlayer = {
    loop: false,
    muted: false,
    play: () => {},
    pause: () => {},
    replaceAsync: async () => {},
    addListener: () => {},
    removeAllListeners: () => {},
  };
  
  if (callback) {
    callback(mockPlayer);
  }
  
  return mockPlayer;
};

export default {
  VideoView,
  useVideoPlayer,
};





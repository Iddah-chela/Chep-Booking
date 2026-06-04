/**
 * Generate a thumbnail from a video URL by extracting the first frame
 * @param {string} videoUrl - The video URL
 * @param {number} timeOffset - Time in seconds to capture frame (default: 0)
 * @returns {Promise<string>} - Returns a data URL or null if extraction fails
 */
export const generateVideoThumbnail = (videoUrl, timeOffset = 0) => {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.currentTime = timeOffset;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const onCanPlay = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        video.removeEventListener('canplay', onCanPlay);
        video.pause();
        
        try {
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnail);
        } catch (e) {
          // CORS or other canvas error
          resolve(null);
        }
      };
      
      const onError = () => {
        video.removeEventListener('error', onError);
        video.removeEventListener('canplay', onCanPlay);
        resolve(null);
      };
      
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onError);
      
      // Add a timeout in case video never loads
      const timeout = setTimeout(() => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
        video.pause();
        resolve(null);
      }, 5000);
      
      // Only pause after we've attempted to play
      video.play().catch(() => {
        clearTimeout(timeout);
        onError();
      });
    } catch (error) {
      resolve(null);
    }
  });
};

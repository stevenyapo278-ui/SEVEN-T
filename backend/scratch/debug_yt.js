import * as yt from 'youtube-transcript';
console.log('Keys of yt:', Object.keys(yt));
console.log('Default of yt:', yt.default);
try {
  console.log('YoutubeTranscript of yt:', yt.YoutubeTranscript);
} catch (e) {
  console.log('Error accessing YoutubeTranscript');
}

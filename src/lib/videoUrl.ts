// Explainer videos are too large to ship with the Vercel build, so they live in a public
// S3 bucket. Paths like /explainer/video/bandra-01.mp4 resolve to the bucket root.
// Set VITE_VIDEO_BASE to override (e.g. a CloudFront domain); set it to "" to serve locally.
const BASE: string =
  (import.meta.env.VITE_VIDEO_BASE as string | undefined) ??
  'https://sales-plan-2027-videos.s3.ap-southeast-2.amazonaws.com';

export function videoUrl(path: string): string {
  if (!BASE || /^https?:\/\//.test(path)) return path;
  return path.replace(/^\/explainer\/video\//, `${BASE.replace(/\/$/, '')}/`);
}

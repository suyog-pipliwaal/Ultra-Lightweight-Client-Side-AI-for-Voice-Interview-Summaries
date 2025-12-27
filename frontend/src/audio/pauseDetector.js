export function detectPause(timestamps) {
  if (timestamps.length < 2) return null;

  const gap =
    timestamps[timestamps.length - 1] -
    timestamps[timestamps.length - 2];

  if (gap > 1200) return "LONG_PAUSE";
  if (gap > 600) return "SHORT_PAUSE";

  return null;
}
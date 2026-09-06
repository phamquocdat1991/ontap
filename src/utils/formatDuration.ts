export const formatDuration = (durationSeconds?: number): string => {
  const totalSeconds = Math.max(0, Math.round(durationSeconds ?? 0));

  if (totalSeconds < 60) {
    return `${totalSeconds} giây`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes} phút ${seconds} giây` : `${minutes} phút`;
};

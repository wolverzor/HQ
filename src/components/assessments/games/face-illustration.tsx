type Emotion = "happy" | "sad" | "angry" | "surprised" | "fearful" | "disgusted";

// Minimalist line-art face, not a photo or emoji - avoids likeness/licensing issues while
// still giving a clear, distinct silhouette per emotion for a quick-judgment task.
export function FaceIllustration({ emotion, className }: { emotion: Emotion; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="3.5">
      <circle cx="50" cy="50" r="42" strokeWidth="3" />
      <FaceFeatures emotion={emotion} />
    </svg>
  );
}

function FaceFeatures({ emotion }: { emotion: Emotion }) {
  switch (emotion) {
    case "happy":
      return (
        <>
          <path d="M27,38 Q34,33 41,38" strokeLinecap="round" />
          <path d="M59,38 Q66,33 73,38" strokeLinecap="round" />
          <path d="M28,42 Q34,37 40,42" strokeLinecap="round" />
          <path d="M60,42 Q66,37 72,42" strokeLinecap="round" />
          <path d="M28,64 Q50,88 72,64" strokeLinecap="round" />
        </>
      );
    case "sad":
      return (
        <>
          <path d="M25,30 L41,38" strokeLinecap="round" />
          <path d="M75,30 L59,38" strokeLinecap="round" />
          <circle cx="34" cy="46" r="4.5" fill="currentColor" stroke="none" />
          <circle cx="66" cy="46" r="4.5" fill="currentColor" stroke="none" />
          <path d="M30,74 Q50,60 70,74" strokeLinecap="round" />
        </>
      );
    case "angry":
      return (
        <>
          <path d="M25,26 L41,36" strokeLinecap="round" />
          <path d="M75,26 L59,36" strokeLinecap="round" />
          <path d="M28,44 L40,44" strokeLinecap="round" />
          <path d="M60,44 L72,44" strokeLinecap="round" />
          <path d="M31,70 L69,70" strokeLinecap="round" />
        </>
      );
    case "surprised":
      return (
        <>
          <path d="M24,26 Q34,18 44,26" strokeLinecap="round" />
          <path d="M56,26 Q66,18 76,26" strokeLinecap="round" />
          <circle cx="34" cy="44" r="6.5" />
          <circle cx="66" cy="44" r="6.5" />
          <ellipse cx="50" cy="70" rx="8" ry="11" />
        </>
      );
    case "fearful":
      return (
        <>
          <path d="M24,32 Q34,20 44,30" strokeLinecap="round" />
          <path d="M56,30 Q66,20 76,32" strokeLinecap="round" />
          <circle cx="34" cy="45" r="6.5" />
          <circle cx="66" cy="45" r="6.5" />
          <ellipse cx="50" cy="70" rx="5" ry="6" />
        </>
      );
    case "disgusted":
      return (
        <>
          <path d="M25,32 L40,38" strokeLinecap="round" />
          <path d="M60,28 L75,26" strokeLinecap="round" />
          <path d="M28,46 L39,44" strokeLinecap="round" />
          <circle cx="66" cy="44" r="4.5" fill="currentColor" stroke="none" />
          <path d="M46,52 Q50,56 54,52" strokeLinecap="round" />
          <path d="M30,70 Q42,64 50,70 Q60,76 70,66" strokeLinecap="round" />
        </>
      );
  }
}

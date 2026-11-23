import styles from './lesson-thumbnail.module.css';

/**
 * Small lesson artwork for lists. Mirrors the student app's vector scenes (ADR-0009): the café
 * for "Al bar", an open book for lessons without their own artwork. Colours are the illustration
 * palette of the design system, set as CSS variables in `lesson-thumbnail.module.css`.
 */
export function LessonThumbnail({ lessonId, size = 48 }: { lessonId: string; size?: number }) {
  return (
    <span className={styles.frame} style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size * 0.82} viewBox="70 34 180 132">
        <circle cx={160} cy={98} r={78} className={styles.halo} />
        <path d="M-40 146 h400 v20 h-400 z" className={styles.counter} />
        {lessonId === 'al-bar' ? (
          <>
            <ellipse cx={150} cy={146} rx={72} ry={11} className={styles.porcelain} />
            <path
              d="M98 84 h104 v22 a52 50 0 0 1 -52 36 a52 50 0 0 1 -52 -36 z"
              className={styles.porcelain}
            />
            <ellipse cx={150} cy={84} rx={52} ry={10} className={styles.espresso} />
            <ellipse cx={150} cy={84} rx={40} ry={6.5} className={styles.crema} />
            <path d="M100 104 h100" className={styles.accent} strokeWidth={6} />
          </>
        ) : (
          <>
            <path
              d="M160 66 c-26 -12 -54 -12 -76 -4 v76 c22 -8 50 -8 76 4 z"
              className={styles.porcelain}
            />
            <path
              d="M160 66 c26 -12 54 -12 76 -4 v76 c-22 -8 -50 -8 -76 4 z"
              className={styles.porcelain}
            />
            <path d="M160 66 v76" className={styles.accent} strokeWidth={4} />
          </>
        )}
      </svg>
    </span>
  );
}

/**
 * Which lessons are open on screen. An update for an open lesson waits until the student leaves
 * it, so a lesson is never swapped mid-lesson (DEVELOPMENT_PLAN M7).
 */
export interface LessonHolds {
  /** Marks a lesson as open; call the returned function when the screen closes. */
  hold(lessonId: string): () => void;
  isHeld(lessonId: string): boolean;
  /** Called when the last screen of a lesson closes. */
  onReleased(listener: (lessonId: string) => void): () => void;
}

export function createLessonHolds(): LessonHolds {
  const counts = new Map<string, number>();
  const listeners = new Set<(lessonId: string) => void>();
  return {
    hold(lessonId) {
      counts.set(lessonId, (counts.get(lessonId) ?? 0) + 1);
      let released = false;
      return () => {
        if (released) {
          return;
        }
        released = true;
        const remaining = (counts.get(lessonId) ?? 1) - 1;
        if (remaining > 0) {
          counts.set(lessonId, remaining);
          return;
        }
        counts.delete(lessonId);
        listeners.forEach((listener) => {
          listener(lessonId);
        });
      };
    },
    isHeld: (lessonId) => counts.has(lessonId),
    onReleased(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

import { isCorrectAnswer, type Exercise } from './exercises';

/** One answered exercise of a session. */
export interface PracticeResult {
  exerciseId: string;
  itemKey: string;
  correct: boolean;
}

/**
 * A practice session in progress (spec §9, ADR-0017): the student answers, checks, sees the
 * solution and moves on. `index === exercises.length` means the session is over.
 */
export interface PracticeSessionState {
  exercises: readonly Exercise[];
  index: number;
  /** Chosen option (choice, fill in the blank). */
  selected: string | null;
  /** Positions in the current exercise's `tiles`, in the order the student placed them. */
  placed: readonly number[];
  /** `null` while answering; after checking, whether the answer was right. */
  checked: boolean | null;
  results: readonly PracticeResult[];
}

export type PracticeSessionAction =
  | { type: 'select'; option: string }
  | { type: 'placeTile'; tile: number }
  | { type: 'removeTile'; position: number }
  | { type: 'check' }
  | { type: 'next' }
  | { type: 'restart'; exercises: readonly Exercise[] };

export function startSession(exercises: readonly Exercise[]): PracticeSessionState {
  return { exercises, index: 0, selected: null, placed: [], checked: null, results: [] };
}

export function currentExercise(state: PracticeSessionState): Exercise | undefined {
  return state.exercises[state.index];
}

export function isSessionFinished(state: PracticeSessionState): boolean {
  return state.index >= state.exercises.length;
}

/** The answer as built so far: the chosen option or the placed tiles' texts. */
export function currentAnswer(state: PracticeSessionState): string | readonly string[] | null {
  const exercise = currentExercise(state);
  if (exercise === undefined) return null;
  if (exercise.type === 'build') {
    return state.placed.map((tile) => exercise.tiles[tile] ?? '');
  }
  return state.selected;
}

export function canCheck(state: PracticeSessionState): boolean {
  const exercise = currentExercise(state);
  if (exercise === undefined || state.checked !== null) return false;
  return exercise.type === 'build' ? state.placed.length > 0 : state.selected !== null;
}

export function practiceSessionReducer(
  state: PracticeSessionState,
  action: PracticeSessionAction,
): PracticeSessionState {
  const exercise = currentExercise(state);
  const answering = exercise !== undefined && state.checked === null;
  switch (action.type) {
    case 'select':
      return answering && exercise.type !== 'build' ? { ...state, selected: action.option } : state;
    case 'placeTile':
      return answering &&
        exercise.type === 'build' &&
        action.tile >= 0 &&
        action.tile < exercise.tiles.length &&
        !state.placed.includes(action.tile)
        ? { ...state, placed: [...state.placed, action.tile] }
        : state;
    case 'removeTile':
      return answering
        ? { ...state, placed: state.placed.filter((_, position) => position !== action.position) }
        : state;
    case 'check': {
      const answer = currentAnswer(state);
      if (!canCheck(state) || exercise === undefined || answer === null) return state;
      const correct = isCorrectAnswer(exercise, answer);
      return {
        ...state,
        checked: correct,
        results: [
          ...state.results,
          { exerciseId: exercise.id, itemKey: exercise.itemKey, correct },
        ],
      };
    }
    case 'next':
      return state.checked === null
        ? state
        : { ...state, index: state.index + 1, selected: null, placed: [], checked: null };
    case 'restart':
      return startSession(action.exercises);
  }
}

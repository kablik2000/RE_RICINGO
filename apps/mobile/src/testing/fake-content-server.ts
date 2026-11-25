import { AppError } from '@/core/errors';
import type { Telemetry } from '@/core/telemetry';
import type { DataServices } from '@/data';
import type { CatalogEntry, ContentApi } from '@/data/content/content-api';
import { createContentSync } from '@/data/content/content-sync';
import { createLessonHolds } from '@/data/content/lesson-holds';
import type { ConnectionKind, UpdatePolicy } from '@/data/content/update-rules';
import { createUpdateSettings } from '@/data/content/update-settings';
import alBar from '@/data/demo/al-bar.lesson.json';
import { createLessonLibrary, toSeed } from '@/data/lesson-library';
import type { AccountApi } from '@/data/account/account-api';
import { openTokenStore } from '@/data/account/token-store.web';
import { createMemoryLocalStore } from '@/data/local/local-store';

type Bundle = typeof alBar;

/** The demo lesson as a different lesson or a later version (test content). */
export function lessonBundle(id = 'al-bar', version = 1, titleItalian = 'Al bar'): Bundle {
  return { ...alBar, lesson: { ...alBar.lesson, id, version, titleItalian } };
}

/** Test-only lesson server: publish bundles, then let the app check and download them. */
export function createFakeContentServer() {
  const published = new Map<string, { entry: CatalogEntry; bundle: unknown }>();
  const failing = new Set<string>();
  const api: ContentApi = {
    fetchCatalog: jest.fn(() =>
      Promise.resolve([...published.values()].map((lesson) => lesson.entry)),
    ),
    fetchLessonVersion: jest.fn((lessonId: string, version: number) => {
      const lesson = published.get(lessonId);
      if (failing.has(lessonId)) {
        return Promise.reject(new AppError('network', 'Connection lost.'));
      }
      if (lesson?.entry.version !== version) {
        return Promise.reject(new AppError('notFound', `No ${lessonId} v${version}.`));
      }
      return Promise.resolve({ checksum: lesson.entry.checksum, bundle: lesson.bundle });
    }),
  };
  return {
    api,
    publish(bundle: Bundle, checksum = `${bundle.lesson.id}-v${bundle.lesson.version}`) {
      published.set(bundle.lesson.id, {
        bundle,
        entry: {
          id: bundle.lesson.id,
          version: bundle.lesson.version,
          checksum,
          publishedAt: '2026-11-23T10:00:00+00:00',
          titleItalian: bundle.lesson.titleItalian,
          titleCzech: bundle.lesson.titleCzech,
          level: bundle.lesson.level,
        },
      });
    },
    /** The lecturer unpublished the lesson: it leaves the catalog. */
    unpublish(lessonId: string) {
      published.delete(lessonId);
    },
    failDownloadsOf(lessonId: string) {
      failing.add(lessonId);
    },
  };
}

export interface TestServicesOptions {
  connection?: ConnectionKind;
  policy?: UpdatePolicy;
  /** Student account API (tests of sign-in screens); none by default. */
  account?: AccountApi | null;
}

/**
 * Data services over memory storage, the bundled demo lesson and a fake lesson server that
 * publishes the same demo lesson (as the development server does).
 */
export function createTestServices({
  connection = 'unmetered',
  policy,
  account = null,
}: TestServicesOptions = {}) {
  const server = createFakeContentServer();
  server.publish(lessonBundle());
  const store = createMemoryLocalStore();
  const library = createLessonLibrary(store, () => [toSeed(alBar, 0)]);
  const holds = createLessonHolds();
  const updateSettings = createUpdateSettings(store);
  const telemetry: Telemetry = { captureError: jest.fn() };
  const network = { connection };
  const contentSync = createContentSync({
    api: server.api,
    library,
    holds,
    getConnection: () => Promise.resolve(network.connection),
    getPolicy: () => updateSettings.getPolicy(),
    telemetry,
    now: () => Date.UTC(2026, 10, 23, 13, 5),
  });
  const ready = policy === undefined ? Promise.resolve() : updateSettings.setPolicy(policy);
  const tokens = openTokenStore();
  const services: DataServices = {
    library,
    holds,
    updateSettings,
    contentSync,
    account,
    tokens,
  };
  return {
    services,
    server,
    store,
    library,
    holds,
    contentSync,
    telemetry,
    network,
    ready,
    tokens,
  };
}

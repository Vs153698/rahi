import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { downsampleByDistance } from '@rahi/shared';

import { tracksRepository, type BreadcrumbInput } from '../db/repositories/tracks.repository';

/**
 * Offline track recording (Task 2.4, rahi-docs/07, /08). Uses expo-location
 * background updates with an Android foreground service (persistent
 * notification) so recording survives backgrounding and the screen locking.
 * Breadcrumbs are buffered and batch-written to SQLite through the durable
 * PowerSync queue; they sync (and are downsampled server-side) when online.
 *
 * The recorder writes locally and never needs the network — a full day in a dead
 * zone records fine and flushes on reconnect.
 */
const TASK_NAME = 'rahi-track-recording';
const MIN_POINT_DISTANCE_M = 20; // jitter filter before persisting
const FLUSH_EVERY = 10; // batch size

let activeTripId: string | null = null;
let buffer: BreadcrumbInput[] = [];

function toBreadcrumb(loc: Location.LocationObject): BreadcrumbInput {
  return {
    lng: loc.coords.longitude,
    lat: loc.coords.latitude,
    altitudeM: loc.coords.altitude,
    speedKmh: loc.coords.speed != null ? Math.max(0, loc.coords.speed * 3.6) : null,
    recordedAt: new Date(loc.timestamp).toISOString(),
  };
}

async function flush(): Promise<void> {
  if (!activeTripId || buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  await tracksRepository.appendBatch(activeTripId, batch);
}

// Background task: receives location batches, filters jitter, persists.
TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error || !activeTripId) return;
  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  if (!locations?.length) return;

  const crumbs = locations.map(toBreadcrumb);
  // Drop sub-threshold jitter against the buffer tail.
  const filtered = downsampleByDistance(crumbs, MIN_POINT_DISTANCE_M);
  buffer.push(...filtered);
  if (buffer.length >= FLUSH_EVERY) await flush();
});

export async function startRecording(tripId: string): Promise<void> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) throw new Error('Location permission denied');
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) throw new Error('Background location permission denied');

  activeTripId = tripId;
  buffer = [];
  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: MIN_POINT_DISTANCE_M,
    deferredUpdatesInterval: 5000,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Rahi is recording your ride',
      notificationBody: 'Tracking your route offline. Tap to open.',
      notificationColor: '#E2540B',
    },
  });
}

export async function stopRecording(): Promise<void> {
  const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(TASK_NAME);
  await flush();
  activeTripId = null;
}

export function isRecording(): boolean {
  return activeTripId !== null;
}

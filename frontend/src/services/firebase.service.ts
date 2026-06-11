import { ref, set } from 'firebase/database'
import { db } from './firebase'
import type { Track } from '../types/vinyl'

type FirmwareTrackPayload = {
  start_radius_mm: number
  servo_angle_deg: number
}

type FirmwarePayload = {
  status: {
    confirmed: true
    trackCount: number
  }
  tracks: Record<string, FirmwareTrackPayload>
}

function createFirmwareTracks(tracks: Track[]) {
  return tracks.reduce<Record<string, FirmwareTrackPayload>>((payload, track, index) => {
    payload[`track${index + 1}`] = {
      start_radius_mm: track.start_radius_mm,
      servo_angle_deg: track.servo_angle_deg,
    }

    return payload
  }, {})
}

export function createFirmwarePayload(tracks: Track[]): FirmwarePayload {
  return {
    status: {
      confirmed: true,
      trackCount: tracks.length,
    },
    tracks: createFirmwareTracks(tracks),
  }
}

export async function confirmAnalysisResult(tracks: Track[]) {
  const payload = createFirmwarePayload(tracks)

  // set() is intentional: it replaces the full live firmware node in one write.
  // This removes stale track keys when a new scan has fewer tracks than the last one.
  await set(ref(db, 'vinyl'), payload)
}

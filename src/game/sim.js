// Shared mutable simulation state. TrackManager's useFrame (priority 0) is the
// ONLY writer of distance/speed; everything else reads. No React re-renders.
export const SIM = {
  distance: 0,
  speed: 0,
  multTimer: 0,
  hudTimer: 0,
  lastScored: 0,
  shake: 0,
  reducedMotion:
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
}

export function resetSim() {
  SIM.distance = 0
  SIM.speed = 0
  SIM.multTimer = 0
  SIM.hudTimer = 0
  SIM.lastScored = 0
  SIM.shake = 0
}

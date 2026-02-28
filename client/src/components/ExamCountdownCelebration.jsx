import React, { useEffect, useMemo, useRef } from 'react';

const FIREWORK_COLORS = ['#ffffff', '#f8fafc', '#e2e8f0', '#fef3c7', '#fde68a', '#fdba74', '#fca5a5', '#fb7185'];
const FIREWORK_RAY_COLORS = ['#ffffff', '#f8fafc', '#fefce8', '#e2e8f0'];

const FIREWORK_LAUNCH_START = { x: 50, y: 104 };

const FIREWORK_BURSTS = [
  { id: 'a', x: 10, y: 21, startX: 7, delay: 0.04, count: 26, distance: 182, rayCount: 20, rayDistance: 340, cycle: 3.7 },
  { id: 'b', x: 29, y: 17, startX: 22, delay: 0.34, count: 28, distance: 196, rayCount: 22, rayDistance: 372, cycle: 3.9 },
  { id: 'c', x: 50, y: 16, startX: 46, delay: 0.62, count: 34, distance: 236, rayCount: 28, rayDistance: 430, cycle: 4.1 },
  { id: 'd', x: 71, y: 18, startX: 63, delay: 0.92, count: 28, distance: 198, rayCount: 22, rayDistance: 374, cycle: 3.95 },
  { id: 'e', x: 90, y: 22, startX: 94, delay: 1.16, count: 26, distance: 182, rayCount: 20, rayDistance: 342, cycle: 3.75 },

  { id: 'f', x: 18, y: 39, startX: 12, delay: 1.42, count: 22, distance: 164, rayCount: 16, rayDistance: 265, cycle: 3.35, rayColor: '#fff7ed' },
  { id: 'g', x: 37, y: 34, startX: 28, delay: 1.58, count: 24, distance: 172, rayCount: 18, rayDistance: 286, cycle: 3.4 },
  { id: 'h', x: 52, y: 31, startX: 49, delay: 1.76, count: 26, distance: 182, rayCount: 20, rayDistance: 304, cycle: 3.45, rayColor: '#ffffff' },
  { id: 'i', x: 66, y: 37, startX: 58, delay: 1.91, count: 23, distance: 168, rayCount: 17, rayDistance: 278, cycle: 3.35 },
  { id: 'j', x: 84, y: 41, startX: 76, delay: 2.08, count: 21, distance: 158, rayCount: 15, rayDistance: 256, cycle: 3.25, rayColor: '#fff7ed' },

  { id: 'k', x: 26, y: 59, startX: 18, delay: 0.18, count: 18, distance: 144, rayCount: 10, rayDistance: 192, cycle: 3.15, rayColor: '#fee2e2' },
  { id: 'l', x: 43, y: 63, startX: 35, delay: 0.52, count: 19, distance: 150, rayCount: 11, rayDistance: 202, cycle: 3.2, rayColor: '#fecaca' },
  { id: 'm', x: 58, y: 61, startX: 52, delay: 0.82, count: 19, distance: 152, rayCount: 11, rayDistance: 208, cycle: 3.2, rayColor: '#fef3c7' },
  { id: 'n', x: 76, y: 57, startX: 67, delay: 1.08, count: 18, distance: 144, rayCount: 10, rayDistance: 194, cycle: 3.1, rayColor: '#fee2e2' },
];

const ExamCountdownCelebration = ({
  open,
  onClose,
  programName = 'NCLEX Program',
  durationMs = 15000,
}) => {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const fireworkLaunches = useMemo(
    () =>
      FIREWORK_BURSTS.map((burst) => {
        const startX = burst.startX ?? FIREWORK_LAUNCH_START.x;
        const startY = burst.startY ?? FIREWORK_LAUNCH_START.y;
        const dx = burst.x - startX;
        const dy = burst.y - startY;
        const flightAngle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
        const trailLength = Math.max(180, Math.round(Math.hypot(dx * 12.5, dy * 9.2)));

        return {
          id: burst.id,
          startX,
          startY,
          targetX: burst.x,
          targetY: burst.y,
          delay: burst.delay,
          cycle: burst.cycle,
          flightAngle,
          trailLength,
          trailWidth: burst.rayDistance >= 400 ? 4 : 3,
          rocketSize: burst.rayDistance >= 400 ? 14 : 12,
        };
      }),
    []
  );

  const fireworkRays = useMemo(
    () =>
      FIREWORK_BURSTS.flatMap((burst, burstIndex) => {
        const rayCount = burst.rayCount ?? Math.max(12, Math.round((burst.count || 18) * 0.7));
        const rayDistance = burst.rayDistance ?? Math.round((burst.distance || 160) * 1.8);

        return Array.from({ length: rayCount }, (_, i) => ({
          id: `ray-${burst.id}-${i}`,
          originX: `${burst.x}%`,
          originY: `${burst.y}%`,
          angle: Math.round((360 / rayCount) * i + (burstIndex % 2 ? 5 : 0) + (i % 3)),
          distance: rayDistance + (i % 4) * 14,
          delay: burst.delay + (i % 4) * 0.01,
          cycle: burst.cycle,
          size: i % 6 === 0 ? 4 : 3,
          rayWidth: i % 7 === 0 ? 3 : 2,
          streakLength: Math.round(rayDistance * (0.65 + (i % 3) * 0.06)),
          color: burst.rayColor || FIREWORK_RAY_COLORS[(burstIndex + i) % FIREWORK_RAY_COLORS.length],
        }));
      }),
    []
  );

  const fireworks = useMemo(
    () =>
      FIREWORK_BURSTS.flatMap((burst, burstIndex) =>
        Array.from({ length: burst.count }, (_, i) => ({
          id: `${burst.id}-${i}`,
          originX: `${burst.x}%`,
          originY: `${burst.y}%`,
          angle: Math.round((360 / burst.count) * i + (burstIndex % 2 ? 8 : 0)),
          distance: burst.distance + (i % 5) * 12,
          delay: burst.delay + (i % 5) * 0.014,
          cycle: burst.cycle,
          size: i % 6 === 0 ? 7 : i % 3 === 0 ? 5 : 4,
          streakLength: Math.round(Math.min(44, burst.distance * (0.12 + (i % 3) * 0.02))),
          color: FIREWORK_COLORS[(burstIndex + i) % FIREWORK_COLORS.length],
        }))
      ),
    []
  );

  const floatingHearts = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: -190 + i * 56,
        delay: (i % 4) * 0.28,
        scale: 0.75 + (i % 3) * 0.16,
      })),
    []
  );

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      onCloseRef.current?.();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [open, durationMs]);

  if (!open) return null;

  return (
    <div className="exam-celebration-overlay" role="dialog" aria-modal="true" aria-label="Exam countdown celebration">
      <div className="exam-celebration-backdrop" />

      <div className="exam-celebration-card">
        <div className="exam-celebration-stage" aria-hidden="true">
          <div className="exam-celebration-fireworks exam-celebration-fireworks--continuous">
            {fireworkLaunches.map((launch) => (
              <span
                key={`launch-${launch.id}`}
                className="exam-firework-launch"
                style={{
                  '--fw-start-x': `${launch.startX}%`,
                  '--fw-start-y': `${launch.startY}%`,
                  '--fw-target-x': `${launch.targetX}%`,
                  '--fw-target-y': `${launch.targetY}%`,
                  '--fw-delay': `${launch.delay}s`,
                  '--fw-duration': `${launch.cycle}s`,
                  '--fw-flight-angle': `${launch.flightAngle}deg`,
                  '--fw-trail-length': `${launch.trailLength}px`,
                  '--fw-trail-width': `${launch.trailWidth}px`,
                  '--fw-rocket-size': `${launch.rocketSize}px`,
                }}
              />
            ))}

            {FIREWORK_BURSTS.map((burst, i) => (
              <span
                key={`core-${burst.id}`}
                className="exam-firework-core"
                style={{
                  '--fw-origin-x': `${burst.x}%`,
                  '--fw-origin-y': `${burst.y}%`,
                  '--fw-delay': `${burst.delay}s`,
                  '--fw-duration': `${burst.cycle}s`,
                  '--fw-color': FIREWORK_COLORS[i % FIREWORK_COLORS.length],
                }}
              />
            ))}

            {fireworkRays.map((ray) => (
              <span
                key={ray.id}
                className="exam-firework-spark exam-firework-spark--ray"
                style={{
                  '--fw-origin-x': ray.originX,
                  '--fw-origin-y': ray.originY,
                  '--fw-angle': `${ray.angle}deg`,
                  '--fw-distance': `${ray.distance}px`,
                  '--fw-delay': `${ray.delay}s`,
                  '--fw-duration': `${ray.cycle}s`,
                  '--fw-color': ray.color,
                  '--fw-size': `${ray.size}px`,
                  '--fw-ray-width': `${ray.rayWidth}px`,
                  '--fw-streak-length': `${ray.streakLength}px`,
                }}
              />
            ))}

            {fireworks.map((spark) => (
              <span
                key={spark.id}
                className="exam-firework-spark"
                style={{
                  '--fw-origin-x': spark.originX,
                  '--fw-origin-y': spark.originY,
                  '--fw-angle': `${spark.angle}deg`,
                  '--fw-distance': `${spark.distance}px`,
                  '--fw-delay': `${spark.delay}s`,
                  '--fw-duration': `${spark.cycle}s`,
                  '--fw-color': spark.color,
                  '--fw-size': `${spark.size}px`,
                  '--fw-streak-length': `${spark.streakLength}px`,
                }}
              />
            ))}
          </div>

          <div className="exam-celebration-heart-core">
            <div className="exam-celebration-heart-shape" />
            <div className="exam-celebration-heart-glow" />
          </div>

          <div className="exam-celebration-floating-hearts">
            {floatingHearts.map((heart) => (
              <span
                key={heart.id}
                className="exam-mini-heart"
                style={{
                  '--fh-x': `${heart.x}px`,
                  '--fh-delay': `${heart.delay}s`,
                  '--fh-scale': heart.scale,
                }}
              />
            ))}
          </div>
        </div>

        <div className="exam-celebration-content">
          <h2>Congratulations!</h2>
          <p>
            For the successful completion of the {programName} review with Nclex Keys, thank you for believing in us.
          </p>
          <p>
            It has already ended in praise. Congratulations!
          </p>
          <div className="exam-celebration-timer-note">Celebration in progress...</div>
        </div>
      </div>
    </div>
  );
};

export default ExamCountdownCelebration;

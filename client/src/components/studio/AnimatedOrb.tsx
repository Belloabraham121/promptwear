"use client";

import type React from "react";

/**
 * Brand orb — animated cluster of blurred ink/bone/lime circles.
 * Used as the studio's empty-state mark.
 */
export function AnimatedOrb({
  className,
  size = 56,
}: {
  className?: string;
  size?: number;
}) {
  const blurAmount = Math.max(6, size * 0.15);

  return (
    <>
      <style>{`@keyframes driplap-orb-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(8%, -6%) scale(1.12); }
  66% { transform: translate(-7%, 7%) scale(0.94); }
}
@keyframes driplap-orb-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}`}</style>
      <div
        className={`relative overflow-hidden rounded-full ${className ?? ""}`}
        style={{
          width: size,
          height: size,
          backgroundColor: "#f3f0e8",
          boxShadow:
            "0 0 0 1px rgba(11,31,28,0.12), 0 12px 32px rgba(11,31,28,0.18)",
          animation: "driplap-orb-breathe 5s ease-in-out infinite",
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ filter: `blur(${blurAmount}px)` }}
        >
          {[
            { size: 0.5, color: "#d6ff3c", opacity: 0.95, delay: "0s" },
            { size: 0.38, color: "#9db8b0", opacity: 0.9, delay: "-1.4s" },
            { size: 0.3, color: "#5a8a7f", opacity: 0.9, delay: "-2.8s" },
            { size: 0.26, color: "#3f4d0e", opacity: 0.85, delay: "-4.2s" },
            { size: 0.2, color: "#e2ff6a", opacity: 0.9, delay: "-5.6s" },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size * c.size,
                height: size * c.size,
                opacity: c.opacity,
                backgroundColor: c.color,
                animation: `driplap-orb-drift 7s ease-in-out infinite`,
                animationDelay: c.delay,
              }}
            />
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255, 255, 255, 0.22) 0%, transparent 100%)",
          }}
        />
      </div>
    </>
  );
}

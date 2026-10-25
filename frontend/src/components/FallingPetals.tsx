import type { CSSProperties } from "react";

// left (vw), size (px), fall duration (s), start delay (s), horizontal sway (px)
const petals: Array<[number, number, number, number, number]> = [
  [4, 14, 13, -2, 60],
  [12, 10, 16, -9, -40],
  [21, 16, 12, -5, 70],
  [30, 11, 18, -13, -55],
  [39, 13, 14, -1, 50],
  [48, 9, 17, -7, -35],
  [57, 15, 13, -11, 65],
  [66, 12, 15, -4, -60],
  [74, 17, 12, -8, 45],
  [82, 10, 19, -15, -50],
  [90, 14, 14, -6, 55],
  [96, 11, 16, -12, -45]
];

export const FallingPetals = () => (
  <div className="falling-petals" aria-hidden="true">
    {petals.map(([left, size, duration, delay, sway], index) => (
      <span
        key={index}
        style={{
          "--petal-left": `${left}vw`,
          "--petal-size": `${size}px`,
          "--petal-duration": `${duration}s`,
          "--petal-delay": `${delay}s`,
          "--petal-sway": `${sway}px`
        } as CSSProperties}
      />
    ))}
  </div>
);

import React from "react";
type Props = {
  misses: number;
  /** round2 ルールでは (2 - misses) 個の hidden × + 実際の × で右寄せ */
  round2Mode?: boolean;
};

export function PlayerMisses({ misses, round2Mode = false }: Props): React.JSX.Element {
  if (round2Mode) {
    const hidden = Math.max(0, 2 - misses);
    return (
      <div className="round2-player__misses">
        {Array.from({ length: hidden }).map((_, i) => (
          <div key={`h-${i}`} style={{ visibility: "hidden" }}>
            ×
          </div>
        ))}
        {Array.from({ length: misses }).map((_, i) => (
          <div key={`m-${i}`}>×</div>
        ))}
      </div>
    );
  }

  return (
    <div className="player__misses">
      {Array.from({ length: misses }).map((_, i) => (
        <span key={i}>×</span>
      ))}
    </div>
  );
}

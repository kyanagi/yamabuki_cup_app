import React, { useEffect, useRef, useState } from "react";

type Props = {
  stars: number;
};

export function Stars({ stars }: Props): React.JSX.Element {
  const prevStarsRef = useRef(stars);
  const [isPopping, setIsPopping] = useState(false);

  useEffect(() => {
    if (stars > prevStarsRef.current) {
      setIsPopping(true);
      const timer = setTimeout(() => {
        setIsPopping(false);
      }, 600);
      prevStarsRef.current = stars;
      return () => clearTimeout(timer);
    }
    prevStarsRef.current = stars;
    return undefined;
  }, [stars]);

  return (
    <div className="final-player__stars">
      {Array.from({ length: stars }, (_, i) => (
        <span key={i} className={`final-player__star${i === 0 && isPopping ? " final-player__star--pop" : ""}`}>
          ★
        </span>
      ))}
    </div>
  );
}

import React, { useState, useEffect } from 'react';

export function Clock({ className }: { className?: string }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className={className}>
      {time.toLocaleTimeString('en-US', { timeZone: 'Asia/Taipei', hour12: false })}
    </span>
  );
}

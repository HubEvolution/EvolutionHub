import { useEffect, useState } from 'react';

export default function WebEvalIsland() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return null;
}

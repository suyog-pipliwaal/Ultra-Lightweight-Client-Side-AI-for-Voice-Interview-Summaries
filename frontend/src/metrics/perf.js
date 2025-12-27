export function measure(fn) {
  const start = performance.now();
  const result = fn();
  return {
    result,
    time: (performance.now() - start).toFixed(2)
  };
}

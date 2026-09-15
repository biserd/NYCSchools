// D1 supports at most 100 bound parameters per statement. Count the entire
// table width, not just provided values: defaults may also become parameters.
export function* d1Chunks<T>(rows: readonly T[], columns: number, reserved = 0): Generator<T[]> {
  const size = Math.floor((100 - reserved) / columns);
  if (size < 1) throw new Error('Row exceeds the D1 parameter budget');
  for (let i=0;i<rows.length;i+=size) yield rows.slice(i,i+size);
}

export function classificationRate(count: number, total: number): number {
  return total > 0 ? count / total * 100 : 0;
}

export function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

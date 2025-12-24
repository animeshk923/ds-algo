export function linearSearchBool<T>(arr: T[], target: T): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return true;
    }
  }
  return false;
}

export function linearSearchIndex<T>(arr: T[], target: T): number {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return i;
    }
  }
  return -1;
}

export function linearSearchValAndIndex<T>(
  arr: T[],
  target: T
): { index: number; value: T } | undefined {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return { index: i, value: arr[i] };
    }
  }
  return undefined;
}

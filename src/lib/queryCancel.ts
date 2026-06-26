export function isQueryCancelledMessage(message: string): boolean {
  return /query cancelled|daemon stopped|session invalidated/i.test(message);
}

// server.ts and Next's server code load separate copies of our modules, so the
// gateway publishes who's listening on a global the admin pages can read.
const KEY = Symbol.for("ponoc.listening");

type ListeningUserIds = () => string[];

export function publishListening(read: ListeningUserIds): void {
  (globalThis as Record<symbol, unknown>)[KEY] = read;
}

// Ids of users with a live session right now; empty when the gateway isn't running.
export function listeningUserIds(): string[] {
  const read = (globalThis as Record<symbol, unknown>)[KEY] as ListeningUserIds | undefined;
  return read ? read() : [];
}

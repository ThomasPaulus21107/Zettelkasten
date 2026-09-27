export const MARKERS = Object.freeze([
  { value: '@add', label: 'Ergänzen', description: 'Diesen bestehenden Zettel an dieser Stelle weiter ausführen.' },
  { value: '@new', label: 'Neuer Zettel', description: 'Aus dieser Stelle soll ein eigener Zettel entstehen.' },
  { value: '@fix', label: 'Defekt', description: 'Hier liegt ein technisch behebbarer Defekt vor.' },
  { value: '@ask', label: 'Entscheiden', description: 'Diese Stelle braucht eine inhaltliche Entscheidung.' }
]);

export function insertMarkerAtTarget(source, target, marker) {
  if (!MARKERS.some((candidate) => candidate.value === marker)) throw new Error('Unbekannter Marker.');
  if (!target || !Number.isInteger(target.end) || target.end < 0 || target.end > source.length) throw new Error('Ungültige Textstelle.');
  const before = source.slice(0, target.end);
  const after = source.slice(target.end);
  const leadingSpace = before && !/\s$/u.test(before) ? ' ' : '';
  const trailingSpace = /^[\p{L}\p{N}_@]/u.test(after) ? ' ' : '';
  return `${before}${leadingSpace}${marker}${trailingSpace}${after}`;
}

export function markerAlreadyFollows(source, target, marker) {
  if (!target || !Number.isInteger(target.end)) return false;
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s+${escaped}(?![\\p{L}\\p{N}_-])`, 'u').test(source.slice(target.end));
}

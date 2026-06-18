/** Capitalize the first letter of each word in an artist name. */
export function formatArtistName(name: string): string {
  if (!name) return name;
  return name
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');
}

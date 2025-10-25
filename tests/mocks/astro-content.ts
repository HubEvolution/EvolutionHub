// Minimal but configurable mock for 'astro:content' used in unit tests
export type CollectionEntry = any;

const __store: Record<string, any[]> = {};

export function __setCollectionData(collectionName: string, entries: any[]) {
  __store[collectionName] = Array.isArray(entries) ? [...entries] : [];
}

export async function getCollection(
  collectionName: string,
  filter?: (entry: any) => boolean
): Promise<any[]> {
  const data: any[] = __store[collectionName] || [];
  return typeof filter === 'function' ? data.filter(filter) : [...data];
}

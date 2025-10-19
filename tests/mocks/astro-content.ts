// Minimal mock for 'astro:content' used in unit tests
export type CollectionEntry = any;
export async function getCollection(
  _collectionName: string,
  filter?: (entry: any) => boolean
): Promise<any[]> {
  const data: any[] = [];
  return typeof filter === 'function' ? data.filter(filter) : data;
}

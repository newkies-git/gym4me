export function chunkByTen<T>(items: T[]): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += 10) {
    chunks.push(items.slice(i, i + 10))
  }
  return chunks
}

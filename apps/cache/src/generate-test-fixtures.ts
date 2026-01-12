export const FIXTURE_SIZE = 5;

/** Creates a test fixture from the first N items. */
export function createFixture<T>(items: T[], count: number = FIXTURE_SIZE): T[] {
  return items.slice(0, count);
}

/** Writes fixture data to JSON file. */
export async function writeFixture(data: unknown[], outputPath: string): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await Bun.write(outputPath, content);
}

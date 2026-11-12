export async function loadEncounterModule(): Promise<unknown> {
  const mod = await import('../../clinical/domain/encounter');
  return mod.Encounter;
}

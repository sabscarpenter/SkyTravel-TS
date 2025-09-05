export type Role = 'ADMIN' | 'COMPAGNIA' | 'PASSEGGERO';

export function deriveRoleFromId(id: number): Role {
  if (id === 0) return 'ADMIN';
  if (id >= 1 && id <= 99) return 'COMPAGNIA';
  return 'PASSEGGERO';
}

import { describe, expect, it } from 'vitest';
import { canRemoveAdministrator, teamPermissions } from '@/lib/team-access';
import { accountSchema } from '@/lib/team.functions';

describe('Team permissions', () => {
  it('administrator keeps full access', () => expect(teamPermissions('admin')).toEqual({ quotes: true, manage: true }));
  it('attendant can only consult quotes', () => expect(teamPermissions('attendant')).toEqual({ quotes: true, manage: false }));
  it('blocked administrator loses access', () => expect(teamPermissions('admin', true)).toEqual({ quotes: false, manage: false }));
  it('blocked attendant loses access', () => expect(teamPermissions('attendant', true)).toEqual({ quotes: false, manage: false }));
  it('unassigned user has no access', () => expect(teamPermissions('user')).toEqual({ quotes: false, manage: false }));
  it('last active admin cannot be removed', () => expect(canRemoveAdministrator('admin', true, 1)).toBe(false));
  it('admin can be removed when another active admin exists', () => expect(canRemoveAdministrator('admin', true, 2)).toBe(true));
  it('attendants can be removed', () => expect(canRemoveAdministrator('attendant', true, 1)).toBe(true));
  it('only the two explicit roles can be assigned', () => expect(accountSchema.safeParse({ name: 'Equipe teste', email: 'test@example.com', role: 'user', blocked: false }).success).toBe(false));
});
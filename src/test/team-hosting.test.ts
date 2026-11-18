import { describe, expect, it } from 'vitest';
import { HOSTED_USERS_URL, supportsTeamManagement } from '@/lib/team-hosting';

describe('Team management hosting', () => {
  it('blocks account RPCs in a static GitHub Pages deployment', () => {
    expect(supportsTeamManagement('true')).toBe(false);
  });
  it('allows account RPCs in the hosted application', () => {
    expect(supportsTeamManagement(undefined)).toBe(true);
    expect(supportsTeamManagement('false')).toBe(true);
  });
  it('opens the existing secure users page without transferring credentials', () => {
    const target = new URL(HOSTED_USERS_URL);
    expect(target.origin).toBe('https://atacadao-da-construcao-russas-ce.lovable.app');
    expect(target.pathname).toBe('/usuarios');
    expect(target.search).toBe('');
    expect(target.hash).toBe('');
  });
});
export const HOSTED_USERS_URL = 'https://atacadao-da-construcao-russas-ce.lovable.app/usuarios';

export function supportsTeamManagement(staticHosting: string | undefined): boolean {
  return staticHosting !== 'true';
}

export const teamManagementAvailable = supportsTeamManagement(import.meta.env['VITE_STATIC_HOSTING']);
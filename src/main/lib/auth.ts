// ponytail: single local user, no login. Routes keep their userId scoping so the
// data model is unchanged; everything is stored under this one id.
export const LOCAL_USER_ID = 'local'

export async function getAuthenticatedUser(): Promise<string> {
  return LOCAL_USER_ID
}

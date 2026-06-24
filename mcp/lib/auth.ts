export function getUserId(): string {
  const userId = process.env.MCP_USER_ID
  if (!userId) {
    throw new Error(
      'MCP_USER_ID environment variable is required. ' +
      'Set it to your Supabase user ID.'
    )
  }
  return userId
}

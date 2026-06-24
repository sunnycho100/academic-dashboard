import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getUserId } from '../lib/auth'
import { success, error } from '../lib/response'

export function registerUserInfoTools(server: McpServer) {
  server.tool(
    'get_user_info',
    'Get the current user\'s display name.',
    async () => {
      try {
        const userId = getUserId()
        const user = await prisma.userInfo.findFirst({
          where: { userId },
        })
        return success({ name: user?.name ?? 'User' })
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to fetch user info')
      }
    }
  )

  server.tool(
    'update_user_info',
    'Update the current user\'s display name.',
    {
      name: z.string().min(1).max(100).describe('New display name'),
    },
    async ({ name }) => {
      try {
        const userId = getUserId()
        const user = await prisma.userInfo.upsert({
          where: { userId },
          update: { name },
          create: { userId, name },
        })
        return success(user)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to update user info')
      }
    }
  )
}

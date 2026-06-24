import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getUserId } from '../lib/auth'
import { success, error } from '../lib/response'

export function registerCategoryTools(server: McpServer) {
  server.tool(
    'list_categories',
    'List all course categories with their colors and display order.',
    async () => {
      try {
        const userId = getUserId()
        const categories = await prisma.category.findMany({
          where: { userId },
          orderBy: { order: 'asc' },
        })
        return success(categories)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to list categories')
      }
    }
  )

  server.tool(
    'create_category',
    'Create a new course category. Returns the created category.',
    {
      name: z.string().min(1).max(255).describe('Category name (e.g. "MATH 301")'),
      color: z.string().min(1).max(100).describe('Color value (e.g. "blue", "#3B82F6")'),
      order: z.number().int().min(0).optional().describe('Display order (defaults to 0)'),
    },
    async ({ name, color, order }) => {
      try {
        const userId = getUserId()
        const category = await prisma.category.create({
          data: { name, color, order: order ?? 0, userId },
        })
        return success(category)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to create category')
      }
    }
  )

  server.tool(
    'update_category',
    'Update a category. If renamed, the name cascades to completed tasks and time records for history consistency.',
    {
      id: z.string().describe('Category ID to update'),
      name: z.string().min(1).max(255).optional().describe('New name'),
      color: z.string().min(1).max(100).optional().describe('New color'),
      order: z.number().int().min(0).optional().describe('New display order'),
    },
    async ({ id, name, color, order }) => {
      try {
        const userId = getUserId()

        const existing = await prisma.category.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
          return error('Category not found')
        }

        if (name && existing.name !== name) {
          await Promise.all([
            prisma.completedTask.updateMany({
              where: { categoryName: existing.name, userId },
              data: { categoryName: name },
            }),
            prisma.timeRecord.updateMany({
              where: { categoryName: existing.name, userId },
              data: { categoryName: name },
            }),
          ])
        }

        const data: Record<string, unknown> = {}
        if (name !== undefined) data.name = name
        if (color !== undefined) data.color = color
        if (order !== undefined) data.order = order

        const category = await prisma.category.update({
          where: { id },
          data,
        })
        return success(category)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to update category')
      }
    }
  )

  server.tool(
    'delete_category',
    'Delete a category and all its tasks (cascade). This is destructive and cannot be undone.',
    {
      id: z.string().describe('Category ID to delete'),
    },
    async ({ id }) => {
      try {
        const userId = getUserId()

        const existing = await prisma.category.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
          return error('Category not found')
        }

        await prisma.category.delete({ where: { id } })
        return success({ deleted: true, id, name: existing.name })
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to delete category')
      }
    }
  )
}

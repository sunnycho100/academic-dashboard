import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getUserId } from '../lib/auth'
import { success, error } from '../lib/response'

export function registerTaskTools(server: McpServer) {
  server.tool(
    'list_tasks',
    'List all tasks, optionally filtered by category, status, or type. Returns tasks with their category info, ordered by priority.',
    {
      categoryId: z.string().optional().describe('Filter by category ID'),
      status: z.enum(['todo', 'done']).optional().describe('Filter by task status'),
      type: z.string().optional().describe('Filter by task type (Lecture, Discussion, Lab, Assignment, Exam Prep)'),
    },
    async ({ categoryId, status, type }) => {
      try {
        const userId = getUserId()
        const where: Record<string, unknown> = { userId }
        if (categoryId) where.categoryId = categoryId
        if (status) where.status = status
        if (type) where.type = type

        const tasks = await prisma.task.findMany({
          where,
          include: { category: true },
          orderBy: { priorityOrder: 'asc' },
        })
        return success(tasks)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to list tasks')
      }
    }
  )

  server.tool(
    'create_task',
    'Create a new task. Requires title, type, and categoryId. Returns the created task with category info.',
    {
      title: z.string().min(1).max(255).describe('Task title'),
      type: z.string().min(1).max(100).describe('Task type: Lecture, Discussion, Lab, Assignment, or Exam Prep'),
      categoryId: z.string().describe('Category ID this task belongs to'),
      dueAt: z.string().nullable().optional().describe('Due date as ISO string, or null'),
      status: z.enum(['todo', 'done']).optional().describe('Task status (defaults to "todo")'),
      priorityOrder: z.number().int().min(0).optional().describe('Priority order for sorting'),
      notes: z.string().max(5000).nullable().optional().describe('Task notes'),
      estimatedDuration: z.number().nullable().optional().describe('Estimated time in minutes'),
    },
    async (params) => {
      try {
        const userId = getUserId()
        const task = await prisma.task.create({
          data: {
            userId,
            title: params.title,
            type: params.type,
            categoryId: params.categoryId,
            dueAt: params.dueAt ? new Date(params.dueAt) : null,
            status: params.status ?? 'todo',
            priorityOrder: params.priorityOrder ?? 0,
            notes: params.notes ?? null,
            estimatedDuration: params.estimatedDuration ?? null,
          },
          include: { category: true },
        })
        return success(task)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to create task')
      }
    }
  )

  server.tool(
    'update_task',
    'Update an existing task. Only provided fields will be changed. Returns the updated task.',
    {
      id: z.string().describe('Task ID to update'),
      title: z.string().min(1).max(255).optional().describe('New title'),
      type: z.string().min(1).max(100).optional().describe('New type'),
      categoryId: z.string().optional().describe('New category ID'),
      dueAt: z.string().nullable().optional().describe('New due date as ISO string, or null to clear'),
      status: z.enum(['todo', 'done']).optional().describe('New status'),
      priorityOrder: z.number().int().min(0).optional().describe('New priority order'),
      notes: z.string().max(5000).nullable().optional().describe('New notes'),
      estimatedDuration: z.number().nullable().optional().describe('New estimated duration in minutes'),
      actualTimeSpent: z.number().nullable().optional().describe('Actual time spent in minutes'),
    },
    async ({ id, dueAt, ...rest }) => {
      try {
        const userId = getUserId()

        const existing = await prisma.task.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
          return error('Task not found')
        }

        const data: Record<string, unknown> = { ...rest }
        if (dueAt !== undefined) {
          data.dueAt = dueAt ? new Date(dueAt) : null
        }

        const task = await prisma.task.update({
          where: { id },
          data,
          include: { category: true },
        })
        return success(task)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to update task')
      }
    }
  )

  server.tool(
    'delete_task',
    'Delete a task by ID. Also removes any associated weekly plan entries (cascade).',
    {
      id: z.string().describe('Task ID to delete'),
    },
    async ({ id }) => {
      try {
        const userId = getUserId()

        const existing = await prisma.task.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
          return error('Task not found')
        }

        await prisma.task.delete({ where: { id } })
        return success({ deleted: true, id })
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to delete task')
      }
    }
  )

  server.tool(
    'reorder_tasks',
    'Bulk-update priority order for multiple tasks after reordering. All tasks must belong to the current user.',
    {
      orders: z.array(z.object({
        id: z.string().describe('Task ID'),
        priorityOrder: z.number().int().min(0).describe('New priority order'),
      })).min(1).max(500).describe('Array of {id, priorityOrder} pairs'),
    },
    async ({ orders }) => {
      try {
        const userId = getUserId()

        const taskIds = orders.map(o => o.id)
        const owned = await prisma.task.findMany({
          where: { id: { in: taskIds }, userId },
          select: { id: true },
        })
        if (owned.length !== taskIds.length) {
          return error('One or more tasks not found or not owned by you')
        }

        await prisma.$transaction(
          orders.map(item =>
            prisma.task.update({
              where: { id: item.id },
              data: { priorityOrder: item.priorityOrder },
            })
          )
        )
        return success({ reordered: true, count: orders.length })
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to reorder tasks')
      }
    }
  )
}

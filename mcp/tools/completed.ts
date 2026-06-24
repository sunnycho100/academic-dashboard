import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getUserId } from '../lib/auth'
import { success, error } from '../lib/response'

export function registerCompletedTaskTools(server: McpServer) {
  server.tool(
    'list_completed_tasks',
    'List all completed task records (excludes soft-deleted). Returns completion history ordered by most recent first.',
    async () => {
      try {
        const userId = getUserId()
        const tasks = await prisma.completedTask.findMany({
          where: { userId, deletedAt: null },
          orderBy: { completedAt: 'desc' },
        })
        return success(tasks)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to list completed tasks')
      }
    }
  )

  server.tool(
    'complete_task',
    'Record a task as completed. This is a denormalized snapshot — stores task/category names directly so history survives deletion.',
    {
      taskTitle: z.string().min(1).max(255).describe('Title of the completed task'),
      categoryName: z.string().min(1).max(255).describe('Category name at time of completion'),
      categoryColor: z.string().min(1).max(100).describe('Category color at time of completion'),
      taskType: z.string().min(1).max(100).describe('Task type (Lecture, Discussion, Lab, Assignment, Exam Prep)'),
      estimatedDuration: z.number().nullable().optional().describe('Estimated duration in minutes'),
      actualTimeSpent: z.number().nullable().optional().describe('Actual time spent in minutes'),
      dueAt: z.string().nullable().optional().describe('Original due date as ISO string'),
      notes: z.string().max(5000).nullable().optional().describe('Completion notes'),
    },
    async (params) => {
      try {
        const userId = getUserId()

        const timeDifference =
          params.estimatedDuration != null && params.actualTimeSpent != null
            ? params.estimatedDuration - params.actualTimeSpent
            : null

        const task = await prisma.completedTask.create({
          data: {
            userId,
            taskTitle: params.taskTitle,
            categoryName: params.categoryName,
            categoryColor: params.categoryColor,
            taskType: params.taskType,
            dueAt: params.dueAt ? new Date(params.dueAt) : null,
            actualTimeSpent: params.actualTimeSpent ?? null,
            estimatedDuration: params.estimatedDuration ?? null,
            timeDifference,
            notes: params.notes ?? null,
          },
        })
        return success(task)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to record completed task')
      }
    }
  )

  server.tool(
    'update_completed_task',
    'Update a completed task record. Can soft-delete (set deleted=true) or update fields. Recalculates timeDifference when time values change.',
    {
      id: z.string().describe('Completed task record ID'),
      deleted: z.boolean().optional().describe('Set true to soft-delete, false to restore'),
      taskTitle: z.string().min(1).max(255).optional().describe('Updated task title'),
      categoryName: z.string().min(1).max(255).optional().describe('Updated category name'),
      categoryColor: z.string().min(1).max(100).optional().describe('Updated category color'),
      taskType: z.string().min(1).max(100).optional().describe('Updated task type'),
      actualTimeSpent: z.number().nullable().optional().describe('Updated actual time in minutes'),
      estimatedDuration: z.number().nullable().optional().describe('Updated estimated time in minutes'),
      notes: z.string().max(5000).nullable().optional().describe('Updated notes'),
    },
    async ({ id, deleted, ...fields }) => {
      try {
        const userId = getUserId()

        const existing = await prisma.completedTask.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
          return error('Completed task not found')
        }

        if (deleted !== undefined) {
          const task = await prisma.completedTask.update({
            where: { id },
            data: { deletedAt: deleted ? new Date() : null },
          })
          return success(task)
        }

        const data: Record<string, unknown> = {}
        if (fields.taskTitle !== undefined) data.taskTitle = fields.taskTitle
        if (fields.categoryName !== undefined) data.categoryName = fields.categoryName
        if (fields.categoryColor !== undefined) data.categoryColor = fields.categoryColor
        if (fields.taskType !== undefined) data.taskType = fields.taskType
        if (fields.actualTimeSpent !== undefined) data.actualTimeSpent = fields.actualTimeSpent
        if (fields.estimatedDuration !== undefined) data.estimatedDuration = fields.estimatedDuration
        if (fields.notes !== undefined) data.notes = fields.notes

        if (fields.actualTimeSpent !== undefined || fields.estimatedDuration !== undefined) {
          const est = fields.estimatedDuration ?? existing.estimatedDuration
          const act = fields.actualTimeSpent ?? existing.actualTimeSpent
          data.timeDifference = est != null && act != null ? est - act : null
        }

        const task = await prisma.completedTask.update({
          where: { id },
          data,
        })
        return success(task)
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to update completed task')
      }
    }
  )
}

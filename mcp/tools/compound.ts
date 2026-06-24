import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getUserId } from '../lib/auth'
import { success, error } from '../lib/response'

export function registerCompoundTools(server: McpServer) {
  server.tool(
    'get_dashboard_summary',
    'Get a comprehensive dashboard summary in one call: user info, categories, all tasks (with overdue/due-soon highlights), today\'s time records with total, and this week\'s plan. Gives full context for answering "what should I work on?"',
    {
      weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Week start date for weekly plan (YYYY-MM-DD). Defaults to most recent Monday.'),
    },
    async ({ weekStart }) => {
      try {
        const userId = getUserId()
        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]

        const effectiveWeekStart = weekStart ?? (() => {
          const d = new Date(now)
          d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
          return d.toISOString().split('T')[0]
        })()

        const weekStartDate = new Date(effectiveWeekStart + 'T00:00:00.000Z')
        const weekEndDate = new Date(weekStartDate)
        weekEndDate.setDate(weekEndDate.getDate() + 7)

        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

        const [userInfo, categories, tasks, todayRecords, weeklyPlan, todayTimetable] = await Promise.all([
          prisma.userInfo.findFirst({ where: { userId } }),
          prisma.category.findMany({ where: { userId }, orderBy: { order: 'asc' } }),
          prisma.task.findMany({
            where: { userId },
            include: { category: true },
            orderBy: { priorityOrder: 'asc' },
          }),
          prisma.timeRecord.findMany({
            where: { userId, startTime: { gte: startOfDay, lte: endOfDay } },
            orderBy: { startTime: 'asc' },
          }),
          prisma.weeklyPlanEntry.findMany({
            where: { userId, date: { gte: weekStartDate, lt: weekEndDate } },
            include: { task: { include: { category: true } } },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.timetableEntry.findMany({
            where: { userId, date: todayStr },
            orderBy: { order: 'asc' },
          }),
        ])

        const todoTasks = tasks.filter(t => t.status === 'todo')
        const threeDaysFromNow = new Date(now)
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

        const overdueTasks = todoTasks.filter(t => t.dueAt && new Date(t.dueAt) < now)
        const dueSoonTasks = todoTasks.filter(t =>
          t.dueAt && new Date(t.dueAt) >= now && new Date(t.dueAt) <= threeDaysFromNow
        )

        const todayTotalSeconds = todayRecords.reduce((sum, r) => sum + Math.max(0, r.duration), 0)

        const todayPlannedTasks = weeklyPlan.filter(e =>
          e.date.toISOString().split('T')[0] === todayStr
        )

        return success({
          user: { name: userInfo?.name ?? 'User' },
          categories,
          tasks: {
            total: tasks.length,
            todo: todoTasks.length,
            done: tasks.length - todoTasks.length,
            overdue: overdueTasks,
            dueSoon: dueSoonTasks,
          },
          today: {
            date: todayStr,
            timeRecords: todayRecords,
            totalStudyMinutes: Math.round(todayTotalSeconds / 60),
            plannedTasks: todayPlannedTasks,
            timetable: todayTimetable,
          },
          weeklyPlan,
        })
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to fetch dashboard summary')
      }
    }
  )

  server.tool(
    'complete_and_log',
    'All-in-one action: marks a task as done, creates a completed task snapshot, and optionally logs a time record. Handles all three operations atomically.',
    {
      taskId: z.string().describe('ID of the task to complete'),
      actualTimeSpent: z.number().nullable().optional().describe('Actual time spent in minutes'),
      startTime: z.string().optional().describe('Work session start time as ISO string (required to create time record)'),
      endTime: z.string().optional().describe('Work session end time as ISO string (required to create time record)'),
      notes: z.string().max(5000).nullable().optional().describe('Completion notes'),
    },
    async ({ taskId, actualTimeSpent, startTime, endTime, notes }) => {
      try {
        const userId = getUserId()

        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { category: true },
        })
        if (!task || task.userId !== userId) {
          return error('Task not found')
        }

        const timeDifference =
          task.estimatedDuration != null && actualTimeSpent != null
            ? task.estimatedDuration - actualTimeSpent
            : null

        const completedTask = await prisma.completedTask.create({
          data: {
            userId,
            taskTitle: task.title,
            categoryName: task.category.name,
            categoryColor: task.category.color,
            taskType: task.type,
            dueAt: task.dueAt,
            actualTimeSpent: actualTimeSpent ?? task.actualTimeSpent ?? null,
            estimatedDuration: task.estimatedDuration,
            timeDifference,
            notes: notes ?? task.notes ?? null,
          },
        })

        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'done',
            actualTimeSpent: actualTimeSpent ?? task.actualTimeSpent,
          },
        })

        let timeRecord = null
        if (startTime && endTime) {
          const st = new Date(startTime)
          const et = new Date(endTime)
          if (!isNaN(st.getTime()) && !isNaN(et.getTime())) {
            let duration = Math.round((et.getTime() - st.getTime()) / 1000)
            if (duration < 0) duration += 86400

            timeRecord = await prisma.timeRecord.create({
              data: {
                userId,
                taskId: task.id,
                taskTitle: task.title,
                categoryName: task.category.name,
                categoryColor: task.category.color,
                taskType: task.type,
                startTime: st,
                endTime: et,
                duration,
              },
            })
          }
        }

        return success({
          completedTask,
          taskMarkedDone: true,
          timeRecord,
        })
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to complete and log task')
      }
    }
  )

  server.tool(
    'get_productivity_stats',
    'Get productivity statistics for a date range: total study time, time by category, tasks completed, estimated vs actual accuracy, and daily breakdown.',
    {
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD, inclusive)'),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD, inclusive)'),
    },
    async ({ startDate, endDate }) => {
      try {
        const userId = getUserId()

        const start = new Date(startDate + 'T00:00:00.000Z')
        const end = new Date(endDate + 'T23:59:59.999Z')

        const [timeRecords, completedTasks] = await Promise.all([
          prisma.timeRecord.findMany({
            where: { userId, startTime: { gte: start, lte: end } },
            orderBy: { startTime: 'asc' },
          }),
          prisma.completedTask.findMany({
            where: {
              userId,
              deletedAt: null,
              completedAt: { gte: start, lte: end },
            },
          }),
        ])

        const totalSeconds = timeRecords.reduce((sum, r) => sum + Math.max(0, r.duration), 0)

        const timeByCategory: Record<string, { minutes: number; sessions: number; color: string }> = {}
        for (const r of timeRecords) {
          if (!timeByCategory[r.categoryName]) {
            timeByCategory[r.categoryName] = { minutes: 0, sessions: 0, color: r.categoryColor }
          }
          timeByCategory[r.categoryName].minutes += Math.max(0, r.duration) / 60
          timeByCategory[r.categoryName].sessions += 1
        }
        for (const cat of Object.values(timeByCategory)) {
          cat.minutes = Math.round(cat.minutes)
        }

        const completionsByCategory: Record<string, number> = {}
        for (const ct of completedTasks) {
          completionsByCategory[ct.categoryName] = (completionsByCategory[ct.categoryName] ?? 0) + 1
        }

        const tasksWithBothTimes = completedTasks.filter(
          t => t.estimatedDuration != null && t.actualTimeSpent != null
        )
        const estimateAccuracy = tasksWithBothTimes.length > 0
          ? {
              sampleSize: tasksWithBothTimes.length,
              avgEstimatedMinutes: Math.round(
                tasksWithBothTimes.reduce((s, t) => s + t.estimatedDuration!, 0) / tasksWithBothTimes.length
              ),
              avgActualMinutes: Math.round(
                tasksWithBothTimes.reduce((s, t) => s + t.actualTimeSpent!, 0) / tasksWithBothTimes.length
              ),
              avgDifferenceMinutes: Math.round(
                tasksWithBothTimes.reduce((s, t) => s + (t.timeDifference ?? 0), 0) / tasksWithBothTimes.length
              ),
            }
          : null

        const dailyBreakdown: Record<string, { studyMinutes: number; tasksCompleted: number }> = {}
        for (const r of timeRecords) {
          const day = r.startTime.toISOString().split('T')[0]
          if (!dailyBreakdown[day]) dailyBreakdown[day] = { studyMinutes: 0, tasksCompleted: 0 }
          dailyBreakdown[day].studyMinutes += Math.max(0, r.duration) / 60
        }
        for (const ct of completedTasks) {
          const day = ct.completedAt.toISOString().split('T')[0]
          if (!dailyBreakdown[day]) dailyBreakdown[day] = { studyMinutes: 0, tasksCompleted: 0 }
          dailyBreakdown[day].tasksCompleted += 1
        }
        for (const day of Object.values(dailyBreakdown)) {
          day.studyMinutes = Math.round(day.studyMinutes)
        }

        return success({
          period: { startDate, endDate },
          totalStudyMinutes: Math.round(totalSeconds / 60),
          totalStudyHours: Math.round(totalSeconds / 3600 * 10) / 10,
          totalSessions: timeRecords.length,
          tasksCompleted: completedTasks.length,
          timeByCategory,
          completionsByCategory,
          estimateAccuracy,
          dailyBreakdown,
        })
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Failed to fetch productivity stats')
      }
    }
  )
}

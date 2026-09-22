import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

const UpdateTimeRecordSchema = z.object({
  taskTitle: z.string().min(1).max(255).optional(),
  categoryName: z.string().min(1).max(255).optional(),
  categoryColor: z.string().min(1).max(100).optional(),
  taskType: z.string().min(1).max(100).optional(),
  startTime: z.string().min(1).optional(),
  endTime: z.string().min(1).optional(),
  duration: z.number().int().min(0).max(86400).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser()
    const { id } = await params

    const existing = await prisma.timeRecord.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const parsed = UpdateTimeRecordSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body = parsed.data

    const data: Record<string, unknown> = {}
    if (body.taskTitle !== undefined) data.taskTitle = body.taskTitle
    if (body.categoryName !== undefined) data.categoryName = body.categoryName
    if (body.categoryColor !== undefined) data.categoryColor = body.categoryColor
    if (body.taskType !== undefined) data.taskType = body.taskType
    if (body.startTime !== undefined) {
      const st = new Date(body.startTime)
      if (isNaN(st.getTime())) return NextResponse.json({ error: 'Invalid startTime' }, { status: 400 })
      data.startTime = st
    }
    if (body.endTime !== undefined) {
      const et = new Date(body.endTime)
      if (isNaN(et.getTime())) return NextResponse.json({ error: 'Invalid endTime' }, { status: 400 })
      data.endTime = et
    }
    if (body.duration !== undefined) data.duration = body.duration

    // If start/end changed, recalculate duration automatically
    if (body.startTime && body.endTime && body.duration === undefined) {
      let dur = Math.round(
        (new Date(body.endTime).getTime() - new Date(body.startTime).getTime()) / 1000
      )
      if (dur < 0) dur += 86400
      data.duration = dur
    }

    const record = await prisma.timeRecord.update({
      where: { id },
      data,
    })

    return NextResponse.json(record)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to update time record:', error)
    return NextResponse.json(
      { error: 'Failed to update time record' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser()
    const { id } = await params

    const existing = await prisma.timeRecord.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.timeRecord.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Failed to delete time record:', error)
    return NextResponse.json(
      { error: 'Failed to delete time record' },
      { status: 500 }
    )
  }
}

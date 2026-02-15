import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    if (body.taskTitle !== undefined) data.taskTitle = body.taskTitle
    if (body.categoryName !== undefined) data.categoryName = body.categoryName
    if (body.categoryColor !== undefined) data.categoryColor = body.categoryColor
    if (body.taskType !== undefined) data.taskType = body.taskType
    if (body.startTime !== undefined) data.startTime = new Date(body.startTime)
    if (body.endTime !== undefined) data.endTime = new Date(body.endTime)
    if (body.duration !== undefined) data.duration = body.duration

    // If start/end changed, recalculate duration automatically
    if (body.startTime && body.endTime && body.duration === undefined) {
      data.duration = Math.round(
        (new Date(body.endTime).getTime() - new Date(body.startTime).getTime()) / 1000
      )
    }

    const record = await prisma.timeRecord.update({
      where: { id },
      data,
    })

    return NextResponse.json(record)
  } catch (error) {
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
    const { id } = await params
    await prisma.timeRecord.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete time record:', error)
    return NextResponse.json(
      { error: 'Failed to delete time record' },
      { status: 500 }
    )
  }
}

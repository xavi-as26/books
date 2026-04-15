import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

function toInt(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined
  const n = typeof val === 'number' ? val : parseInt(String(val), 10)
  return isNaN(n) ? undefined : n
}

function toFloat(val: unknown): number | null | undefined {
  if (val === undefined || val === null || val === '') return undefined
  const n = typeof val === 'number' ? val : parseFloat(String(val))
  return isNaN(n) ? undefined : n
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const book = await db.book.findUnique({
      where: { id },
      include: { notes: { orderBy: { createdAt: 'desc' } } },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    return NextResponse.json(book)
  } catch (error) {
    console.error('Error fetching book:', error)
    return NextResponse.json({ error: 'Error fetching book' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Build data object with only provided fields
    const data: Record<string, unknown> = {}

    if (body.title !== undefined) data.title = body.title
    if (body.author !== undefined) data.author = body.author
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl || null
    if (body.coverBase64 !== undefined) data.coverBase64 = body.coverBase64 || null
    if (body.status !== undefined) data.status = body.status
    if (body.purchaseLink !== undefined) data.purchaseLink = body.purchaseLink || null
    if (body.price !== undefined) data.price = toFloat(body.price) ?? null
    if (body.totalPages !== undefined) data.totalPages = toInt(body.totalPages) ?? null
    if (body.currentPage !== undefined) data.currentPage = toInt(body.currentPage) ?? 0
    if (body.rating !== undefined) data.rating = toInt(body.rating) ?? null
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.finishDate !== undefined) data.finishDate = body.finishDate ? new Date(body.finishDate) : null

    const book = await db.book.update({
      where: { id },
      data,
      include: { notes: { orderBy: { createdAt: 'desc' } } },
    })

    return NextResponse.json(book)
  } catch (error) {
    console.error('Error updating book:', error)
    return NextResponse.json({ error: 'Error updating book' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.book.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting book:', error)
    return NextResponse.json({ error: 'Error deleting book' }, { status: 500 })
  }
}

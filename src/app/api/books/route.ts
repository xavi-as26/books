import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const books = await db.book.findMany({
      where: status ? { status } : undefined,
      include: { notes: { orderBy: { createdAt: 'desc' } } },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(books)
  } catch (error) {
    console.error('Error fetching books:', error)
    return NextResponse.json({ error: 'Error fetching books' }, { status: 500 })
  }
}

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, author, coverUrl, coverBase64, status, purchaseLink, price, totalPages, currentPage } = body

    if (!title || !author) {
      return NextResponse.json({ error: 'Title and author are required' }, { status: 400 })
    }

    const book = await db.book.create({
      data: {
        title,
        author,
        coverUrl: coverUrl || null,
        coverBase64: coverBase64 || null,
        status: status || 'OWNED',
        purchaseLink: purchaseLink || null,
        price: toFloat(price) ?? null,
        totalPages: toInt(totalPages) ?? null,
        currentPage: toInt(currentPage) ?? 0,
      },
      include: { notes: true },
    })

    return NextResponse.json(book, { status: 201 })
  } catch (error) {
    console.error('Error creating book:', error)
    return NextResponse.json({ error: 'Error creating book' }, { status: 500 })
  }
}

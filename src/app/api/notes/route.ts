import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookId, type, content, page } = body

    if (!bookId || !content) {
      return NextResponse.json({ error: 'Book ID and content are required' }, { status: 400 })
    }

    const note = await db.note.create({
      data: {
        bookId,
        type: type || 'THOUGHT',
        content,
        page: page ? parseInt(page) : null,
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Error creating note' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const title = formData.get('title') as string || ''
    const text = formData.get('text') as string || ''
    const url = formData.get('url') as string || ''

    // Redirect to home with the shared URL as a query parameter
    const sharedUrl = url || text || title
    if (sharedUrl && sharedUrl.startsWith('http')) {
      return NextResponse.redirect(new URL(`/?sharedUrl=${encodeURIComponent(sharedUrl)}`, request.url))
    }

    return NextResponse.redirect(new URL('/', request.url))
  } catch (error) {
    console.error('Share target error:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}

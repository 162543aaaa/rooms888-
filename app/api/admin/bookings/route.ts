import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const bookings = await prisma.booking.findMany({
      include: {
        room: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

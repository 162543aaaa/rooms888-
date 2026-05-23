import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    // If 'all' is true, return all rooms (e.g. for admin dashboard).
    // Otherwise return only ACTIVE rooms.
    const rooms = await prisma.room.findMany({
      where: all ? {} : { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, capacity, status, maxDurationMinutes } = body;

    if (!name || !capacity) {
      return NextResponse.json({ error: 'Missing name or capacity' }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: {
        name,
        capacity: Number(capacity),
        status: status || 'ACTIVE',
        maxDurationMinutes: Number(maxDurationMinutes) || 240,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

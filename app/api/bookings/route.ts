import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createBookingWithLock } from '@/lib/booking-validation';

// GET: Fetch bookings for a specific room within a time window
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const startStr = searchParams.get('start'); // ISO String
    const endStr = searchParams.get('end');     // ISO String

    if (!roomId || !startStr || !endStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: roomId, start, end' },
        { status: 400 }
      );
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    const bookings = await prisma.booking.findMany({
      where: {
        roomId: roomId,
        startTime: {
          gte: start,
        },
        endTime: {
          lte: end,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // We'll return the bookings in a simplified structure for the UI
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Book a room with overlap check & row locking
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, userName, userDepartment, userEmail, notes, startTime, endTime } = body;

    // Validate inputs
    if (!roomId || !userName || !userDepartment || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, userName, userDepartment, startTime, endTime' },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Call validation function with row-locking logic
    const result = await createBookingWithLock(prisma, {
      roomId,
      userName,
      userDepartment,
      userEmail: userEmail || '',
      notes: notes || '',
      startTime: start,
      endTime: end,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 409 });
    }

    // Trigger asynchronous, non-blocking Google Sheets sync in the background
    if (result.bookingId) {
      (async () => {
        try {
          const settings = await prisma.systemSettings.findUnique({
            where: { id: 'global' },
          });

          if (settings?.googleSheetUrl) {
            const booking = await prisma.booking.findUnique({
              where: { id: result.bookingId },
              include: { room: true },
            });

            if (booking) {
              await fetch(settings.googleSheetUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: booking.id,
                  roomName: booking.room.name,
                  userName: booking.userName,
                  userDepartment: booking.userDepartment,
                  startTime: booking.startTime.toISOString(),
                  endTime: booking.endTime.toISOString(),
                  notes: booking.notes || '',
                  createdAt: booking.createdAt.toISOString(),
                }),
              });
            }
          }
        } catch (syncError) {
          console.error('Error syncing booking to Google Sheets:', syncError);
        }
      })();
    }

    return NextResponse.json({
      message: result.message,
      bookingId: result.bookingId,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

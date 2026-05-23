import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: {},
      create: {
        id: 'global',
        maxDurationMinutes: 240,
        operatingStartHour: '08:00',
        operatingEndHour: '20:00',
      },
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { maxDurationMinutes, operatingStartHour, operatingEndHour, googleSheetUrl } = body;

    const updatedSettings = await prisma.systemSettings.update({
      where: { id: 'global' },
      data: {
        maxDurationMinutes: maxDurationMinutes ? Number(maxDurationMinutes) : undefined,
        operatingStartHour,
        operatingEndHour,
        googleSheetUrl: googleSheetUrl !== undefined ? googleSheetUrl : undefined,
      },
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
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

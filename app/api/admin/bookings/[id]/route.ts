import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const deletedBooking = await prisma.booking.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Booking forcefully canceled',
      booking: deletedBooking,
    });
  } catch (error) {
    console.error('Error canceling booking:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { startTime, endTime } = await request.json();

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'กรุณาระบุเวลาเริ่มต้นและเวลาสิ้นสุด' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return NextResponse.json({ error: 'เวลาเริ่มต้นต้องอยู่ก่อนเวลาสิ้นสุด' }, { status: 400 });
    }

    // ตรวจสอบว่าคิวจองนี้มีอยู่จริง
    const currentBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!currentBooking) {
      return NextResponse.json({ error: 'ไม่พบรายการจองดังกล่าวในระบบ' }, { status: 404 });
    }

    // ตรวจสอบการชนกันของเวลา (Overlap Check) โดยไม่ตรวจตัวมันเอง
    const overlappingBookings = await prisma.booking.findFirst({
      where: {
        roomId: currentBooking.roomId,
        id: { not: id },
        startTime: {
          lt: end,
        },
        endTime: {
          gt: start,
        },
      },
    });

    if (overlappingBookings) {
      return NextResponse.json({
        error: 'ช่วงเวลาที่คุณเลือกทับซ้อนกับการจองอื่นที่มีอยู่แล้วในห้องนี้'
      }, { status: 400 });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        startTime: start,
        endTime: end,
      },
    });

    return NextResponse.json({
      message: 'Booking updated successfully',
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


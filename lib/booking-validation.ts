import { PrismaClient, Prisma } from '@prisma/client';

export interface BookingRequest {
  roomId: string;
  userName: string;
  userDepartment: string;
  userEmail: string;
  notes?: string;
  startTime: Date; // Input must be UTC Date objects
  endTime: Date;   // Input must be UTC Date objects
}

export interface ValidationResult {
  success: boolean;
  message: string;
  bookingId?: string;
}

/**
 * Creates a room booking inside a transaction with row-level locking
 * to prevent concurrent double-bookings (race conditions).
 * 
 * Overlap condition: (Requested_Start < Existing_End) AND (Requested_End > Existing_Start)
 */
export async function createBookingWithLock(
  prisma: PrismaClient,
  request: BookingRequest
): Promise<ValidationResult> {
  const { roomId, userName, userDepartment, userEmail, startTime, endTime } = request;

  // 1. Basic validation
  if (startTime >= endTime) {
    return { success: false, message: 'เวลาเริ่มต้นต้องอยู่ก่อนเวลาสิ้นสุด' };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // 2. Acquire a row-level lock on the Room to prevent concurrent bookings for this specific room.
      // This forces other transactions attempting to book the same room to wait until this transaction completes.
      // Note: "FOR UPDATE" is supported in PostgreSQL and MySQL.
      let room: any = null;
      try {
        const rooms: any[] = await tx.$queryRaw`
          SELECT id, name, status, "maxDurationMinutes" 
          FROM "Room" 
          WHERE id = ${roomId} 
          FOR UPDATE
        `;
        if (rooms && rooms.length > 0) {
          room = rooms[0];
        }
      } catch (error) {
        // Fallback for SQLite which doesn't support FOR UPDATE
        room = await tx.room.findUnique({
          where: { id: roomId },
        });
      }

      if (!room) {
        return { success: false, message: 'ไม่พบห้องประชุมดังกล่าวในระบบ' };
      }

      // Check if room is active
      if (room.status !== 'ACTIVE') {
        return { success: false, message: `ห้องประชุม "${room.name}" อยู่ในระหว่างปิดปรับปรุง` };
      }

      // 3. Query for any overlapping bookings for this room.
      // Condition: (Requested_Start < Existing_End) AND (Requested_End > Existing_Start)
      const overlappingBookings = await tx.booking.findFirst({
        where: {
          roomId: roomId,
          startTime: {
            lt: endTime,
          },
          endTime: {
            gt: startTime,
          },
        },
      });

      if (overlappingBookings) {
        return {
          success: false,
          message: 'ช่วงเวลาที่คุณกรอกทับซ้อนกับการจองที่มีอยู่แล้ว กรุณาเลือกเวลาอื่น',
        };
      }

      // 4. Create the booking as no overlap exists
      const newBooking = await tx.booking.create({
        data: {
          roomId,
          userName,
          userDepartment,
          userEmail,
          notes: request.notes || '',
          startTime,
          endTime,
        },
      });

      return {
        success: true,
        message: 'ทำการจองห้องสำเร็จแล้ว!',
        bookingId: newBooking.id,
      };
    }, {
      // Set transactional isolation level or timeout if needed
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    console.error('Error creating booking with transaction lock:', error);
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูลหรือเกิดการจองซ้ำซ้อน กรุณาลองใหม่อีกครั้ง',
    };
  }
}

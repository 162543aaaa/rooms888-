import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create or update global System Settings
  await prisma.systemSettings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      maxDurationMinutes: 240, // 4 hours
      operatingStartHour: '08:00',
      operatingEndHour: '20:00',
    },
  });

  // 2. Create sample rooms
  const rooms = [
    { name: 'Neon Lounge (Room A)', capacity: 4, maxDurationMinutes: 120, status: 'ACTIVE' as const },
    { name: 'Retro Arcade (Room B)', capacity: 8, maxDurationMinutes: 240, status: 'ACTIVE' as const },
    { name: 'VHS Cinema (Room C)', capacity: 12, maxDurationMinutes: 240, status: 'ACTIVE' as const },
    { name: 'Future Synth (Room D)', capacity: 6, maxDurationMinutes: 180, status: 'MAINTENANCE' as const },
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { name: room.name },
      update: {
        capacity: room.capacity,
        maxDurationMinutes: room.maxDurationMinutes,
        status: room.status,
      },
      create: room,
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

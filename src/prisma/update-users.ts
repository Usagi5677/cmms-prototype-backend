// Add this to your seed-production.ts or create a new script

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple name generator
function generateRandomName() {
  const firstNames = [
    'James',
    'Mary',
    'John',
    'Patricia',
    'Robert',
    'Jennifer',
    'Michael',
    'Linda',
    'William',
    'Elizabeth',
    'David',
    'Susan',
    'Richard',
    'Jessica',
    'Joseph',
    'Sarah',
    'Thomas',
    'Karen',
    'Charles',
    'Nancy',
    'Christopher',
    'Lisa',
    'Daniel',
    'Margaret',
    'Matthew',
    'Betty',
    'Anthony',
    'Sandra',
    'Mark',
    'Ashley',
    'Donald',
    'Kimberly',
    'Steven',
    'Emily',
    'Paul',
    'Donna',
    'Andrew',
    'Michelle',
    'Joshua',
    'Carol',
  ];

  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Hernandez',
    'Lopez',
    'Gonzalez',
    'Wilson',
    'Anderson',
    'Thomas',
    'Taylor',
    'Moore',
    'Jackson',
    'Martin',
    'Lee',
    'Perez',
    'Thompson',
    'White',
    'Harris',
    'Sanchez',
    'Clark',
    'Ramirez',
    'Lewis',
    'Robinson',
    'Walker',
    'Young',
    'Allen',
    'King',
    'Wright',
    'Scott',
    'Torres',
    'Nguyen',
    'Hill',
    'Flores',
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

// Function to generate a random 4-digit number
function generateRandomRcno(usedRcnos: Set<number>): number {
  let rcno;
  do {
    rcno = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
  } while (usedRcnos.has(rcno));
  usedRcnos.add(rcno);
  return rcno;
}

async function updateUsersWithFakeData() {
  try {
    console.log('Starting to update users with fake data...');

    // Get all existing users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users to update`);

    // Create a set to track used RCNOs and userIds to ensure uniqueness
    const usedRcnos = new Set<number>();

    // Get all existing userIds to avoid conflicts
    const existingUserIds = new Set<string>(
      (await prisma.user.findMany({ select: { userId: true } }))
        .map((u) => u.userId)
        .filter((id) => id !== null) as string[]
    );

    console.log(`Found ${existingUserIds.size} existing userIds to avoid`);

    // Function to generate unique userId
    function generateUniqueUserId(index: number): string {
      let userId;
      let counter = index + 1;

      do {
        userId = `user${counter}`;
        counter++;
      } while (existingUserIds.has(userId));

      existingUserIds.add(userId); // Add to set to avoid duplicates
      return userId;
    }

    // Update each user with fake data - process in smaller batches
    const BATCH_SIZE = 50;
    let updatedCount = 0;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      // Process users in this batch
      await Promise.all(
        batch.map(async (user, batchIndex) => {
          try {
            // Generate fake name
            const { firstName, lastName, fullName } = generateRandomName();

            // Generate email based on name
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`;

            // Generate unique userId and rcno
            const userId = generateUniqueUserId(i + batchIndex);
            const rcno = generateRandomRcno(usedRcnos);

            // Update the user
            await prisma.user.update({
              where: { id: user.id },
              data: {
                userId,
                rcno,
                fullName,
                email,
              },
            });

            updatedCount++;
          } catch (error) {
            console.error(`Error updating user ${user.id}:`, error);
          }
        })
      );

      console.log(
        `Updated ${Math.min(i + BATCH_SIZE, users.length)} users so far...`
      );
    }

    console.log(`Successfully updated ${updatedCount} users with fake data`);
  } catch (error) {
    console.error('Error updating users with fake data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
updateUsersWithFakeData()
  .then(() => console.log('User update completed'))
  .catch((error) => console.error('Failed to update users:', error));

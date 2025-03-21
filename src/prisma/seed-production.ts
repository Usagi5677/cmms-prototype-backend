// prisma/seed-production.ts
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PERMISSIONS } from '../constants';

const prisma = new PrismaClient();

async function main() {
  try {
    const testUserId = 'admin101';
    let userId;

    console.log('Checking if user exists...');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { userId: testUserId },
      include: { roles: true },
    });

    if (existingUser) {
      console.log(`User already exists.`);
      userId = existingUser.id; // Store the user's ID for role assignment
    } else {
      // Create user if they don't exist
      console.log('Creating new admin user...');

      const hashedPassword = await bcrypt.hash('test', 10);

      const newUser = await prisma.user.create({
        data: {
          userId: 'admin101',
          email: 'test@gmail.com',
          password: hashedPassword,
          fullName: 'Admin User',
          rcno: 1111,
        },
      });

      userId = newUser.id;
    }

    // Check and create roles
    console.log('Checking for roles...');

    // Define the roles to create with their site IDs
    const rolesToCreate = [
      { name: 'Mechanic', createdById: userId },
      { name: 'Admin', createdById: userId },
      { name: 'Engineer', createdById: userId },
      { name: 'User', createdById: userId },
      { name: 'Division Admin', createdById: userId },
      { name: 'Developer', createdById: userId },
      { name: 'Super Admin', createdById: userId },
      { name: 'ERP', createdById: userId },
      { name: 'Managerial', createdById: userId },
      { name: 'Maintenance/Repair', createdById: userId },
    ];

    // Check and create each role
    for (const roleData of rolesToCreate) {
      // Check if role exists for the specified site
      const existingRole = await prisma.role.findFirst({
        where: {
          name: roleData.name,
          createdById: userId,
        },
      });

      if (existingRole) {
        console.log(`Role '${roleData.name}' already exists.`);
      } else {
        // Create the role
        await prisma.role.create({
          data: {
            name: roleData.name,
            createdById: userId,
          },
        });
        console.log(`Created role ${roleData.name}`);
      }
    }

    const role = await prisma.role.findFirst({
      where: { name: 'Super Admin' },
    });

    const existingPermissions = await prisma.permissionRole.findMany({
      where: { roleId: role.id },
      select: { permission: true },
    });

    // Extract just the permission names from the result
    const existingPermissionNames = existingPermissions.map(
      (p) => p.permission
    );

    const permissionsToAdd = PERMISSIONS.filter(
      (permission) => !existingPermissionNames.includes(permission)
    );

    // Add each missing permission
    for (const permission of permissionsToAdd) {
      await prisma.permissionRole.create({
        data: {
          roleId: role.id,
          permission: permission,
        },
      });
      console.log(`Added permission: ${permission}`);
    }

    const userRoleExist = await prisma.userRole.findFirst({
      where: { userId, roleId: role.id },
    });
    if (userRoleExist) {
      console.log('user role already exist');
    } else {
      await prisma.userRole.create({
        data: {
          userId: userId,
          roleId: role.id,
        },
      });
      console.log('user role created');
    }
  } catch (error) {
    console.error('Error in seed script:', error);
  }
}

// Make the main function handle its own try/catch
main()
  .then(() => {
    console.log('Seed script completed successfully');
  })
  .catch((e) => {
    console.error('Seed script failed:', e);
  })
  .finally(async () => {
    console.log('Disconnecting from database...');
    try {
      await prisma.$disconnect();
      console.log('Database disconnected');
      process.exit(0);
    } catch (error) {
      console.error('Error disconnecting from database:', error);
      process.exit(1);
    }
  });

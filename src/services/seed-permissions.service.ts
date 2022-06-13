import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { permissions } from 'src/constants';
/*
@Injectable()
export class SeedPermissionsService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}
  async onApplicationBootstrap() {
    const existingPermissionsInDB = (
      await this.prisma.permission.findMany()
    ).map((p) => p.name);
    const permissionsNotInDB = permissions.filter(
      (permission) => !existingPermissionsInDB.includes(permission)
    );
    if (permissionsNotInDB.length > 0) {
      await this.prisma.permission.createMany({
        data: permissionsNotInDB.map((permission) => ({
          name: permission,
        })),
      });
      console.log(`Permissions added to DB: ${permissionsNotInDB.join(',')}`);
    }
    const permissionsToBeRemoved = existingPermissionsInDB.filter(
      (permission) => !permissions.includes(permission)
    );
    if (permissionsToBeRemoved.length > 0) {
      await this.prisma.permission.deleteMany({
        where: { name: { in: permissionsToBeRemoved } },
      }),
        console.log(
          `Permissions removed from DB: ${permissionsToBeRemoved.join(',')}`
        );
    }
  }
}
*/

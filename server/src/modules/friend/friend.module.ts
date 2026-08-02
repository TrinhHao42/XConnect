import { Module } from '@nestjs/common';
import { FriendService } from './friend.service';
import { FriendController } from './friend.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketModule } from '../../socket/socket.module';

@Module({
  imports: [PrismaModule, SocketModule],
  providers: [FriendService],
  controllers: [FriendController],
  exports: [FriendService],
})
export class FriendModule {}

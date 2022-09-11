import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from 'src/api-key/api-key.service';
import * as moment from 'moment';

@Injectable()
export class KeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const inputKey = request.headers.authorization;
    if (!inputKey) {
      return false;
    }
    const key = await this.apiKeyService.findOne(inputKey);
    if (!key) {
      throw new UnauthorizedException('Invalid API key');
    }
    if (!key.active) {
      throw new UnauthorizedException('Your key has been deactivated');
    }
    if (key.expiresAt && moment().isAfter(moment(key.expiresAt))) {
      throw new UnauthorizedException('Your key has been expired.');
    }
    await this.apiKeyService.callCountIncrease(key);
    request.key = key;
    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const workspaceId = request.headers['x-workspace-id'];

    const subscription = await this.subscriptionRepo.findOne({
      where: { workspace: { id: workspaceId } },
    });

    if (!subscription) throw new ForbiddenException('No subscription');

    const now = new Date();
    const isTrialExpired =
      subscription.plan === 'Free Trial' && now > subscription.currentPeriodEnd;

    if (isTrialExpired) {
      throw new ForbiddenException('Trial expired. Please upgrade.');
    }

    return true;
  }
}

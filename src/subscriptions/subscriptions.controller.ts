import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { SubscriptionPlanEnum } from './subscription.enum';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('me')
  async getWorkspaceSubscription(@Body() body: { workspaceId: string }) {
    return this.subscriptionsService.getWorkspaceSubscription(body.workspaceId);
  }

  @Post('setup-payment')
  async setupPayment(@Body() body: { workspaceId: string; plan: string }) {
    return this.subscriptionsService.createSetupSession(
      body.workspaceId,
      body.plan,
    );
  }

  @Post('upgrade')
  async upgrade(
    @Body() body: { workspaceId: string; plan: SubscriptionPlanEnum },
  ) {
    return this.subscriptionsService.upgradeToPaidPlan(
      body.workspaceId,
      body.plan,
    );
  }

  @Post('webhook/stripe')
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'];
    return await this.subscriptionsService.handleStripeWebhook(sig, req.body);
  }
}

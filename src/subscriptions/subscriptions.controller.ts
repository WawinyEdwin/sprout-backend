import { Body, Controller, Post, Req, Res } from '@nestjs/common';
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

  @Post('manage')
  async manageBilling(@Body() body: { workspaceId: string }) {
    return this.subscriptionsService.manageBilling(body.workspaceId);
  }

  @Post('webhook/stripe')
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'];
    return await this.subscriptionsService.handleStripeWebhook(sig, req.body);
  }
}

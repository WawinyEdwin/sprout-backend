import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlanEnum } from './subscription.enum';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe: Stripe;
  private webhookSecret: string;
  private appUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly workspaceService: WorkspacesService,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_API_KEY')!,
      {
        apiVersion: '2025-07-30.basil',
      },
    );
    this.webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    )!;
    this.appUrl = this.configService.get<string>('FRONTEND_URL')!;
  }

  async createSetupSession(
    workspaceId: string,
    plan: string,
  ): Promise<{ url: string }> {
    const workspace =
      await this.workspaceService.findWorkspaceById(workspaceId);
    const subscription = workspace.subscription;
    const customer = await this.stripe.customers.create({
      name: workspace.name,
      // workspaceId: workspace.id,
    });

    subscription.stripeCustomerId = customer.id;
    await this.subscriptionRepo.save(subscription);

    const priceMap = {
      Growth: 'price_1RtrnMKK7F1YUUIwPnnHUP6W',
      Professional: 'price_1RtrpGKK7F1YUUIwozkXq2BT',
      Enterprise: 'price_1RtrqiKK7F1YUUIwWAZbkHPD',
    };

    const priceId = priceMap[plan];

    if (!priceId) throw new BadRequestException('Invalid plan selected');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      customer_update: { address: 'auto' },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${this.appUrl}/dashboard/billing/success`,
      cancel_url: `${this.appUrl}/dashboard/billing/cancel`,
    });

    if (!session.url) {
      throw new BadRequestException("Couldn't setup session");
    }

    return { url: session.url };
  }

  async upgradeToPaidPlan(workspaceId: string, plan: SubscriptionPlanEnum) {
    const workspace =
      await this.workspaceService.findWorkspaceById(workspaceId);

    const subscription = workspace.subscription;
    if (!subscription) throw new NotFoundException('No subscription found');

    const customer = await this.stripe.customers.create({
      name: workspace.name,
    });

    const priceMap = {
      Growth: 'price_1RtnPzKK7F1YUUIwEpVV1vQC',
      Proffesional: 'price_1RtnS2KK7F1YUUIwSjCRBrB2',
      Enterprise: 'price_1RtnRRKK7F1YUUIwtDHE5M5O',
    };

    const priceId = priceMap[plan];

    if (!priceId) throw new BadRequestException('Invalid plan selected');

    const stripeSubscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    subscription.stripeCustomerId = customer.id;
    subscription.stripeSubscriptionId = stripeSubscription.id;
    subscription.plan = plan;
    // subscription.currentPeriodEnd = new Date(
    //   stripeSubscription.current_period_end * 1000,
    // );

    await this.subscriptionRepo.save(subscription);

    return {
      clientSecret: (stripeSubscription.latest_invoice as any)?.payment_intent
        ?.client_secret,
    };
  }

  async handleStripeWebhook(sig: string, payload: any) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        sig,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error('Webhook Error:', err.message);
      throw new InternalServerErrorException(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === 'setup') {
        const setupIntent = await this.stripe.setupIntents.retrieve(
          session.setup_intent as string,
        );

        const customerId = session.customer as string;
        const paymentMethodId = setupIntent.payment_method as string;

        await this.stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        // await this.subscriptionRepo.update()
      }
    }

    return { received: true };
  }

  async getWorkspaceSubscription(workspaceId: string) {
    return await this.subscriptionRepo.findOneBy({
      workspace: {
        id: workspaceId,
      },
    });
  }
}

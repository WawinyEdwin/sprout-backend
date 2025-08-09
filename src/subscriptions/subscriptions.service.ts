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
  private priceMap: Record<
    SubscriptionPlanEnum,
    { priceId: string | null; amount: number }
  >;

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
    this.priceMap = {
      Growth: { priceId: 'price_1RtrnMKK7F1YUUIwPnnHUP6W', amount: 399 },
      Professional: { priceId: 'price_1RtrpGKK7F1YUUIwozkXq2BT', amount: 199 },
      Enterprise: { priceId: 'price_1RtrqiKK7F1YUUIwWAZbkHPD', amount: 899 },
      Free: { priceId: null, amount: 0 },
    };
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
    });

    subscription.stripeCustomerId = customer.id;
    await this.subscriptionRepo.save(subscription);

    const priceId = this.priceMap[plan];
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

  async manageBilling(workspaceId: string) {
    const subscription = await this.getWorkspaceSubscription(workspaceId);
    const portalSession = await this.stripe.billingPortal.sessions.create({
      customer: subscription?.stripeCustomerId,
      return_url: `${this.appUrl}/dashboard/billing`,
    });

    return { url: portalSession.url };
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

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription') {
          const subscription = await this.stripe.subscriptions.retrieve(
            session.subscription as string,
          );

          await this.subscriptionRepo.update(
            { stripeCustomerId: session.customer as string },
            {
              stripeSubscriptionId: subscription.id,
              plan: this.getPlanFromPriceId(
                subscription.items.data[0].price.id,
              ),
              currentPeriodEnd: new Date(
                subscription.items.data[0].current_period_end * 1000,
              ),
            },
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await this.subscriptionRepo.update(
          { stripeSubscriptionId: sub.id },
          {
            plan: this.getPlanFromPriceId(sub.items.data[0].price.id),
            currentPeriodEnd: new Date(
              sub.items.data[0].current_period_end * 1000,
            ),
          },
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.subscriptionRepo.update(
          { stripeSubscriptionId: sub.id },
          {
            plan: SubscriptionPlanEnum.FREE_TRIAL,
            currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        this.logger.warn(`Payment failed for ${invoice.customer}`);
        // Optionally send email to user
        break;
      }
    }

    return { received: true };
  }

  private getPlanFromPriceId(priceId: string): SubscriptionPlanEnum {
    return Object.entries(this.priceMap).find(
      ([, data]) => data.priceId === priceId,
    )?.[0] as SubscriptionPlanEnum;
  }

  async getWorkspaceSubscription(workspaceId: string): Promise<any> {
    const sub = await this.subscriptionRepo.findOneBy({
      workspace: {
        id: workspaceId,
      },
    });

    if (!sub) {
      throw new NotFoundException('No subscription found');
    }

    const planInfo = this.priceMap[sub.plan];
    return {
      ...sub,
      amount: planInfo.amount,
    };
  }
}

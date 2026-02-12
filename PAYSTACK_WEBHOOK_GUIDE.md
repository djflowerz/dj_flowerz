# Paystack Webhook Configuration

## Webhook URL
Your webhook URL is configured as:
```
https://djflowerz-site.pages.dev/api/paystack/webhook
```

## Webhook Events to Subscribe To

In your Paystack Dashboard (https://dashboard.paystack.com/#/settings/developer), subscribe to these events:

1. **charge.success** - When a payment is successful
2. **subscription.create** - When a subscription is created
3. **subscription.disable** - When a subscription is cancelled
4. **subscription.not_renew** - When a subscription won't renew

## Webhook Handler Implementation

The webhook should:

1. **Verify the webhook signature** using your secret key
2. **Parse the event data**
3. **Update Firestore** based on the event:

### For `charge.success`:
```javascript
// Create order in Firestore
db.collection('orders').add({
  userId: metadata.userId,
  amount: data.amount / 100, // Convert from kobo to KES
  status: 'paid',
  reference: data.reference,
  createdAt: new Date()
});
```

### For `subscription.create`:
```javascript
// Update user subscription status
db.collection('users').doc(userId).update({
  isSubscriber: true,
  subscriptionPlan: planId,
  subscriptionExpiry: expiryDate,
  paystackSubscriptionCode: data.subscription_code
});

// Create subscription record
db.collection('subscriptions').add({
  userId: userId,
  planId: planId,
  status: 'active',
  paystackCode: data.subscription_code,
  startDate: new Date(),
  expiryDate: expiryDate
});
```

### For `subscription.disable`:
```javascript
// Revoke user subscription
db.collection('users').doc(userId).update({
  isSubscriber: false,
  subscriptionPlan: null,
  subscriptionExpiry: null
});

// Update subscription record
db.collection('subscriptions').doc(subscriptionId).update({
  status: 'cancelled',
  cancelledAt: new Date()
});
```

## Testing Webhooks

1. Use Paystack's test mode first
2. Use tools like ngrok to test locally:
   ```bash
   ngrok http 5173
   # Use the ngrok URL as your webhook URL in Paystack dashboard
   ```

## Security

- Always verify webhook signatures
- Use HTTPS only
- Store webhook secret in environment variables
- Log all webhook events for debugging

## Subscription Plan Mapping

Map Paystack plan codes to your subscription plans:

| Plan | Duration | Price (KES) | Paystack Link |
|------|----------|-------------|---------------|
| yearly | 12 months | 6000 | https://paystack.shop/pay/po2leez4hy |
| 6months | 6 months | 3500 | https://paystack.shop/pay/5p4gjiehpv |
| 3months | 3 months | 1800 | https://paystack.shop/pay/ayljjgzxzp |
| monthly | 1 month | 700 | https://paystack.shop/pay/u0qw529xyk |
| weekly | 1 week | 200 | https://paystack.shop/pay/7u8-7dn081 |

## Environment Variables Needed

```env
REACT_APP_PAYSTACK_PUBLIC_KEY=pk_live_REDACTED
REACT_APP_PAYSTACK_SECRET_KEY=sk_live_REDACTED
```

## Callback URL
```
https://djflowerz-site.pages.dev/payment-success
```

This page should:
1. Verify the payment reference
2. Show success message
3. Update user's subscription status
4. Redirect to Music Pool or Dashboard

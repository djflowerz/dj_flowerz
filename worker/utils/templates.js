/**
 * worker/utils/templates.js
 * Premium HTML Email Templates — DJ FLOWERZ
 * Dark brand aesthetic: #0B0B0F bg, #a855f7 purple, #28E6DC cyan
 */

// ─── Shared Helpers ────────────────────────────────────────────────────────

const emailWrap = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DJ FLOWERZ</title>
</head>
<body style="margin:0;padding:0;background:#070709;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070709;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f0f15 0%,#17171f 100%);border-radius:24px 24px 0 0;padding:40px 48px 32px;text-align:center;border:1px solid #ffffff08;border-bottom:none;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <div style="display:inline-block;background:linear-gradient(135deg,#a855f720,#28E6DC15);border:1px solid #a855f730;border-radius:12px;padding:8px 20px;">
                      <span style="font-size:11px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:#a855f7;">DJ FLOWERZ</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:11px;color:#6b7280;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Mr Flow Finnesse 🎧 | Nairobi, Kenya</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#0f0f15;border-left:1px solid #ffffff08;border-right:1px solid #ffffff08;padding:0 48px 40px;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0a0a10;border-radius:0 0 24px 24px;padding:32px 48px;text-align:center;border:1px solid #ffffff08;border-top:1px solid #ffffff05;">
              <p style="margin:0 0 16px;font-size:13px;color:#4b5563;">Keep the energy high:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://youtube.com/@dj_flowerz" style="color:#a855f7;text-decoration:none;font-size:13px;font-weight:700;margin:0 12px;">📺 YouTube</a>
                    <span style="color:#2d2d3a;">|</span>
                    <a href="https://instagram.com/djflowerz" style="color:#a855f7;text-decoration:none;font-size:13px;font-weight:700;margin:0 12px;">📸 Instagram</a>
                    <span style="color:#2d2d3a;">|</span>
                    <a href="https://tiktok.com/@dj.flowerz" style="color:#a855f7;text-decoration:none;font-size:13px;font-weight:700;margin:0 12px;">🎵 TikTok</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 4px;font-size:14px;font-weight:900;color:#ffffff;letter-spacing:1px;">Stay Legendary — DJ FLOWERZ</p>
              <p style="margin:0;font-size:10px;color:#374151;letter-spacing:2px;text-transform:uppercase;">djflowerz.co.ke</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const heroSection = (emoji, title, subtitle) => `
  <div style="text-align:center;padding:40px 0 32px;">
    <div style="font-size:48px;margin-bottom:16px;line-height:1;">${emoji}</div>
    <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">${title}</h1>
    <p style="margin:0;font-size:16px;color:#9ca3af;line-height:1.6;max-width:420px;margin:0 auto;">${subtitle}</p>
  </div>
`;

const divider = `<div style="height:1px;background:linear-gradient(90deg,transparent,#ffffff10,transparent);margin:8px 0;"></div>`;

const infoCard = (rows, accentColor = '#a855f7') => `
  <div style="background:#15151f;border:1px solid ${accentColor}25;border-radius:16px;padding:28px 32px;margin:24px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #ffffff06;">
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;">${label}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #ffffff06;text-align:right;">
            <span style="font-size:14px;font-weight:600;color:#ffffff;">${value}</span>
          </td>
        </tr>
      `).join('')}
    </table>
  </div>
`;

const ctaButton = (href, label, style = 'primary') => {
  const styles = {
    primary: 'background:linear-gradient(135deg,#a855f7,#9333ea);color:#ffffff;',
    secondary: 'background:#ffffff;color:#000000;',
    cyan: 'background:linear-gradient(135deg,#28E6DC,#06b6d4);color:#000000;',
    outline: 'background:transparent;color:#a855f7;border:2px solid #a855f7;',
  };
  return `
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="${href}" style="display:inline-block;${styles[style]}padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;box-shadow:0 8px 32px rgba(168,85,247,0.3);">${label}</a>
    </div>
  `;
};

// ─── Exported Templates ────────────────────────────────────────────────────

// [VERIFIED]: Email Templates for DJ Flowerz.
// DO NOT MODIFY WITHOUT EXPLICIT UNLOCK REQUEST.

export const templates = {

  // 1. Subscription Activation
  subscriptionActivation: (userName, planName, expiryDate) => emailWrap(`
    ${heroSection('🎟️', 'Welcome to the Inner Circle!', `You're officially in, <strong style="color:#ffffff;">${userName}</strong>. VIP access is now live.`)}
    ${divider}
    ${infoCard([
      ['Plan', `${planName} VIP Access`],
      ['Status', '<span style="color:#4ade80;">✓ Active</span>'],
      ['Renews', expiryDate],
    ])}
    <div style="background:linear-gradient(135deg,#a855f710,#28E6DC08);border:1px solid #a855f720;border-radius:16px;padding:24px 32px;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#a855f7;">What's Unlocked 🔓</p>
      <p style="margin:6px 0;font-size:14px;color:#d1d5db;">✅ Unlimited Music Pool downloads</p>
      <p style="margin:6px 0;font-size:14px;color:#d1d5db;">✅ Early access to exclusive drops</p>
      <p style="margin:6px 0;font-size:14px;color:#d1d5db;">✅ Members-only live streams</p>
      <p style="margin:6px 0;font-size:14px;color:#d1d5db;">✅ Priority booking discounts</p>
    </div>
    ${ctaButton('https://djflowerz.co.ke/music-pool', '▶ Start Listening Now')}
    <p style="text-align:center;margin:16px 0 0;font-size:13px;color:#6b7280;">Let's make some noise. 🇰🇪</p>
  `),

  // 2. Subscription Expiry
  subscriptionExpiry: (userName, expiryDate, renewalLink) => emailWrap(`
    ${heroSection('⚡', 'Your VIP Access Has Ended', `Yo <strong style="color:#ffffff;">${userName}</strong>, your subscription has expired. Don't miss the next drop.`)}
    ${divider}
    ${infoCard([
      ['Status', '<span style="color:#f87171;">✗ Expired</span>'],
      ['Last Active', expiryDate],
    ], '#f87171')}
    <div style="background:#15151f;border:1px dashed #a855f740;border-radius:16px;padding:24px 32px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Renew now and never miss a beat.</p>
      <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">From KES 299/week 🎧</p>
    </div>
    ${ctaButton(renewalLink || 'https://djflowerz.co.ke/music-pool', '🔄 Renew VIP Access')}
    <p style="text-align:center;margin:16px 0 0;font-size:13px;color:#6b7280;">Hope to see you back on the dancefloor soon.</p>
  `),

  // 3. Store Receipt — Physical
  storeReceiptPhysical: (orderId, amount, customerName, itemsSummary, shippingAddress) => emailWrap(`
    ${heroSection('📦', 'Order Confirmed!', `Nice pick, <strong style="color:#ffffff;">${customerName}</strong>. Your order is being prepared for dispatch.`)}
    ${divider}
    ${infoCard([
      ['Order ID', `#${orderId}`],
      ['Items', itemsSummary],
      ['Shipping To', shippingAddress || 'On file'],
      ['Total', `<span style="color:#4ade80;font-weight:900;">KES ${amount}</span>`],
      ['Status', '<span style="color:#facc15;">⏳ Processing</span>'],
    ])}
    <div style="background:#15151f;border:1px solid #ffffff08;border-radius:16px;padding:24px 32px;margin:24px 0;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#6b7280;">What Happens Next</p>
      <p style="margin:10px 0;font-size:14px;color:#9ca3af;">1. 🧾 Order confirmed — you'll get a dispatch notification soon.</p>
      <p style="margin:10px 0;font-size:14px;color:#9ca3af;">2. 📦 Your gear is packed and shipped via G4S courier.</p>
      <p style="margin:10px 0;font-size:14px;color:#9ca3af;">3. 🚚 Track your parcel with the tracking number we'll send next.</p>
    </div>
    ${ctaButton('https://djflowerz.co.ke/store', '🛍️ Continue Shopping', 'secondary')}
    <p style="text-align:center;margin:16px 0 0;font-size:13px;color:#6b7280;">Show off your gear and tag <strong style="color:#a855f7;">@djflowerz</strong> 📸</p>
  `),

  // 4. Store Receipt — Digital
  storeReceiptDigital: (orderId, amount, customerName, products) => emailWrap(`
    ${heroSection('⚡', 'The Vibes Are Here!', `Your digital drop is ready, <strong style="color:#ffffff;">${customerName}</strong>. Download links are live.`)}
    ${divider}
    ${infoCard([
      ['Order ID', `#${orderId}`],
      ['Total Paid', `<span style="color:#4ade80;font-weight:900;">KES ${amount}</span>`],
      ['Status', '<span style="color:#4ade80;">✓ Payment Confirmed</span>'],
    ])}
    <div style="background:#15151f;border:1px solid #a855f730;border-radius:16px;padding:28px 32px;margin:24px 0;">
      <p style="margin:0 0 20px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#a855f7;">📥 Your Download Access</p>
      ${products.map((p, i) => `
        <div style="padding:16px 0;${i < products.length - 1 ? 'border-bottom:1px solid #ffffff06;' : ''}">
          <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#ffffff;">${p.name}</p>
          <a href="${p.downloadUrl}" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#9333ea);color:#ffffff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.5px;">📥 Download File</a>
          ${p.password ? `<p style="margin:10px 0 0;font-size:12px;color:#6b7280;">🔑 Access Code: <code style="background:#000;color:#28E6DC;padding:3px 8px;border-radius:6px;font-size:12px;letter-spacing:1px;">${p.password}</code></p>` : ''}
        </div>
      `).join('')}
    </div>
    <div style="background:#0a0a10;border:1px dashed #ffffff15;border-radius:12px;padding:20px 24px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;">
        <strong style="color:#9ca3af;">How to unlock:</strong><br>
        1. Click the download button above.<br>
        2. Enter your Access Code if prompted.<br>
        3. 🔊 Turn the volume up and enjoy!
      </p>
    </div>
  `),

  // 5. Tip / Donation Receipt
  tipReceipt: (customerName, amount) => emailWrap(`
    ${heroSection('💎', 'You Are a Legend.', `<strong style="color:#ffffff;">${customerName}</strong>, your support of <strong style="color:#28E6DC;">KES ${amount}</strong> just hit different.`)}
    ${divider}
    <div style="background:linear-gradient(135deg,#28E6DC10,#a855f708);border:1px solid #28E6DC25;border-radius:16px;padding:28px 32px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 8px;font-size:42px;font-weight:900;color:#ffffff;letter-spacing:-1px;">KES ${amount}</p>
      <p style="margin:0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#28E6DC;">Confirmed ✓</p>
    </div>
    <p style="font-size:15px;color:#9ca3af;line-height:1.8;text-align:center;margin:0 0 24px;">
      Support like yours is the fuel behind every beat, every late-night studio session, and every mixtape drop.
      You aren't just a listener — <strong style="color:#ffffff;">you're part of the journey.</strong> 🇰🇪✨
    </p>
    ${ctaButton('https://djflowerz.co.ke/music-pool', '🎧 Explore the Music Pool', 'cyan')}
    <p style="text-align:center;margin:16px 0 0;font-size:13px;color:#6b7280;">Sent to admin@djflowerz.co.ke · Thank you 🙏</p>
  `),

  // 6. Flash Sale
  flashSale: (promoCode, discount, expiryHours = 48) => emailWrap(`
    ${heroSection('🔥', 'Flash Sale: The Vault Is Open!', `For the next ${expiryHours} hours, the inner circle gets exclusive access at a legendary price.`)}
    ${divider}
    <div style="background:linear-gradient(135deg,#a855f720,#28E6DC10);border:2px dashed #a855f750;border-radius:20px;padding:36px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:4px;color:#6b7280;">Your Exclusive Code</p>
      <p style="margin:0;font-size:38px;font-weight:900;color:#ffffff;letter-spacing:8px;">${promoCode}</p>
      <p style="margin:12px 0 0;font-size:20px;font-weight:700;color:#4ade80;">💰 ${discount} OFF EVERYTHING</p>
    </div>
    <div style="background:#15151f;border:1px solid #ffffff08;border-radius:16px;padding:24px 32px;margin:24px 0;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#6b7280;">🔥 Top Picks This Week</p>
      <p style="margin:8px 0;font-size:14px;color:#d1d5db;">🎵 Latest Mixtape Packs</p>
      <p style="margin:8px 0;font-size:14px;color:#d1d5db;">🧢 Limited Edition DJ Flowerz Merch</p>
      <p style="margin:8px 0;font-size:14px;color:#d1d5db;">💿 Exclusive Digital Sample Packs</p>
    </div>
    ${ctaButton('https://djflowerz.co.ke/store', '🛒 Shop the Drop')}
    <p style="text-align:center;margin:16px 0 0;font-size:12px;color:#374151;">⏰ Code expires in ${expiryHours} hours. Don't sleep on this.</p>
  `),

  // 7. Abandoned Cart
  abandonedCart: (customerName, cartLink) => emailWrap(`
    ${heroSection('🛒', 'You Left Something Behind...', `Yo <strong style="color:#ffffff;">${customerName || 'Legend'}</strong>! Your cart is still waiting.`)}
    ${divider}
    <p style="font-size:15px;color:#9ca3af;line-height:1.8;text-align:center;margin:0 0 24px;">
      I noticed you were checking out some fire in the store but didn't finish the set.
      Don't worry — I've saved your cart. 💎
    </p>
    <div style="background:#15151f;border:1px solid #4ade8025;border-radius:16px;padding:24px 32px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#4ade80;">⚡ Limited Time Bonus</p>
      <p style="margin:0;font-size:15px;color:#d1d5db;">Use code <strong style="color:#ffffff;letter-spacing:2px;">MOVEFAST</strong> for an extra <strong style="color:#4ade80;">5% OFF</strong> if you order in the next hour.</p>
    </div>
    ${ctaButton(cartLink || 'https://djflowerz.co.ke/store', '✅ Complete My Order')}
    <p style="text-align:center;margin:16px 0 0;font-size:13px;color:#6b7280;">The drop won't wait forever. 🎧</p>
  `),

  // 8. Order Shipped
  orderShipped: (customerName, orderId, trackingNumber, courierName, estimatedArrival) => emailWrap(`
    ${heroSection('🚚', "It's On the Way!", `<strong style="color:#ffffff;">${customerName}</strong>, your order has been dispatched and is heading your way.`)}
    ${divider}
    ${infoCard([
      ['Order ID', `#${orderId}`],
      ['Courier', courierName || 'G4S Courier'],
      ['Tracking No.', `<strong style="color:#28E6DC;">${trackingNumber || 'Will be updated'}</strong>`],
      ['Est. Arrival', estimatedArrival || '2-5 Business Days'],
    ], '#28E6DC')}
    <p style="font-size:14px;color:#9ca3af;line-height:1.8;text-align:center;margin:0 0 8px;">
      Keep an eye on your tracking number above. Once it arrives, show it off and tag <strong style="color:#a855f7;">@djflowerz</strong> 📸
    </p>
    ${ctaButton('https://djflowerz.co.ke/store', '🛍️ Shop More', 'secondary')}
  `),

  // 9. Welcome (New User Signup)
  welcome: (userName) => emailWrap(`
    ${heroSection('🎧', `Welcome, ${userName}!`, 'Your account is live. The DJ FLOWERZ experience starts now.')}
    ${divider}
    <div style="background:#15151f;border:1px solid #ffffff08;border-radius:16px;padding:28px 32px;margin:24px 0;">
      <p style="margin:0 0 16px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#6b7280;">What's waiting for you 🔓</p>
      <p style="margin:10px 0;font-size:14px;color:#d1d5db;">🎵 Browse the <strong>Music Pool</strong> — Kenya's #1 DJ music library</p>
      <p style="margin:10px 0;font-size:14px;color:#d1d5db;">🛒 Shop the <strong>Official Store</strong> — Merch, digital packs & more</p>
      <p style="margin:10px 0;font-size:14px;color:#d1d5db;">🎙️ <strong>Book a Studio Session</strong> or a gig</p>
      <p style="margin:10px 0;font-size:14px;color:#d1d5db;">📧 Get exclusive drops & announcements first</p>
    </div>
    ${ctaButton('https://djflowerz.co.ke', '🚀 Explore the Platform')}
    <p style="text-align:center;margin:16px 0 0;font-size:13px;color:#6b7280;">Let's make some noise. 🇰🇪</p>
  `),

  // 10. Installment Deposit Confirmation
  installmentDeposit: (userName, productName, depositAmount, balance, nextPaymentDate) => emailWrap(`
    ${heroSection('🤝', 'Plan Activated!', `Yo <strong style="color:#ffffff;">${userName}</strong>, your Lipa Pole Pole plan for <strong style="color:#a855f7;">${productName}</strong> is now live.`)}
    ${divider}
    ${infoCard([
      ['Status', '<span style="color:#4ade80;">✓ Active</span>'],
      ['Deposit Paid', `KES ${depositAmount}`],
      ['Remaining Balance', `KES ${balance}`],
      ['Next Payment', nextPaymentDate || 'Monthly'],
    ])}
    <div style="background:#15151f;border:1px solid #ffffff08;border-radius:16px;padding:24px 32px;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#a855f7;">What's Next?</p>
      <p style="margin:6px 0;font-size:14px;color:#9ca3af;">• Your item is reserved and safe in our vault.</p>
      <p style="margin:6px 0;font-size:14px;color:#9ca3af;">• Track your progress anytime in your <a href="https://djflowerz.co.ke/profile" style="color:#a855f7;text-decoration:none;">Dashboard</a>.</p>
      <p style="margin:6px 0;font-size:14px;color:#9ca3af;">• We'll send a friendly reminder before your next installment.</p>
    </div>
    ${ctaButton('https://djflowerz.co.ke/profile', '📊 View My Progress', 'primary')}
    <p style="text-align:center;margin:16px 0 0;font-size:13px;color:#6b7280;">Level up your gear, one step at a time.</p>
  `),

  // 11. Installment Payment Confirmation
  installmentPayment: (userName, productName, amountPaid, remainingBalance, isFullyPaid) => emailWrap(`
    ${heroSection(isFullyPaid ? '🏆' : '✅', isFullyPaid ? 'Goal Reached!' : 'Payment Received', `Nice <strong style="color:#ffffff;">${userName}</strong>! Your payment for <strong style="color:#a855f7;">${productName}</strong> was successful.`)}
    ${divider}
    ${infoCard([
      ['Amount Paid', `KES ${amountPaid}`],
      ['New Balance', `KES ${remainingBalance}`],
      ['Status', isFullyPaid ? '<span style="color:#4ade80;">✓ Fully Paid</span>' : '<span style="color:#facc15;">⏳ In Progress</span>'],
    ], isFullyPaid ? '#4ade80' : '#a855f7')}
    
    ${isFullyPaid ? `
      <div style="background:linear-gradient(135deg,#4ade8020,#a855f710);border:1px solid #4ade8030;border-radius:16px;padding:24px 32px;margin:24px 0;text-align:center;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#ffffff;">You've fully paid for your ${productName}!</p>
        <p style="margin:0;font-size:14px;color:#d1d5db;">Our team is preparing your package for delivery. We'll send you the tracking details within 24 hours.</p>
      </div>
      ${ctaButton('https://djflowerz.co.ke/store', '🛍️ Back to Store', 'secondary')}
    ` : `
      <div style="background:#15151f;border:1px dashed #ffffff15;border-radius:12px;padding:20px 24px;margin:16px 0;text-align:center;">
        <p style="margin:0;font-size:14px;color:#9ca3af;">You're one step closer to owning it! 🎧</p>
      </div>
      ${ctaButton('https://djflowerz.co.ke/profile', '📊 Track Progress')}
    `}
    <p style="text-align:center;margin:16px 0 0;font-size:13px;color:#6b7280;">Stay legendary — DJ FLOWERZ</p>
  `),

};

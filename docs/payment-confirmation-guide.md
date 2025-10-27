# Payment Confirmation Feature Guide

## Where to Find the Payment Confirmation Icons

The payment confirmation icons appear in the **Owner Messages** screen for tenants with **approved bookings**.

### How to Access:
1. Log in as an owner
2. Look at the bottom navigation bar (5 icons)
3. Tap the **Messages** icon (4th icon, chat bubble)
4. You'll see the list of conversations with tenants

### Payment Badge Indicators:

The badges appear next to the tenant's name in the conversation list:

#### 1. **Paid** (Green Badge ✅)
- Green background with checkmark icon
- Shows "Paid"
- Payment is complete and added to revenue

#### 2. **Partial** (Yellow Badge ⏰)
- Yellow background with time icon
- Shows "Partial"
- Payment is partially completed

#### 3. **Pending** (Blue Badge ⏳)
- Blue background with hourglass icon
- Shows "Pending"
- Payment is awaiting completion

### When Do the Badges Show?

The payment confirmation badges **only appear** when:
1. You have at least one approved booking
2. The tenant has messaged you (conversation exists)
3. The booking status is "approved"

### Steps to See the Feature:

1. **Create a Test Booking** (as a tenant):
   - Make a booking request for a property
   - Wait for the owner to approve it

2. **Approve the Booking** (as an owner):
   - Go to the Bookings page
   - Find the pending booking
   - Tap "Approve"

3. **Check Messages** (as an owner):
   - Go to the Messages screen
   - Look for the tenant who made the booking
   - You should see the payment status badge next to their name

### Visual Location:

```
Owner Messages Screen
────────────────────
┌─────────────────────────────────┐
│ 👤 [Avatar] John Doe    [Pending]│  ← Payment badge here
│     Property: Studio Apartment  │
│     "Hello, I'd like to book..."│
└─────────────────────────────────┘
```

### Console Logs for Debugging:

When you open the Messages screen, check the console for:
- `📋 Found booking for tenant:` - Shows booking status
- `💳 Payment confirmation for [tenant]:` - Shows payment status
- `⚠️ No booking found for tenant:` - No booking exists

If you don't see the badges, it means:
- No approved bookings yet
- No conversations with tenants
- Need to approve a booking first


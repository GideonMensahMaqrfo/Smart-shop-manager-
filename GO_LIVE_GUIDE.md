# Smart Shop Manager Online: Go-Live Guide

This is your own online shop-management platform. Many shops can sign up, each pays you a subscription, and each shop's data is completely separate from every other shop.

## Who can do what

There are three levels of access.

**You (platform owner)** log in at `/super`. You see every shop, set plan prices, activate shops that paid by MoMo, suspend non-payers, and reset an owner's password.

**Shop owner** can do everything in their own shop. They:
- watch sales live from anywhere
- get phone notifications
- add staff and tick exactly what each one can do

**Staff** have only the permissions their owner ticks. There are 15 permissions, for example: sell, give discounts, sell on credit, see cost prices, see profit, restock, cancel sales, delete items, import data, and get notifications. The owner can pick a ready-made role (Cashier, Senior cashier, Store keeper or Manager) and then adjust it.

## What every shop gets

- **Live dashboard:**
  - today's sales updating every 10 seconds
  - which staff are online and how much each person has sold
  - sales by hour
- **Phone notifications:**
  - every sale, or only big sales above an amount the owner sets
  - an item running low
  - a staff member cancelling a sale
  - a staff member logging in
  - the day being closed
  - a daily evening summary
- **Selling counter:**
  - tap items, type item codes, scan with a USB scanner or the phone camera, or search by voice
  - Cash, MoMo, Card, Bank or Credit, with change calculated automatically
  - receipts can be printed or sent on WhatsApp
- **Works when the network drops:** sales are saved on the device and sent automatically when the internet returns. The same sale can never be counted twice.
- **Shop records:**
  - items with pictures, plus low-stock and expiry alerts
  - restock history
  - debt book with WhatsApp payment reminders
  - reports and profit, close day, Excel import and export, and a full backup download
- **Activity log:** every login, price change, deletion and cancellation, with the name of the person who did it.
- **Customisation for each shop:** logo, app colour, payment methods, receipt size and message, currency, alert levels.

## Step 1: Try it on your own computer (free, 5 minutes)

1. Install Python from python.org and tick **"Add python.exe to PATH"** during setup.
2. Unzip the folder and double-click **START_SMART_SHOP.bat**.
3. Open **http://localhost:5000** in Chrome.
4. Click **Start free**, create a test shop, add a cashier, and sell something.
5. Open a second browser window (Incognito), log in as the cashier and sell. Watch the owner's dashboard update.
6. To see the platform-owner panel, log in with `admin@test.com` / `admin123`.

Phone notifications and the phone app only work once it's online with **https** (Step 2).

## Step 2: Put it online

### What you need

| What | Where | Approximate cost (check current prices) |
|---|---|---|
| Domain name, e.g. `smartshopgh.com` | Namecheap, GoDaddy, or a `.com.gh` registrar | about US$10–15 a year |
| Hosting: web server + database + file storage | Render.com (easiest), or any VPS | about US$15–25 a month to start |
| Payment collection | Paystack Ghana (MoMo + cards) | a small % per payment, no monthly fee |
| Daily summary timer | cron-job.org | free |

### Easiest route: Render.com

1. Create a free account at **github.com** and upload this folder as a new private repository.
2. Create an account at **render.com**, click **New → Blueprint**, and choose your repository. Render reads `render.yaml` and creates the website, the database and the file storage for you.
3. Make your secret keys. On your computer, in this folder, run:
   ```
   python app.py genkeys
   ```
   This prints `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SECRET_KEY` and `CRON_KEY`.
4. In Render, open your service, go to **Environment**, and fill in:
   - `BASE_URL`: your web address, for example `https://smartshopgh.com`
   - `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`: **your** platform login
   - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: from step 3
   - `PAYSTACK_SECRET_KEY`: from Paystack (see below)
5. In Render, go to **Settings → Custom Domain** and add your domain. Then follow Render's instructions to point your domain to it. **https** is set up automatically.
6. At **cron-job.org**, create a job that opens this address every evening at 21:00:
   `https://yourdomain.com/cron/daily?key=YOUR_CRON_KEY`
   This sends each shop its daily summary and warns shops whose subscription is ending.

### Paystack (so shops pay you online)

1. Sign up at **paystack.com** and choose Ghana. Paystack will ask for your business registration documents before it allows real (live) payments.
2. Go to **Settings → API Keys & Webhooks**:
   - Copy the **Secret Key** into `PAYSTACK_SECRET_KEY`.
   - Set the **Webhook URL** to `https://yourdomain.com/paystack/webhook`.
3. First test with the **test** secret key (`sk_test_...`), then switch to the live key.

Until Paystack is ready, shops can pay you by **MoMo transfer**. Put your MoMo instructions in **Platform admin → Platform settings**. When a shop pays, click **Activate** on that shop.

## Step 3: Make it an app on phones

No app store is needed at first.

- **Android (Chrome):** open your website and tap **Install app** (or ⋮ → **Add to Home screen**). It opens full-screen like a normal app, and notifications work.
- **iPhone (Safari):** tap **Share → Add to Home Screen**, then open the app from the home screen. Notifications need iOS 16.4 or newer and only work when the app is opened from the home screen.
- After logging in, the owner taps **Turn on notifications** on the dashboard on each phone that should get alerts.

**Later, a Play Store listing:** go to **pwabuilder.com**, enter your website address, and it packages your site as an Android app you can upload to Google Play (one-time Google developer fee). No code changes are needed.

## Step 4: Run your business

- **Prices:** in Platform admin, edit or add plans: price, number of days, maximum staff, maximum items, and the features text shown on your website. Three plans are set up to start with (Starter GH₵ 79, Business GH₵ 149, Business Yearly GH₵ 1,490). Change them to your own prices.
- **Free trial:** set the number of days in Platform settings. The default is 14.
- **When a subscription ends,** the shop can still see its data, but selling and editing stop until it renews. Owners are warned 3 days and 1 day before.
- **Deleting a shop that left:** in Platform admin, click **Delete account** on that shop. First click **Download their data** to keep a copy (or to send it to them). Then type the shop's name and your password, and click **Delete forever**. This removes the shop, all its logins, items, sales, debts and pictures. Their payment records stay in your accounts. Shops with no activity for 30+ days are marked **idle** so you can spot them.
- **Support:** add your WhatsApp number in Platform settings. It appears on the website, login page and billing page.

## Before you launch: checklist

- [ ] Change all test passwords and use a strong `SUPERADMIN_PASSWORD`.
- [ ] Make sure `BASE_URL` starts with `https://`.
- [ ] Have a lawyer review the **Terms** and **Privacy** pages. They are templates.
- [ ] Register with Ghana's **Data Protection Commission**. You will be storing other businesses' customer data.
- [ ] Test a real Paystack payment of a small amount.
- [ ] Turn on database backups in your hosting dashboard. Shop owners can also download their own Excel backup from Settings.
- [ ] Try the whole flow on a cheap Android phone with weak network.

## Ideas for later versions

- **SMS alerts** for owners without smartphones, through Arkesel or Hubtel (paid per SMS).
- **Several branches** under one owner.
- **Password reset by email,** which needs an email-sending service. For now, owners contact you and you reset the password from Platform admin.
- **Wholesale price and singles price** on each item.

## Technical notes (for a developer, if you hire one)

- Python 3.11+, Flask, SQLAlchemy. PostgreSQL in production; SQLite is used automatically for local testing.
- All settings are environment variables; see `.env.example`.
- Start command: `gunicorn -w 3 --preload -b 0.0.0.0:$PORT app:app`
- Uploaded pictures and logos are stored in `DATA_DIR/uploads`, so this must be persistent storage.
- Every database row carries a `shop_id`, and every query is filtered by the logged-in user's shop.
- Protections: CSRF on all forms, hashed passwords, login throttling, and secure cookies when using https.

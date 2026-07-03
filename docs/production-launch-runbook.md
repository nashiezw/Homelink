# HomeLink Production Launch Runbook

This guide is written for someone who has never launched a web platform before. Follow it in order. Do not skip ahead.

Current launch status:

- Domain bought: `homelinkzim.co.zw`
- Production website URL: `https://homelinkzim.co.zw`
- Hosting: not bought/configured yet
- Next thing to do: create the hosting project on Vercel, then connect the domain to it

Important rule: **never paste real secrets into Git, ChatGPT, screenshots, or public docs.** Secrets belong only in your hosting provider's environment-variable screen.

Recommended beginner stack:

- Web hosting: Vercel
- Database: Neon PostgreSQL
- Media uploads: Cloudinary
- Auth: Clerk production instance, or keep current local auth only for a private beta
- Payments: Stripe first, then Paynow when live details are ready
- Monitoring: Vercel logs first, then Sentry

Hosting recommendation for this project:

- Start with **Vercel** because this is a Next.js app and Vercel is the simplest beginner deployment path.
- You do not need to buy separate traditional cPanel hosting for this app.
- You can create the Vercel project first, deploy it, and only upgrade/pay if the plan limits or commercial requirements demand it.

Official docs used as references:

- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel pricing: https://vercel.com/pricing
- Vercel domains and DNS: https://vercel.com/docs/domains
- Neon connection strings: https://neon.com/docs/connect/connect-from-any-app
- Cloudinary docs: https://cloudinary.com/documentation/dev_kickstart
- Stripe webhooks: https://docs.stripe.com/webhooks
- Clerk production deployment: https://clerk.com/docs/guides/development/deployment/production

## Step 0: Confirm What You Already Have

Goal: make sure the domain and final URL are clear before you buy/configure hosting.

You already have:

```text
Domain: homelinkzim.co.zw
Production URL: https://homelinkzim.co.zw
```

Do this now:

1. Open the website where you bought the domain.
   - This may be your registrar, hosting company, or local `.co.zw` domain provider.
2. Log in.
3. Find the page for your domain: `homelinkzim.co.zw`.
4. Look for a menu named one of these:
   - **DNS**
   - **DNS Records**
   - **Manage DNS**
   - **Nameservers**
   - **Zone Editor**
5. Do not change anything yet.
6. Keep that browser tab open. You will use it after Vercel tells you which DNS records to add.

Write this down somewhere safe:

```text
Domain registrar login website: https://www.webdev.co.zw/
Registrar username/email: nashiezw@gmail.com
Registrar support contact: dns@webdev.co.zw / accounts@webdev.co.zw
```

Also open this file while you work:

[production-env-template.md](./production-env-template.md)

You will fill those values inside Vercel, not inside the repo.

Tell Codex:

```text
Step 0 done: I can log in where I bought homelinkzim.co.zw, and I found the DNS area.
```

## Step 1: Create Your Hosting Account On Vercel

Goal: create the hosting account that will run the website.

Recommended choice: **Vercel**.

Why:

- HomeLink is a Next.js website.
- Vercel supports Next.js directly.
- Vercel gives you a temporary URL first, then you connect `homelinkzim.co.zw`.
- You do not need to buy old-style shared hosting for this app.

What you need before starting:

- A GitHub account that contains the HomeLink code repository.
- Access to the email address you will use for Vercel.
- Your domain registrar tab open from Step 0.

You do:

1. Go to https://vercel.com.
2. Click **Sign Up** if you do not have a Vercel account.
3. Click **Continue with GitHub**.
4. If GitHub asks for permission, click **Authorize Vercel**.
5. If Vercel asks what kind of account you want, choose a personal account to start.
6. If Vercel shows a plan page, choose the beginner/free option to start unless you already know you need a paid plan.
7. Finish the signup steps until you land on the Vercel dashboard.

What you should see:

- A Vercel dashboard.
- A button like **Add New...**, **New Project**, or **Import Project**.

Write this down:

```text
Vercel login email: ____________________
Vercel account/team name: ____________________
```

Tell Codex:

```text
Step 1 done: my Vercel account is created.
```

## Step 2: Deploy The Web App On Vercel

Goal: create the production web app shell, even before the real domain is connected.

Screenshot-style guide:

![Vercel environment variable screen](./assets/launch-vercel-env.svg)

You do:

1. In Vercel, click **Add New...**.
2. Click **Project**.
3. Find the HomeLink GitHub repository.
4. If you do not see it:
   - Click **Import Git Repository** or **Adjust GitHub App Permissions**.
   - Choose the GitHub account that owns the HomeLink repo.
   - Allow Vercel to access the HomeLink repo.
   - Return to Vercel and refresh the repo list.
5. Click **Import** beside the HomeLink repository.
6. When Vercel asks for project settings, enter:
   - Project Name: `homelink-zimbabwe`
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: leave blank/default
7. If Vercel asks for **Root Directory**, leave it as the repository root unless the code is inside a subfolder.
   - Important: do not select `apps/api` for the website deployment.
   - If the screen shows `apps/api` as the root directory, click **Edit** and clear it or change it back to the repository root.
   - The website is the root Next.js app. `apps/api` is only the separate backend workspace.
8. Find the **Environment Variables** section before deploying.
9. Add the two core production variables from Step 3.
10. After adding those variables, click **Deploy**.

If Vercel already deployed automatically before you added env values, that is okay. Add the env values in Step 3 and redeploy later.

If deployment fails during `npm install` with:

```text
npm error Invalid Version:
```

Check these first:

1. Confirm Vercel is deploying the repository root, not `apps/api`.
2. Confirm the root `package.json` in GitHub contains:

```text
"name": "homelink-zimbabwe"
"version": "0.1.0"
```

3. Confirm `package-lock.json` has been pushed to GitHub after the latest local changes.
4. In Vercel, open the failed project -> **Settings** -> **General**.
5. Find **Root Directory**.
6. If it says `apps/api`, click **Edit** and change it back to the repository root.
7. If the root directory is already correct and the error still happens, change **Install Command** to:

```text
npm install --legacy-peer-deps
```

8. Redeploy.

What you should see after deploy:

- A deployment status page.
- It may say **Building** for a few minutes.
- When done, it should say **Ready**.
- Vercel will give you a temporary URL like:

```text
https://homelink-zimbabwe.vercel.app
```

That temporary URL is only for testing. The real public URL will still be:

```text
https://homelinkzim.co.zw
```

Tell Codex:

```text
Step 2 done: Vercel project is created and I have a temporary Vercel URL.
```

## Step 3: Add Core Vercel Environment Variables

Goal: make production mode fail closed instead of using local/sandbox defaults.

You do:

1. In Vercel, open your HomeLink project.
2. Click **Settings**.
3. Click **Environment Variables**.
4. Add these variables one by one.
5. For each variable:
   - Name goes in the **Name** box.
   - Value goes in the **Value** box.
   - Select **Production**.
   - Click **Save**.

Enter:

```text
NEXT_PUBLIC_APP_URL=https://homelinkzim.co.zw
HOMELINK_STRICT_PRODUCTION=true
HOMELINK_MAINTENANCE_MODE=false
```

What each value means:

```text
NEXT_PUBLIC_APP_URL
This tells HomeLink what its real public website URL is.

HOMELINK_STRICT_PRODUCTION
This blocks unsafe local/demo behavior in production.

HOMELINK_MAINTENANCE_MODE
Leave this as false. Set it to true only when you intentionally want the public site to show the maintenance page.
```

Do not enter Cloudinary, database, payment, or auth values yet unless you already have them.

Tell Codex:

```text
Step 3 done: I added NEXT_PUBLIC_APP_URL and HOMELINK_STRICT_PRODUCTION in Vercel.
```

## Step 4: Create The Production PostgreSQL Database

Goal: create durable storage for the platform.

Screenshot-style guide:

![Neon connection string guide](./assets/launch-neon-connection.svg)

You do:

1. Go to https://neon.tech.
2. Click **Sign Up** or **Log In**.
3. Click **New Project**.
4. Project name: `homelink-production`
5. Database name: `homelink`
6. Region: choose the closest available region to Zimbabwe/Southern Africa.
7. Click **Create Project**.
8. On the project dashboard, find **Connection string**.
9. Choose:
   - Branch: `main`
   - Database: `homelink`
   - Role/user: default owner role
10. Copy the connection string. It should look like:

```text
postgresql://username:password@host.neon.tech/homelink?sslmode=require
```

Now add it to Vercel:

1. Go back to Vercel.
2. Open HomeLink project.
3. Click **Settings**.
4. Click **Environment Variables**.
5. Add:

```text
DATABASE_URL=postgresql://username:password@host.neon.tech/homelink?sslmode=require
```

6. Environment: **Production**
7. Click **Save**.

Tell Codex:

```text
I created Neon Postgres and added DATABASE_URL to Vercel.
```

Codex does:

1. Helps you run:

```powershell
npx.cmd prisma validate --schema prisma\schema.prisma
```

2. When you are ready and the production `DATABASE_URL` is available in your terminal, helps you apply:

```powershell
npx.cmd prisma db push --schema prisma\schema.prisma
```

Important: do not paste the real database URL into chat. Just say whether it is set.

## Step 5: Configure Cloudinary For Media Uploads

Goal: photos, videos, and documents are stored outside the web server.

Screenshot-style guide:

![Cloudinary credentials guide](./assets/launch-cloudinary-keys.svg)

You do:

1. Go to https://cloudinary.com.
2. Click **Sign Up** or **Log In**.
3. Open the Cloudinary **Console**.
4. Find **Product Environment Credentials** or **API Keys**.
5. Copy these three values:
   - Cloud name
   - API key
   - API secret
6. Go to Vercel -> HomeLink project -> **Settings** -> **Environment Variables**.
7. Add:

```text
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

8. Environment: **Production**
9. Click **Save** for each.

Tell Codex:

```text
I added Cloudinary cloud name, API key, and API secret in Vercel.
```

Codex does:

1. Verifies strict production will return signed Cloudinary upload parameters.
2. Verifies local filesystem uploads are blocked in strict production.

## Step 6: Configure Stripe Payments

Goal: online payment webhooks cannot be faked.

Launch decision: **skip Stripe for now**. HomeLink will launch with manual payments only. Do not add `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` until the Stripe account is approved and you are ready to accept live online payments.

For this launch, confirm in the HomeLink admin payment settings:

```text
Stripe enabled: off
Default payment method: bank_transfer
Manual payment methods: bank_transfer, zipit, cash
```

Tell Codex:

```text
Step 6 skipped: Stripe is not ready and will stay disabled for launch.
```

Future Stripe setup:

Screenshot-style guide:

![Stripe webhook guide](./assets/launch-stripe-webhook.svg)

You do:

1. Go to https://dashboard.stripe.com.
2. Switch to **Live mode** only when your Stripe account is approved.
3. Click **Developers**.
4. Click **API keys**.
5. Copy the **Secret key**.
6. Add it in Vercel:

```text
STRIPE_SECRET_KEY=sk_live_...
```

7. Go back to Stripe.
8. Click **Developers**.
9. Click **Webhooks**.
10. Click **Add endpoint**.
11. Endpoint URL:

```text
https://homelinkzim.co.zw/api/v1/payments/webhooks/stripe
```

12. Select payment/checkout events you will use.
13. Click **Add endpoint**.
14. Open the endpoint you just created.
15. Click **Reveal signing secret**.
16. Copy the value that starts with `whsec_`.
17. Add it in Vercel:

```text
STRIPE_WEBHOOK_SECRET=whsec_...
```

Tell Codex:

```text
I added Stripe secret key and webhook secret in Vercel.
```

Codex does:

1. Tests that unsigned Stripe webhook calls are rejected in strict production.
2. Tests that sandbox auto-completion is blocked in strict production.

## Step 7: Configure Paynow

Goal: enable Zimbabwe payment flow only when real Paynow credentials are ready.

Launch decision: **skip Paynow for now**. HomeLink will launch with manual payments only. Do not add `PAYNOW_INTEGRATION_ID` or `PAYNOW_INTEGRATION_KEY` until the Paynow merchant integration is ready.

For this launch, confirm in the HomeLink admin payment settings:

```text
Paynow enabled: off
Default payment method: bank_transfer
Manual payment methods: bank_transfer, zipit, cash
```

Tell Codex:

```text
Step 7 skipped: Paynow is not ready and will stay disabled for launch.
```

Future Paynow setup:

You do:

1. Log in to your Paynow merchant dashboard.
2. Create or open the HomeLink integration.
3. Copy:
   - Integration ID
   - Integration key
4. In the Paynow dashboard, set the result/webhook URL if Paynow asks for one:

```text
https://homelinkzim.co.zw/api/v1/payments/webhooks/paynow
```

5. Set the return/callback URL if Paynow asks for one:

```text
https://homelinkzim.co.zw/api/v1/payments/callback/paynow
```

6. Add these in Vercel:

```text
PAYNOW_INTEGRATION_ID=your_id
PAYNOW_INTEGRATION_KEY=your_key
```

Tell Codex:

```text
I added Paynow integration ID and key in Vercel.
```

Codex does:

1. Confirms the HomeLink gateway settings match the configured provider.
2. Keeps Paynow disabled if credentials are not ready.

## Step 8: Choose Production Auth

Goal: decide how real users sign in.

Recommended beginner choice: Clerk.

Screenshot-style guide:

![Clerk production instance guide](./assets/launch-clerk-production.svg)

You do:

1. Go to https://dashboard.clerk.com.
2. Sign up or log in.
3. Create a Clerk app if you do not have one.
4. At the top of the Clerk dashboard, click the instance dropdown that says **Development**.
5. Click **Create production instance**.
6. Follow Clerk's prompts.
7. Open the production instance.
8. Go to **API Keys**.
9. Copy:
   - Publishable key, usually starts with `pk_live_`
   - Secret key, usually starts with `sk_live_`
10. Add these in Vercel:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

11. In Clerk, add your production domain to allowed origins/redirect URLs if prompted.

Tell Codex:

```text
I created the Clerk production instance and added the keys in Vercel.
```

Codex does:

1. Wires provider-backed auth if we decide to fully replace the current local session flow.
2. Or documents that current local auth is accepted only for a private beta.

Important: right now the app still uses local session auth. That can work for a controlled beta, but Clerk/Firebase integration is the safer public-launch path.

## Step 9: Configure Email

Goal: users and admins receive important messages.

Beginner option: Brevo, Resend, SendGrid, or any SMTP provider.

Current launch choice:

```text
Email provider: SMTP provider chosen by owner
Sending domain: homelinkzim.co.zw
Recommended sender: noreply@homelinkzim.co.zw or support@homelinkzim.co.zw
```

You do:

1. Create an account with your chosen email provider.
2. Verify your sending domain if the provider asks.
3. Find SMTP settings:
   - SMTP host
   - SMTP port
   - SMTP username
   - SMTP password
4. Do not paste the SMTP password into chat, Git, screenshots, or docs.

Now enter the values in HomeLink:

1. Open the latest Vercel temporary URL or production URL.
2. Sign in as an admin.
3. Open **Dashboard -> Admin**.
4. Open **Settings**.
5. Click the **Integrations** tab.
6. Find these fields:

```text
smtpHost
smtpPort
smtpUser
smtpPass
```

7. Enter your SMTP values:

```text
smtpHost = your SMTP host
smtpPort = your SMTP port, usually 587 or 465
smtpUser = your SMTP username
smtpPass = your SMTP password or API key
```

8. Click **Save**.
9. Click **Test SMTP**.
10. Send the test to an email address you can open.
11. Confirm the test email arrives.

If your provider is Resend, common SMTP values are:

```text
smtpHost = smtp.resend.com
smtpPort = 587
smtpUser = resend
smtpPass = your Resend API key
```

If the test fails:

1. Confirm the domain verification records are added in Webdev DNS.
2. Confirm the SMTP password/API key is copied exactly.
3. Try port `587` first.
4. If your provider specifically says to use SSL/SMTPS, try port `465`.

Tell Codex:

```text
I configured SMTP and the test email passed.
```

Codex does:

1. Checks enquiry/payment notification flows.
2. Adds provider-specific notes if your SMTP provider needs special ports or DNS records.

## Step 10: Rotate Demo And Seed Passwords

Goal: no known demo password works in production.

You do:

1. Generate five strong passwords in a password manager.
2. In Vercel -> HomeLink -> **Settings** -> **Environment Variables**, add:

```text
SEED_STANDARD_PASSWORD=strong_unique_value
SEED_TINASHE_PASSWORD=strong_unique_value
SEED_LANDLORD_PASSWORD=strong_unique_value
SEED_ADMIN_PASSWORD=strong_unique_value
SEED_CONSULTANT_PASSWORD=strong_unique_value
```

3. Do not paste these into chat.
4. Store them in your password manager.

Tell Codex:

```text
I rotated all seed passwords in Vercel.
```

Codex does:

1. Runs/uses `npm run check:production` to confirm default seed passwords are not present.
2. Helps remove public demo credentials from launch-facing docs.

## Step 11: Add Domain To Vercel

Goal: make the real domain point to the Vercel deployment.

Do this only after:

- Vercel project exists.
- At least one Vercel deployment says **Ready**.
- You can log in to the place where you bought `homelinkzim.co.zw`.

You do:

1. In Vercel, open HomeLink project.
2. Click **Settings**.
3. Click **Domains**.
4. In the domain box, type:

```text
homelinkzim.co.zw
```

5. Click **Add**.
6. If Vercel asks which environment this domain should point to, choose **Production**.
7. Vercel will show DNS instructions.
8. Do not guess the DNS records. Copy exactly what Vercel shows.

Most likely Vercel will ask for one or both of these:

```text
Type: A
Name/Host: @
Value/Points to: 76.76.21.21
```

```text
Type: CNAME
Name/Host: www
Value/Points to: cname.vercel-dns.com
```

Important: use the exact values Vercel shows on your screen. If Vercel shows different values, use Vercel's values.

Now add the DNS records where you bought the domain:

1. Open your domain registrar tab.
2. Open the domain: `homelinkzim.co.zw`.
3. Click **DNS**, **DNS Records**, **Manage DNS**, or **Zone Editor**.
4. Look for existing records with:
   - Host/name: `@`
   - Host/name: `www`
5. If there are old website records for `@` or `www`, replace them with the records Vercel gave you.
6. If there are no records, click **Add Record**.
7. Add the `A` record exactly as Vercel shows it.
8. Add the `CNAME` record exactly as Vercel shows it.
9. Click **Save**, **Update**, or **Add Record**.
10. Return to Vercel.
11. Click **Refresh**, **Check Again**, or wait for Vercel to re-check automatically.

What success looks like:

- In Vercel, `homelinkzim.co.zw` shows **Valid Configuration**, **Verified**, or a green check.
- Visiting `https://homelinkzim.co.zw` opens the HomeLink website.
- The browser shows a lock icon, meaning HTTPS/SSL is active.

If Vercel says DNS is not ready yet, wait. DNS can take minutes or hours.

If it still fails after several hours:

1. Take a screenshot of the DNS records in your registrar.
2. Take a screenshot of the Vercel domain error.
3. Do not reveal passwords or secret keys in the screenshots.
4. Ask Codex to compare the DNS records with the Vercel instructions.

Tell Codex:

```text
Step 11 done: homelinkzim.co.zw is added in Vercel and DNS is verified.
```

## Step 12: Set Up Monitoring And Backups

Goal: know when the platform breaks and be able to recover data.

You do:

1. In Vercel, open HomeLink project.
2. Click **Logs** and confirm you can see requests/errors.
3. In Neon, open your project.
4. Find backup/restore settings for your plan.
5. In Cloudinary, confirm uploaded media is retained.
6. Optional but recommended: create a Sentry account at https://sentry.io.

Codex does:

1. Adds Sentry wiring if you choose to install it.
2. Documents your backup and restore process in `docs/operations.md`.

## Step 13: Redeploy Production

Goal: force Vercel to deploy with all environment variables.

You do:

1. In Vercel, open HomeLink project.
2. Click **Deployments**.
3. Open the latest deployment.
4. Click the three-dot menu.
5. Click **Redeploy**.
6. Make sure it uses the production environment.
7. Wait until the deployment says **Ready**.

Tell Codex:

```text
Vercel redeploy is ready.
```

## Step 14: Final Checks

Screenshot-style guide:

![Final launch checks](./assets/launch-final-checks.svg)

Codex does locally:

```powershell
npm.cmd run check:content
npm.cmd run typecheck
npm.cmd run lint
npx.cmd prisma validate --schema prisma\schema.prisma
npx.cmd prisma validate --schema prisma\settings.prisma
npm.cmd run build
```

You do in the production environment:

1. Run the production readiness check with the real env values available:

```powershell
npm.cmd run check:production
```

2. Smoke test the live URL:

```powershell
$env:BASE_URL="https://homelinkzim.co.zw"
node scripts\smoke-test.mjs
```

3. Manually test:
   - Visit the homepage.
   - Search for a listing.
   - Open a listing detail page.
   - Sign in.
   - Send an enquiry.
   - Save a listing.
   - Create/edit a landlord listing.
   - Upload listing media.
   - Start checkout.
   - Open admin dashboard.

Launch only when all of these pass.

## What You Should Tell Codex After Each Step

Copy and paste one of these messages as you complete each step:

```text
Step 0 done: I can log in where I bought homelinkzim.co.zw, and I found the DNS area.
Step 1 done: my Vercel account is created.
Step 2 done: Vercel project is created and I have a temporary Vercel URL.
Step 3 done: I added NEXT_PUBLIC_APP_URL and HOMELINK_STRICT_PRODUCTION in Vercel.
Step 4 done: Neon database is created and DATABASE_URL is set.
Step 5 done: Cloudinary variables are set.
Step 6 done: Stripe variables and webhook are set.
Step 7 done: Paynow variables are set, or Paynow is disabled for launch.
Step 8 done: Clerk production keys are set, or local auth is accepted for beta.
Step 9 done: SMTP is configured and test email passed.
Step 10 done: seed passwords are rotated.
Step 11 done: homelinkzim.co.zw is added in Vercel and DNS is verified.
Step 12 done: logs/backups/monitoring are confirmed.
Step 13 done: production redeploy is ready.
Run final checks.
```

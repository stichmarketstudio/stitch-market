# Stitch Market — permanent Render deployment

Arena previews and anonymous tunnels are temporary. This deployment produces a stable HTTPS URL that works on mobile.

## What is ready

- `render.yaml` — Render Blueprint configuration
- `Dockerfile` — portable container deployment
- `.env.example` — production environment variables
- Health check: `/api/health`
- Production build and start commands
- Automatically generated `JWT_SECRET` on Render

## Step 1 — put the project on GitHub

1. Download `stitch-market-deployment.zip` from Arena.
2. Extract it on a computer.
3. Sign in to [GitHub](https://github.com) and create a new repository named `stitch-market`.
4. Upload all extracted project files and folders to the repository, preserving the folder structure.
5. Commit the files to the `main` branch.

> GitHub folder upload is much easier on a computer. If using only a phone, open GitHub in the browser, enable **Desktop site**, and use **Add file → Upload files** after extracting the ZIP with the phone's file manager.

## Step 2 — deploy with Render Blueprint

1. Sign in to [Render](https://dashboard.render.com) using GitHub.
2. Choose **New → Blueprint**.
3. Connect the `stitch-market` GitHub repository.
4. Render detects `render.yaml`.
5. Select **Apply** and wait for the build to finish.
6. Open the generated `https://stitch-market-app-....onrender.com` URL.

## Step 3 — sign in

Creator demo account:

- Email: `maya@stitch.market`
- Password: `demo123`

Buyer demo account:

- Email: `noor@stitch.market`
- Password: `demo123`

## Free-demo limitations

This free review deployment uses the portable JSON datastore and test checkout:

- Data can reset after a redeploy or free-instance replacement.
- Checkout grants a test entitlement; no real card is charged.
- Free Render services may sleep when inactive and take roughly a minute to wake.

## Production launch upgrade

Before accepting real customers:

1. Replace JSON storage with managed PostgreSQL.
2. Store uploaded images in S3 or Cloudflare R2.
3. Add Stripe Checkout and signature-verified webhooks.
4. Configure transactional email and password reset.
5. Add a custom domain, privacy policy, terms and refund policy.
6. Back up the database and enable monitoring.

# Stitch Market

A full-stack creator studio and marketplace for professional sewing and crochet pattern PDFs.

## Demo

The live preview is running in Arena.

- **Creator:** `maya@stitch.market`
- **Password:** `demo123`
- The sign-in page also has an **Open demo workspace** button.

A second seeded account is available for testing buyer/seller flows:

- **Buyer:** `noor@stitch.market`
- **Password:** `demo123`

## Included

- JWT account registration/login and creator profiles
- Creator dashboard and persisted pattern library
- Shared visual editor with autosave, preview and cover uploads
- Sewing size charts, measurements, seam allowance, piece drafting, labels, markings, true-scale A4/Letter tiles, assembly directions and calibration marks
- Crochet yarn/gauge data, abbreviation tables, row/round instructions, stitch counts and symbol diagrams
- Server-generated professional PDFs in A4 and US Letter
- Marketplace search, filters, product details, featured items, favorites and verified reviews
- Test-mode checkout with protected buyer entitlements and PDF downloads
- Purchases, seller revenue dashboard, drafts/published views and collections
- Responsive desktop/mobile interface

## Local development

```bash
npm install
npm run dev
```

The one-process Vite/Express development server listens on `0.0.0.0:5173`.

## Validation

```bash
npm test       # 11 API/integration tests
npm run build  # production client build
```

## Production notes

This implementation is a deployment-ready product MVP with two intentionally replaceable adapters:

1. `server/store.js` uses an atomic JSON datastore for portability. Replace the store repository with PostgreSQL for multi-instance production hosting.
2. `POST /api/orders` is explicitly in test payment mode. Replace immediate settlement with a Stripe/PayPal payment intent and a signature-verified webhook while retaining the existing order entitlement and protected download routes.

Set a strong `JWT_SECRET` in production. Uploaded covers are stored as data URLs in the portable datastore; object storage (S3/R2) is recommended at scale.

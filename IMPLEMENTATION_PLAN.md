# Stitch Market — implementation plan

## 1. Requirements inspection

### Product goal
A creator-first workspace for producing professional sewing and crochet pattern PDFs, managing a pattern library, and selling downloadable patterns.

### User journeys
1. **Creator account** — sign up/sign in, manage a profile, view creator dashboard.
2. **Create** — choose Sewing or Crochet, enter shared metadata, use craft-specific tools, upload cover/reference images, save drafts, preview, publish, and export.
3. **Organize** — browse drafts/published work, search, favorite, and assign collections.
4. **Sell** — set a price, publish to marketplace, review orders and sales metrics.
5. **Buy** — browse/filter marketplace, inspect products, leave ratings/reviews, purchase, and securely download purchased PDFs.

### Functional boundaries
- Real authentication and API authorization are included.
- Data persists in a local JSON datastore for this portable MVP. Its repository boundary is intentionally isolated so PostgreSQL can replace it without changing the UI contract.
- Checkout runs in an explicit **test payment mode** because no payment-provider credentials were supplied. Order entitlements and protected downloads are fully implemented; a production deployment should replace only the payment adapter/webhook step with Stripe/PayPal.
- PDF generation is server-side and supports A4/US Letter, cover, metadata, size/material information, instructions, craft details, page numbers, and copyright.
- Pattern-piece drafting is a practical visual/printable piece builder (dimensions, seam allowance, labels, markings, tiled page estimate and assembly guide), not an industrial CAD/graded-pattern engine.
- Crochet diagrams are generated as editable symbol-grid diagrams, not freeform vector charting.

## 2. Architecture

- **Client:** React + Vite, responsive CSS design system, lightweight route/state shell.
- **API:** Express REST API, JWT authentication, bcrypt password hashing.
- **Persistence:** atomic JSON datastore with seeded demo content.
- **Documents:** PDFKit server-side generation and protected purchase downloads.
- **Development:** one Node process mounts Vite middleware and API on one preview-safe port.

## 3. Delivery stages

### Stage A — foundation
- Project/tooling, datastore, seed data, API error handling.
- Registration, login, session restore, profile endpoints.

### Stage B — creator workflow
- Dashboard and searchable pattern library.
- New-pattern flow and full visual editor.
- Shared, sewing-specific, and crochet-specific fields.
- Autosave, draft/publish lifecycle, cover upload, preview.

### Stage C — export
- A4/US Letter server-side PDF rendering.
- Pattern detail sections, piece/diagram pages, page numbering, copyright.
- Protected creator and buyer download routes.

### Stage D — commerce and discovery
- Marketplace cards, categories, filters, product details.
- Test checkout, entitlement, order history.
- Seller sales dashboard, ratings/reviews, favorites and collections.

### Stage E — validation
- API integration tests for auth, creation/update, publish, marketplace, purchase authorization, and PDF export.
- Production build check and responsive/live-preview smoke test.

## 4. Acceptance checklist

- [x] User can register/login and edit profile.
- [x] User can create both pattern types and save/edit drafts.
- [x] Craft-specific sections and visual previews work.
- [x] Autosave provides visible status.
- [x] Published, priced patterns appear in marketplace.
- [x] A4 and Letter PDFs download and start with a valid PDF signature.
- [x] Buyers receive download entitlement after test checkout.
- [x] Non-buyers cannot access protected paid downloads.
- [x] Library search/status/category/favorites/collections work.
- [x] Marketplace search/category/difficulty filters and reviews work.
- [x] Sales/order dashboards work.
- [x] Major API paths are covered by automated tests.

## 5. Validation record

Completed on 2026-08-17:

- `npm test` — **11/11 passing**: health, login/session, registration validation, pattern create/update/publish, marketplace discovery, owner A4 PDF, unauthorized paid download, test checkout, buyer Letter PDF, seller metrics, reviews/favorites, and profile/dashboard.
- `npm run build` — **passed** with a production Vite bundle.
- Live smoke test — development server and `/api/health` both responding on the preview port.
- PDF output includes actual-size tiled sewing pages with registration marks and a 2 cm calibration square, plus A4/Letter document layouts.

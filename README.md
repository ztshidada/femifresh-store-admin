# FemiFresh Store + Admin v1

This repository contains the FemiFresh platform:

- Public website/storefront
- Cart and checkout pages
- Affiliate/distributor dashboard
- Role-based admin panel
- Products management
- Orders management
- Manual proof-of-payment workflow
- Commission, payout, joining-fee and fulfilment operations

## Run locally

```bash
cd femifresh-store-admin-v1
npm install
cp .env.example .env
npm run dev
```

Open:

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin/login.html

## Admin accounts

Admin users are stored in `data/users.json` locally, or in the configured remote storage on production. Demo admin users are no longer printed or created by default. For local-only development, set `ALLOW_DEMO_SEED=true` before running `npm run seed`.

## Rebuild migration

Preview the product/settings/data-store migration:

```bash
npm run migrate:preview
```

Apply it after reviewing the report:

```bash
npm run migrate:apply
```

## Admin role rules

Super Admin can access everything.

Orders Admin can only:

- View dashboard
- View orders
- Update order payment status
- Update order fulfillment status
- Add tracking numbers
- Approve R100 joining fees

Orders Admin cannot:

- Manage products
- Create admins
- View sensitive settings/logs
- Change payment keys

## Payment

Manual payment is the active checkout method. Customers and affiliates receive bank/WhatsApp proof-of-payment instructions after checkout or signup. The Yoco webhook route only logs disabled events until online payments are intentionally re-enabled.

## Emails

If SMTP is not set in `.env`, emails are logged into `data/emailLogs.json` so testing does not break.

## Next zip

The next separate zip should be the FemiFresh affiliate/distributor system.

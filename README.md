# FemiFresh Store + Admin v1

This zip contains the first foundation for FemiFresh:

- Public website/storefront
- Cart and checkout pages
- Website admin panel
- Role-based admin access
- Products management
- Delivery methods
- Orders management
- Email logging/sending structure
- Yoco webhook placeholder route

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

## Demo admin accounts

Super Admin:

```text
admin@femifresh.local
Admin@12345
```

Orders Admin:

```text
orders@femifresh.local
Orders@12345
```

## Admin role rules

Super Admin can access everything.

Orders Admin can only:

- View dashboard
- View orders
- Update order payment status
- Update order fulfillment status
- Print orders

Orders Admin cannot:

- Manage products
- Manage delivery methods
- Create admins
- View sensitive settings/logs
- Change payment keys

## Yoco

The route is prepared:

```text
POST /api/webhooks/yoco
```

The live checkout API should be connected when the real Yoco secret key is ready.

## Emails

If SMTP is not set in `.env`, emails are logged into `data/emailLogs.json` so testing does not break.

## Next zip

The next separate zip should be the FemiFresh affiliate/distributor system.

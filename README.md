This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
# or
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.
## Invoices Feature & External Backend

The `/invoices` and `/invoices/new` pages are frontend-only; they call an external API backend (the separate `server` project) which handles:

- Database persistence (Prisma in backend)
- QuickBooks OAuth2 and token storage
- Optional QuickBooks invoice sync (assigns `quickbooksId`)

### Environment Variables

Add to `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Recognized (in priority order): `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_API_URL`, `API_URL`.

After editing env vars, restart `npm run dev` so Next.js picks them up.

### Required Backend Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/invoices | List invoices |
| POST | /api/invoices | Create invoice (JSON body) |
| GET | /api/quickbooks/start | Begin QuickBooks auth |
| GET | /api/quickbooks/callback | Handle QuickBooks redirect |

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to parse URL from /api/invoices` | Missing API base env var | Set `NEXT_PUBLIC_API_URL` and restart |
| `API base must be absolute` | Env var missing protocol | Use `http://...` |
| `Request failed 500` | Backend threw an error | Check backend logs |

### QuickBooks Connection (Optional UI Enhancement)

To display connection state or realm ID, port a `useRealmId` hook that reads and stores `realmId` after the QuickBooks callback, then include it in the create invoice POST body.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

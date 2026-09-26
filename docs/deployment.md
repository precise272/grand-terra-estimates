# Authentication and hosting

Grand Terra Estimates supports its own email/password accounts and long-lived, revocable, HttpOnly sessions. Existing ChatGPT sign-in remains available on the Sites hostname for earlier users and data. App account data is keyed separately from ChatGPT accounts.

## Google sign-in

Create a Google OAuth **Web application** client. Configure the authorized redirect URI exactly as:

`https://YOUR_HOST/api/auth/google/callback`

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as server secrets on the deployment host. The Google button appears only when both are configured. Google sign-in uses an authorization code and a short-lived state cookie. Accounts with the same email created through another sign-in method are not automatically merged.

## Email delivery

Email/password registration currently creates accounts without verifying mailbox ownership. Password changes are available when signed in, but forgotten-password recovery requires an email delivery service. Add email verification and recovery before treating open registration as a final production launch. Do not put email service keys in source control.

## Moving hosts

The UI and account flows do not require ChatGPT sign-in. The current persistence layer uses Cloudflare D1 and R2 bindings, so moving to another host requires corresponding database and object-storage adapters plus migration of data and secrets. Serve over HTTPS so secure session cookies work. Run all Drizzle migrations in order and configure a Google OAuth client for the final hostname.

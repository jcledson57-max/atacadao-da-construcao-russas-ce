<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Quotes are created only via the `create_quote` SECURITY DEFINER RPC, which reads prices from `products` and snapshots them into `quote_items`; never trust client prices.
- Team roles live only in `user_roles`; `has_role` also checks profile blocked/deleted state so old tokens cannot bypass revocation. Signup creates profiles but never assigns privileges after initial bootstrap.
- Store images live in the private `store-images` bucket; DB stores `storage:<path>` and the client resolves signed URLs in `src/lib/store.ts`. Visitors can read only active-product images and the current logo; active admins can preview all images, preventing access to unpublished/orphaned uploads.
- PDF generation is client-side (jspdf + jspdf-autotable) in `src/lib/quote-output.ts`, so it works on any device without server runtime constraints.
- GitHub Pages build is opt-in via `GITHUB_PAGES=true` (static SPA, base from `PAGES_BASE`, output `dist/client`); default build stays the Lovable/Cloudflare one so preview and publish are unaffected.
- Site-relative image paths go through `withBase()` in `src/lib/store.ts` so they work under a subfolder base path.
- Quote retention uses RLS-protected exact counts and paginated CSV reads; cleanup runs only through the admin-validated delete_old_quotes RPC, which checks the confirmed count and records audit history in the same transaction as cascading deletion.
- Account administration uses authenticated server functions with an RLS role check before loading the privileged client; `manage_team_account` serializes role/status changes and database triggers guard the last active administrator.
- Deleted team accounts are archived and banned rather than physically removed so quote access audit identities remain intact. Quote consultation/print requests append to `quote_access_events` through an authorized RPC.
- `/usuarios` has an admin-only gate; the existing `/admin` surface renders quote-only controls for attendants. Privileged account functions require the hosted TanStack runtime, not the optional static GitHub Pages build.
- Team RPC validates transport responses before TanStack decoding and never retries mutations automatically, preventing opaque invariant errors and accidental duplicate account creation.
- Static builds explicitly disable team RPCs and link to the hosted users page without transferring credentials, because GitHub Pages cannot execute privileged account operations.

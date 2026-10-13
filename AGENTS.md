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
- Admin access = row in `user_roles` with role `admin`; the first signed-up user is auto-promoted by trigger. All writes are guarded by RLS with `has_role`.
- Store images live in the private `store-images` bucket (public buckets are blocked); DB stores `storage:<path>` and the client resolves signed URLs in `src/lib/store.ts`.
- PDF generation is client-side (jspdf + jspdf-autotable) in `src/lib/quote-output.ts`, so it works on any device without server runtime constraints.

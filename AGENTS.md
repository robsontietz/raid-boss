<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- All panel UI text lives in `src/lib/i18n/messages.ts` (Portuguese `pt`, English `en` typed as `Messages`) and is read via `useI18n()`; never hardcode visible text in components. Why: the header flag switch must flip every panel text at once.
- Messages produced by the Windows agent (logs, errors, test messages) are shown as sent; only the agent's default state/color names are translated client-side via `localizeState`/`colorName`. Why: the agent runs on the user's PC and is not language-aware.
- The in-game RAID list always shows all its names; the agent reads every row and maps each monitored boss to its real row via `RAID_LIST` (keep `agent/guardian/bosses.py` and `src/lib/bosses.ts` identical). Why: monitored bosses are not contiguous, so a partial region cannot be calibrated.
- When the agent changes, bump `VERSION` in `agent/guardian/__init__.py`, set `AGENT_MIN_VERSION` in `src/lib/bosses.ts` to match, and rebuild the ZIP with `scripts/build_agent_zip.py`. Why: the dashboard tells users with an older agent to download again.

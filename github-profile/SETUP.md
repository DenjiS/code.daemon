# code.daemon on your GitHub profile

An Action that redraws your pet every 6 hours from your GitHub commits, CI results and releases,
and saves it as an animated `code-daemon/pet.svg` in your profile repo.

## Install

1. Open your profile repo, `github.com/<you>/<you>`. (It's the repo whose README shows on your profile. Create it if you don't have one.)
2. Copy the `.github` folder from this bundle into the repo root. You get:
   - `.github/workflows/code-daemon.yml`
   - `.github/code-daemon/render.cjs`
   - `.github/code-daemon/pet-core.js`
   - `.github/code-daemon/themes/` (Demonic and Succubus sprites)
3. Add this to your `README.md` wherever you want the pet:

   ```html
   <p align="center"><img src="code-daemon/pet.svg" alt="dmn, my code.daemon pet" width="640"></p>
   ```

4. Commit and push. The push runs the workflow once. You can also run it from **Actions → code.daemon pet → Run workflow**.

## Private repos (optional)

Without a token the workflow only sees public activity. To include private repos and their CI:

1. Create a classic token with `repo` and `read:user`:
   https://github.com/settings/tokens/new?scopes=repo,read:user&description=code.daemon%20profile
2. In the profile repo: **Settings → Secrets and variables → Actions → New repository secret**, name `PET_TOKEN`.
3. Add one more secret, `PET_SALT`, with any long random string (a password generator is fine). Keep it once set.

Private repo names never appear on the card or in `code-daemon/state.json`: there they are stored as
`gh:private:<hash>`, keyed with `PET_SALT` (or with `PET_TOKEN` if `PET_SALT` is missing; then a new token
makes old private entries look like new repos). A failing private build shows as "CI failing in a private repo".

Versions before this one wrote private repo names into `state.json` in plain text. The next run rewrites the
file without them, but older commits of the profile repo still have them. To remove them from history, run
`git filter-repo --path code-daemon/state.json --invert-paths` on a fresh clone and force-push, or recreate the repo.
Either way the saved state goes too, and the next run rebuilds the pet from the last year of commits.

## Settings

Edit `.github/workflows/code-daemon.yml`:

- `PET_NAME`: the name on the card.
- `PET_THEME`: `classic`, `demonic` or `succubus`. Same themes as the widget's Setup tab.
- `TZ`: your time zone. It decides which sessions count as late nights and where days start for streaks.
- `cron`: how often it redraws. Each run that changes the pet makes one commit by github-actions[bot]; those commits don't count toward your XP.

## What it reads

- Repos you committed to in the last year, plus repos you own that were pushed in that time.
- Your commits on up to 20 recently updated branches per repo (up to 3,000 per branch per run).
- The CI status of the branch you pushed last in each repo, and recent releases.
- The first run reads a year. Later runs re-read the last 14 days (from the start of a session, so none is cut in two) and keep older sessions in `code-daemon/state.json`.

The profile pet and the desktop widget use the same engine, but each keeps its own save, so their numbers can differ slightly.

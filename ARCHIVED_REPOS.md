# Archived and frozen RuleOak repositories

The following repositories are outside the supported public launch surface for this sprint unless they are explicitly brought back and relicensed/reviewed:

- `ruleoak-adapters-ts`
- `ruleoak-py`
- `ruleoak-openclaw-adapter`
- `ruleoak-agentic-skills`
- `SafeDesk`
- `Home Evidence`
- `Creator Proof`
- `Travel Proof`
- `Freelancer Proof`
- `Personal Knowledge Proof`

Reason: this sprint tests a narrower wedge: RuleOak Core + Protocol + CLI as an Agent Action Control Plane.

## Publishing rule for archived repositories

Do **not** silently leave an old adapter repository online with ambiguous inherited or AGPL-adjacent licensing while the active RuleOak project presents itself as permissive.

Use one of these two paths before making an archived repository public:

### Preferred path: relicense then archive

Use this when Sun Shaobin owns all required rights and no third-party license blocks relicensing.

1. Replace the repository `LICENSE` with Apache-2.0.
2. Add a top README banner:

```md
> **ARCHIVED — unmaintained legacy RuleOak adapter.**
> This repository is no longer part of the supported RuleOak public launch surface.
> It is preserved for historical reference only. Current supported packages are
> `@ruleoak/protocol`, `@ruleoak/core`, and `@ruleoak/cli`.
```

3. Add `TRADEMARK.md` so forks cannot present themselves as official RuleOak.
4. Commit, tag the archive point, then use GitHub's archive function.

### Conservative path: keep legacy license but add a warning banner

Use this when rights are unclear, third-party materials exist, or you are not comfortable relicensing yet.

1. Keep the existing license exactly as-is.
2. Add this top README banner:

```md
> **ARCHIVED — unmaintained legacy RuleOak repository.**
> This repository is preserved for historical reference only. It is not part of
> the supported RuleOak public launch surface. Its license is the license shown
> in this repository as of the archive date. Do not infer that it follows the
> active RuleOak monorepo licensing model.
```

3. Add `TRADEMARK.md` if possible.
4. Commit, tag the archive point, then use GitHub's archive function.

## GitHub archive operation

After the final archive commit is pushed:

1. Open the repository on GitHub.
2. Go to **Settings**.
3. Scroll to **Danger Zone**.
4. Choose **Archive this repository**.
5. Confirm the repository name when GitHub asks.
6. After archive, verify the repository is read-only and the README banner is visible.

Archive after cleanup, not before. Once archived, operational changes become more cumbersome because the repository is intentionally read-only.

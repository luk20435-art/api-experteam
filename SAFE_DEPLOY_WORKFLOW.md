# Safe Deploy Workflow

This repository follows a safe production flow.

## Rules
- `main` is production-only.
- Development must happen on `feature/*` branches.
- Always run tests and build before push.
- Always create a release tag after merge to `main`.
- Server team deploys from release tags only.
- Always backup database before production deploy.
- Always keep one previous release tag for rollback.

## Developer Flow
1. Create branch from main.
2. Implement changes locally.
3. Run `scripts/push-feature-safe.ps1`.
4. Open PR to `main`.
5. After PR merge, run `scripts/create-release-tag.ps1` on `main`.
6. Send release tag to server team.

## Server Flow (operated by server team)
1. Pull release tag.
2. Backup database.
3. Deploy container/service from that tag.
4. Run health checks.
5. Share production URL + deployed tag/commit.

## Rollback
- Deploy previous stable release tag immediately.
- Restore database only if schema/data change requires it.

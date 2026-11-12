# API Coverage — Phase 1

No external API integration: repo tooling only (gh calls in apply-repo-rules.sh, GHCR push in release.yml); the GitHub product integration is Phase 10.

The phase builds the repository foundation and CI/CD. `scripts/apply-repo-rules.sh` calls the GitHub REST API through `gh` to apply settings and rulesets, and `release.yml` pushes images to GHCR. Neither is a product feature.

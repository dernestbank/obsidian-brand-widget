# Publishing Brand-widget

Repository: https://github.com/dernestbank/obsidian-brand-widget

1. Run the checks in README and complete the live checks in VALIDATION.md.
2. Commit the intended source files and lockfile. Do not commit personal `data.json`, image assets or a vault. `dist` is ignored.
3. Push the default branch. All version numbers in manifest.json, package.json and versions.json must agree.
4. Create release tag `1.1.2` (no `v` prefix) and upload `dist/1.1.2/main.js`, `manifest.json` and `styles.css` individually. Include ZIP and SHA256SUMS.txt if desired. Use RELEASE_NOTES.md as the release body.
5. Sign into https://community.obsidian.md with your Obsidian account, connect the GitHub account owning this repository and add the repository URL. Confirm `brand-widget` is available as an ID before publishing.
6. Address automated review feedback and publish the directory listing. Review fixes should receive an incremented version and corresponding release assets.

No GitHub commit, push, release or community submission is performed by local packaging scripts.

Official references:

- https://docs.obsidian.md/plugins/releasing/submit-plugin
- https://docs.obsidian.md/community-directory/submission-requirements-for-plugins
- https://docs.obsidian.md/community-directory/developer-policies

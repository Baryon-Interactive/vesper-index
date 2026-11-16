# Vesper catalogue

The official signed game catalogue for [Vesper](https://github.com/Baryon-Interactive/vesper),
served at <https://baryon-interactive.github.io/vesper-index/>. The Vesper client
trusts this repository's `root.json` and reads the catalogue from that address.

- `root.json`: offline root keys (threshold 2 of 3) and the online snapshot/timestamp key.
- `routes.json`: root-signed registry of games, their developer keys and metadata locations.
- `apps/<app_id>/`: developer-signed `targets.json`, `store.json` and `description.md`,
  copied in by the aggregation workflow.

## Adding a game

Follow the [publishing guide](https://github.com/Baryon-Interactive/vesper/blob/main/docs/publishing.md):
run `vesper init`, publish your build and metadata to your own GitHub Releases, then open
a registration PR with your developer public key and `metadata_url`. A maintainer
signs the `routes.json` change with the offline root keys and merges it. Later
releases need no PR; aggregation picks them up every 15 minutes.

## How this repository works

The workflows, scripts and schemas come from Vesper's
[index template](https://github.com/Baryon-Interactive/vesper/tree/main/index-template),
which documents verification, automatic merging rules, signing and Pages deployment.
The workflows download the pinned `vesper` binary from Vesper's GitHub Releases and
check its SHA-256 before running it.

Private keys are never stored here. The online key is the `VESPER_ONLINE_KEY`
Actions secret; root keys are kept offline by the maintainers.

# ChemMon Wiki App (Deploy Repo)

This repo is the deployable Docker + UI wrapper for the ChemMon markdown wiki.

The wiki content + API live in the upstream repo and are included here as a pinned git
submodule (`./chemmon_wiki`) so deploy changes do not pollute the wiki source repo.

## Quick Start

```bash
git clone --recurse-submodules https://github.com/Chili36/Chemmon_wiki_deploy.git
cd Chemmon_wiki_deploy
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY
docker compose up --build
```

If you cloned without submodules, run:

```bash
git submodule update --init --recursive
```

UI:
- http://localhost:8080

API:
- http://localhost:8005/health
- http://localhost:8005/wiki/ask

## Configuration

Required:
- `ANTHROPIC_API_KEY`

Optional:
- `OPENAI_API_KEY` (only needed if you set `WIKI_SELECTOR_MODEL` to `gpt-*`)
- `WIKI_SELECTOR_MODEL` / `WIKI_ANSWERER_MODEL`

## Updating The Wiki Version

To pin a new upstream wiki commit:

```bash
cd chemmon_wiki
git fetch
git checkout <sha-or-tag>
cd ..
git add chemmon_wiki
git commit -m "Pin ChemMon wiki to <sha-or-tag>"
```

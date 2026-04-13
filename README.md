# ChemMon Wiki App (Deploy Repo)

This repo is the deployable Docker + UI wrapper for the ChemMon markdown wiki.

The wiki content + API live in the upstream repo and are included here as a pinned git
submodule so deploy changes do not pollute the wiki source repo.

## Setup

1. Add the upstream wiki repo as a submodule:

```bash
git submodule add https://github.com/Chili36/Chemmon_Wiki.git chemmon_wiki
git submodule update --init --recursive
```

2. Copy env template and set secrets:

```bash
cp .env.example .env
```

Required:
- `ANTHROPIC_API_KEY`

Optional:
- `OPENAI_API_KEY` (only needed if you set `WIKI_SELECTOR_MODEL` to `gpt-*`)

3. Start:

```bash
docker compose up --build
```

UI:
- http://localhost:8080

API:
- http://localhost:8005/health
- http://localhost:8005/wiki/ask

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


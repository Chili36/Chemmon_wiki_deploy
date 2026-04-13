FROM python:3.12-slim

WORKDIR /app

# The upstream wiki/API repo is vendored here as a git submodule at ./chemmon_wiki.
# Keep this deploy repo clean: we do not add Docker assets to the upstream repo.
COPY chemmon_wiki/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY chemmon_wiki/ /app/chemmon_wiki/
WORKDIR /app/chemmon_wiki

EXPOSE 8005

CMD ["python", "-m", "uvicorn", "wiki_api.app:app", "--host", "0.0.0.0", "--port", "8005"]


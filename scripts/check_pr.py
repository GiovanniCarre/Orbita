"""Validate Orbita's ticket-to-PR workflow without third-party dependencies."""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BRANCH_PATTERN = re.compile(r"codex/([1-9][0-9]*)-[a-z0-9]+(?:-[a-z0-9]+)*")
TITLE_PATTERN = re.compile(
    r"(?:feat|fix|docs|chore|ci|test|refactor|perf|build|style)"
    r"(?:\([a-z0-9][a-z0-9._/-]*\))?!?: \S[^\r\n]*"
)
CLOSING_PATTERN = re.compile(
    r"^ {0,3}(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?) +#([1-9][0-9]*)[ \t]*[.!]?[ \t]*$",
    re.IGNORECASE,
)
FENCE_PATTERN = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")


def closing_issues(body: str) -> set[int]:
    """Find explicit closing lines outside HTML comments and fenced code."""
    body = re.sub(r"<!--.*?(?:-->|\Z)", "", body, flags=re.DOTALL)
    issues = set()
    fence = None
    for line in body.splitlines():
        marker = FENCE_PATTERN.match(line)
        if fence is not None:
            if (
                marker
                and marker[1][0] == fence[0]
                and len(marker[1]) >= len(fence)
                and not marker[2].strip()
            ):
                fence = None
            continue
        if marker:
            fence = marker[1]
            continue
        match = CLOSING_PATTERN.fullmatch(line)
        if match:
            issues.add(int(match[1]))
    return issues


def validate_pull_request(event: dict) -> tuple[list[str], int | None]:
    """Return actionable errors and the ticket number inferred from the branch."""
    pr = event.get("pull_request")
    if not isinstance(pr, dict):
        return ["Un événement pull_request est requis."], None

    errors = []
    if pr.get("base", {}).get("ref") != "main":
        errors.append("La PR doit cibler main.")
    branch = BRANCH_PATTERN.fullmatch(pr.get("head", {}).get("ref", ""))
    issue_number = int(branch[1]) if branch else None
    if branch is None:
        errors.append("La branche doit suivre codex/<numero-du-ticket>-<description>.")
    if not TITLE_PATTERN.fullmatch(pr.get("title", "")):
        errors.append("Le titre doit suivre type(scope): description ou type: description.")
    if issue_number is not None and issue_number not in closing_issues(pr.get("body") or ""):
        errors.append(f"Ajouter une ligne Closes #{issue_number} dans le corps de la PR.")
    return errors, issue_number


def verify_issue(repository: str, issue_number: int, token: str) -> list[str]:
    """Verify the ticket in the base repository, never in a fork's repository."""
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        return ["Le dépôt GitHub de base est absent ou invalide."]
    if not token:
        return ["GH_TOKEN ou GITHUB_TOKEN est requis pour vérifier le ticket."]
    request = Request(
        f"https://api.github.com/repos/{repository}/issues/{issue_number}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "orbita-pr-policy",
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            issue = json.load(response)
    except HTTPError as error:
        return [f"Ticket #{issue_number} inaccessible (HTTP {error.code})."]
    except (URLError, TimeoutError, OSError, ValueError):
        return [f"Impossible de vérifier le ticket #{issue_number} auprès de GitHub."]
    if not isinstance(issue, dict):
        return ["La réponse GitHub ne contient pas une issue valide."]
    if "pull_request" in issue:
        return [f"#{issue_number} est une PR ; une issue est requise."]
    if issue.get("state") != "open":
        return [f"Le ticket #{issue_number} doit être ouvert."]
    return []


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event", type=Path, default=os.getenv("GITHUB_EVENT_PATH"))
    parser.add_argument("--verify-issue", action="store_true")
    args = parser.parse_args(argv)
    if args.event is None:
        parser.error("--event ou GITHUB_EVENT_PATH est requis")
    try:
        event = json.loads(args.event.read_text(encoding="utf-8"))
        if not isinstance(event, dict):
            raise ValueError("Expected an event object")
    except (OSError, UnicodeError, ValueError):
        print("Événement JSON absent ou invalide.", file=sys.stderr)
        return 1
    errors, issue_number = validate_pull_request(event)
    if not errors and args.verify_issue:
        repository = event.get("repository", {}).get("full_name", "")
        token = os.getenv("GH_TOKEN") or os.getenv("GITHUB_TOKEN", "")
        errors.extend(verify_issue(repository, issue_number, token))
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print(f"PR conforme au flux Orbita : ticket #{issue_number}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

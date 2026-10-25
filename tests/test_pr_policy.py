"""Exercise workflow failures that could let an untracked change reach main."""

import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from scripts.check_pr import closing_issues, main, validate_pull_request, verify_issue


def event_fixture():
    return {
        "repository": {"full_name": "GiovanniCarre/Orbita"},
        "pull_request": {
            "base": {"ref": "main"},
            "head": {"ref": "codex/12-project-management"},
            "title": "feat(projects): créer un projet",
            "body": "## Ticket\n\nCloses #12\n",
        },
    }


class PullRequestPolicyTests(unittest.TestCase):
    def test_valid_pr_links_branch_to_issue(self):
        self.assertEqual(validate_pull_request(event_fixture()), ([], 12))

    def test_rejects_wrong_target(self):
        event = event_fixture()
        event["pull_request"]["base"]["ref"] = "develop"
        self.assertIn("La PR doit cibler main.", validate_pull_request(event)[0])

    def test_rejects_untracked_or_malformed_branches(self):
        for branch in ("main", "codex/no-ticket", "codex/0-test", "codex/12-Bad", "codex/12-bad-"):
            with self.subTest(branch=branch):
                event = event_fixture()
                event["pull_request"]["head"]["ref"] = branch
                errors, issue = validate_pull_request(event)
                self.assertTrue(errors)
                self.assertIsNone(issue)

    def test_rejects_missing_or_different_closing_issue(self):
        for body in (None, "", "Refs #12", "Closes #123", "Closes #2", "Closes #NUMERO"):
            with self.subTest(body=body):
                event = event_fixture()
                event["pull_request"]["body"] = body
                self.assertTrue(validate_pull_request(event)[0])

    def test_rejects_nonconventional_or_empty_titles(self):
        for title in ("Mise à jour", "feature: ajout", "feat: ", "feat: premier\nsecond"):
            with self.subTest(title=title):
                event = event_fixture()
                event["pull_request"]["title"] = title
                self.assertTrue(validate_pull_request(event)[0])

    def test_accepts_scoped_and_breaking_titles(self):
        for title in ("docs: préciser le flux", "feat!: changer le modèle", "fix(api)!: corriger"):
            with self.subTest(title=title):
                event = event_fixture()
                event["pull_request"]["title"] = title
                self.assertEqual(validate_pull_request(event)[0], [])

    def test_rejects_non_pr_events(self):
        self.assertTrue(validate_pull_request({"ref": "refs/heads/main"})[0])

    def test_accepts_github_closing_keywords_and_crlf(self):
        self.assertEqual(closing_issues("Fixes #12\r\nresolved #13\r\nCLOSE #14."), {12, 13, 14})

    def test_ignores_commented_and_example_references(self):
        bodies = (
            "<!--\nCloses #12\n-->",
            "```text\nCloses #12\n```",
            "~~~\nCloses #12\n~~~",
            "    Closes #12",
            "> Closes #12",
            "<!-- unclosed\nCloses #12",
        )
        for body in bodies:
            with self.subTest(body=body):
                self.assertEqual(closing_issues(body), set())

    def test_short_fence_does_not_close_a_longer_code_block(self):
        self.assertEqual(closing_issues("````text\n```\nCloses #12\n````\nCloses #13"), {13})

    def test_closing_reference_after_example_is_accepted(self):
        self.assertEqual(closing_issues("```\nCloses #999\n```\nCloses #12"), {12})


class GitHubIssueTests(unittest.TestCase):
    def check_issue(self, issue):
        response = io.BytesIO(json.dumps(issue).encode())
        with patch("scripts.check_pr.urlopen", return_value=response) as request:
            errors = verify_issue("GiovanniCarre/Orbita", 12, "test-token")
        self.assertEqual(request.call_args.args[0].full_url, "https://api.github.com/repos/GiovanniCarre/Orbita/issues/12")
        return errors

    def test_accepts_open_issue(self):
        self.assertEqual(self.check_issue({"state": "open"}), [])

    def test_rejects_pr_number_and_closed_issue(self):
        self.assertTrue(self.check_issue({"state": "open", "pull_request": {}}))
        self.assertTrue(self.check_issue({"state": "closed"}))

    def test_rejects_invalid_api_response(self):
        self.assertTrue(self.check_issue([]))

    def test_rejects_missing_credentials_before_network_access(self):
        with patch("scripts.check_pr.urlopen") as request:
            self.assertTrue(verify_issue("GiovanniCarre/Orbita", 12, ""))
            request.assert_not_called()

    def test_rejects_malformed_base_repository(self):
        with patch("scripts.check_pr.urlopen") as request:
            self.assertTrue(verify_issue("../other/issue", 12, "test-token"))
            request.assert_not_called()

    def test_reports_missing_issue_and_connection_failure(self):
        for error in (HTTPError("https://api.github.com", 404, "Missing", {}, None), URLError("offline")):
            with self.subTest(error=type(error).__name__):
                with patch("scripts.check_pr.urlopen", side_effect=error):
                    self.assertTrue(verify_issue("GiovanniCarre/Orbita", 12, "test-token"))


class CommandTests(unittest.TestCase):
    def test_local_validation_succeeds_without_network(self):
        with tempfile.TemporaryDirectory() as directory:
            event_file = Path(directory) / "event.json"
            event_file.write_text(json.dumps(event_fixture()), encoding="utf-8")
            with patch("scripts.check_pr.urlopen") as request, redirect_stdout(io.StringIO()):
                self.assertEqual(main(["--event", str(event_file)]), 0)
                request.assert_not_called()

    def test_invalid_event_file_returns_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            event_file = Path(directory) / "event.json"
            for content in ("not json", "[]"):
                with self.subTest(content=content):
                    event_file.write_text(content, encoding="utf-8")
                    with redirect_stderr(io.StringIO()):
                        self.assertEqual(main(["--event", str(event_file)]), 1)

    def test_live_validation_uses_the_base_repository(self):
        event = event_fixture()
        event["pull_request"]["head"]["repo"] = {"full_name": "someone/fork"}
        with tempfile.TemporaryDirectory() as directory:
            event_file = Path(directory) / "event.json"
            event_file.write_text(json.dumps(event), encoding="utf-8")
            with (
                patch.dict("os.environ", {"GH_TOKEN": "test-token"}),
                patch("scripts.check_pr.verify_issue", return_value=[]) as verify,
                redirect_stdout(io.StringIO()),
            ):
                self.assertEqual(main(["--event", str(event_file), "--verify-issue"]), 0)
                verify.assert_called_once_with("GiovanniCarre/Orbita", 12, "test-token")


if __name__ == "__main__":
    unittest.main()

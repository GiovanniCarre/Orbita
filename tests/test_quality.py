import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import quality


class ArchitectureTests(unittest.TestCase):
    def test_detects_import_between_modules(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            module = root / "backend/app/modules/alpha"
            module.mkdir(parents=True)
            violations = []
            with patch.object(quality, "ROOT", root):
                quality.check_imports(
                    module / "service.py", "from app.modules.beta import x", violations
                )
            self.assertEqual(len(violations), 1)

    def test_detects_relative_import_outside_module(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            module = root / "backend/app/modules/alpha"
            module.mkdir(parents=True)
            violations = []
            with patch.object(quality, "ROOT", root):
                quality.check_imports(
                    module / "service.py", "from ..beta import x", violations
                )
            self.assertEqual(len(violations), 1)

    def test_allows_import_from_same_module(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            module = root / "backend/app/modules/alpha"
            module.mkdir(parents=True)
            violations = []
            with patch.object(quality, "ROOT", root):
                quality.check_imports(
                    module / "service.py", "from app.modules.alpha import x", violations
                )
            self.assertEqual(violations, [])


class FrontendModuleTests(unittest.TestCase):
    def check(self, relative: str, source: str) -> list[str]:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            violations = []
            with patch.object(quality, "ROOT", root):
                quality.check_frontend_imports(root / relative, source, violations)
            return violations

    def test_detects_lib_import_between_modules(self):
        source = 'import { x } from "$lib/social/platforms";'
        self.assertEqual(len(self.check("frontend/src/lib/overview/a.ts", source)), 1)

    def test_detects_relative_import_between_modules(self):
        source = 'import Connections from "../social/Connections.svelte";'
        self.assertEqual(
            len(self.check("frontend/src/lib/overview/A.svelte", source)), 1
        )

    def test_detects_route_importing_another_module(self):
        source = 'import Dashboard from "$lib/overview/Dashboard.svelte";'
        self.assertEqual(
            len(self.check("frontend/src/routes/social/+page.svelte", source)), 1
        )

    def test_allows_same_module_and_shared_code(self):
        source = (
            'import { a } from "./platforms";\n'
            'import { b } from "$lib/social/connections";\n'
            'import { modules } from "$lib/modules";\n'
            'import { onMount } from "svelte";'
        )
        self.assertEqual(
            self.check("frontend/src/routes/social/+page.svelte", source), []
        )

    def test_shared_routes_may_compose_modules(self):
        source = 'import Dashboard from "$lib/overview/Dashboard.svelte";'
        self.assertEqual(self.check("frontend/src/routes/+page.svelte", source), [])


if __name__ == "__main__":
    unittest.main()

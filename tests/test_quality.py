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


if __name__ == "__main__":
    unittest.main()

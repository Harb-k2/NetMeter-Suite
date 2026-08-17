import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from netmeter_desktop import format_bytes, safe_delta


class MonitorLogicTests(unittest.TestCase):
    def test_delta_is_calculated_from_two_monotonic_readings(self): self.assertEqual(safe_delta((100, 80), (260, 140)), (160, 60))
    def test_counter_reset_is_not_recorded_as_usage(self): self.assertIsNone(safe_delta((400, 200), (10, 8)))
    def test_format_uses_human_readable_units(self): self.assertEqual(format_bytes(1024 * 1024), "1.0 م.ب")

if __name__ == "__main__": unittest.main()

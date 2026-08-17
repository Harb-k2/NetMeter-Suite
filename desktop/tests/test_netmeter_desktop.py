import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from netmeter_desktop import format_bytes, safe_delta, usage_alert_level


class MonitorLogicTests(unittest.TestCase):
    def test_delta_is_calculated_from_two_monotonic_readings(self): self.assertEqual(safe_delta((100, 80), (260, 140)), (160, 60))
    def test_counter_reset_is_not_recorded_as_usage(self): self.assertIsNone(safe_delta((400, 200), (10, 8)))
    def test_format_uses_human_readable_units(self): self.assertEqual(format_bytes(1024 * 1024), "1.0 م.ب")
    def test_limit_warning_starts_at_eighty_percent(self): self.assertEqual(usage_alert_level(800, 1000), "warning")
    def test_limit_exceeded_starts_at_one_hundred_percent(self): self.assertEqual(usage_alert_level(1000, 1000), "exceeded")
    def test_limit_does_not_alert_below_warning_threshold(self): self.assertIsNone(usage_alert_level(799, 1000))

if __name__ == "__main__": unittest.main()

import hashlib
import hmac
import json
import tempfile
import unittest
from pathlib import Path

from nullpay import NullPay, NullPayError, load_nullpay_config


class LoadConfigTests(unittest.TestCase):
    def test_returns_none_when_config_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            self.assertIsNone(load_nullpay_config(project_root=temp_dir))

    def test_loads_valid_config(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = Path(temp_dir) / "nullpay.json"
            config_path.write_text(
                json.dumps(
                    {
                        "merchant": "aleo1merchant",
                        "generated_at": "2026-01-01T00:00:00.000Z",
                        "invoices": [{"name": "basic", "type": "multipay", "amount": 1, "currency": "USDCX", "hash": "123field", "salt": "456field"}],
                    }
                ),
                encoding="utf-8",
            )

            config = load_nullpay_config(project_root=temp_dir)
            self.assertIsNotNone(config)
            self.assertEqual(config["merchant"], "aleo1merchant")
            self.assertEqual(config["invoices"][0]["name"], "basic")

    def test_raises_for_invalid_json(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = Path(temp_dir) / "nullpay.json"
            config_path.write_text("{not-valid-json}", encoding="utf-8")

            with self.assertRaises(NullPayError):
                load_nullpay_config(project_root=temp_dir)


class WebhookTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = NullPay({"secretKey": "merch_secure_test_key_xyz"})
        self.payload = json.dumps(
            {
                "id": "pi_12345",
                "amount": 50,
                "token_type": "USDCX",
                "status": "SETTLED",
                "tx_id": "at1abc12345",
                "timestamp": "2026-01-01T00:00:00.000Z",
            }
        )
        self.signature = hmac.new(b"merch_secure_test_key_xyz", self.payload.encode("utf-8"), hashlib.sha256).hexdigest()

    def test_verify_signature_accepts_valid_payload(self) -> None:
        self.assertTrue(self.client.webhooks.verify_signature(self.payload, self.signature))

    def test_verify_signature_rejects_invalid_payload(self) -> None:
        self.assertFalse(self.client.webhooks.verify_signature(self.payload, "bad_signature"))

    def test_construct_event_returns_payload_dict(self) -> None:
        event = self.client.webhooks.construct_event(self.payload, self.signature)
        self.assertEqual(event["id"], "pi_12345")
        self.assertEqual(event["status"], "SETTLED")

    def test_construct_event_raises_for_bad_signature(self) -> None:
        with self.assertRaises(NullPayError):
            self.client.webhooks.construct_event(self.payload, "bad_signature")


if __name__ == "__main__":
    unittest.main()

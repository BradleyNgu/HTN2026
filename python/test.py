import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "modules"))

import interruptions

TEST_PHONE_NUMBER = interruptions.require_env("TEST_PHONE_NUMBER")

interruptions.phone_call(interruptions.PhoneCallType.GIRLFRIEND, TEST_PHONE_NUMBER)

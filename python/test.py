import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "modules"))

import interruptions

# Usage: python python/test.py +14155552671
if len(sys.argv) < 2:
    raise SystemExit("Usage: python python/test.py <+E164 phone number>")

interruptions.phone_call(interruptions.PhoneCallType.GIRLFRIEND, sys.argv[1])

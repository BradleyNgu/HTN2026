from enum import Enum
from base64 import b64encode
from json import loads
from os import environ
from pathlib import Path
from re import fullmatch
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from xml.sax.saxutils import escape

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def load_env(path: Path = ENV_PATH) -> None:
    """Copy ``KEY=value`` pairs from ``path`` into the process environment.

    Values already present in the environment win, so real environment
    variables keep overriding the local file.
    """
    try:
        contents = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return
    for line in contents.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if value[:1] in ("'", '"'):
            quote = value[0]
            closing = value.find(quote, 1)
            value = value[1:closing] if closing != -1 else value[1:]
        else:
            value = value.split("#", 1)[0].strip()
        environ.setdefault(key.strip(), value)


def require_env(name: str) -> str:
    """Return the environment variable ``name``, or explain how to set it."""
    load_env()
    value = environ.get(name, "").strip()
    if not value:
        raise RuntimeError(
            f"{name} is not set. Add it to {ENV_PATH} (see .env.example)."
        )
    return value


class PhoneCallType(str, Enum):
    MOM = "mom"
    BOSS = "boss"
    GIRLFRIEND = "girlfriend"


AUDIO_FILENAMES = {
    PhoneCallType.MOM: "mom.mp3",
    PhoneCallType.BOSS: "boss.mp3",
    PhoneCallType.GIRLFRIEND: "girlfriend.mp3",
}

GITHUB_AUDIO_BASE_URL = (
    "https://raw.githubusercontent.com/BradleyNgu/HTN2026/interruptions/audio"
)


def _validate_e164(phone_number: str, *, parameter_name: str) -> None:
    if not fullmatch(r"\+[1-9]\d{1,14}", phone_number):
        raise ValueError(
            f"{parameter_name} must be in E.164 format, e.g. '+14155552671'."
        )


def phone_call(phone_call_type: PhoneCallType, phone_number: str) -> str:
    """Call ``phone_number`` and play audio chosen by ``phone_call_type``.

    Returns the Twilio call SID. Twilio fetches the selected MP3 from GitHub.
    """
    if not isinstance(phone_call_type, PhoneCallType):
        raise TypeError("phone_call_type must be a PhoneCallType enum value.")
    _validate_e164(phone_number, parameter_name="phone_number")
    account_sid = require_env("TWILIO_ACCOUNT_SID")
    auth_token = require_env("TWILIO_AUTH_TOKEN")
    twilio_phone_number = require_env("TWILIO_PHONE_NUMBER")
    _validate_e164(twilio_phone_number, parameter_name="TWILIO_PHONE_NUMBER")
    audio_url = (
        f"{GITHUB_AUDIO_BASE_URL}/{AUDIO_FILENAMES[phone_call_type]}"
    )
    payload = urlencode(
        {
            "To": phone_number,
            "From": twilio_phone_number,
            "Twiml": f"<Response><Play>{escape(audio_url)}</Play></Response>",
        }
    ).encode()
    credentials = b64encode(
        f"{account_sid}:{auth_token}".encode()
    ).decode()
    request = Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls.json",
        data=payload,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            return loads(response.read())["sid"]
    except HTTPError as error:
        details = error.read().decode(errors="replace")
        raise RuntimeError(f"Twilio call request failed ({error.code}): {details}") from error

from enum import Enum
from base64 import b64encode
from json import loads
from re import fullmatch
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from xml.sax.saxutils import escape

from api_keys import (
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
)


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
    _validate_e164(TWILIO_PHONE_NUMBER, parameter_name="TWILIO_PHONE_NUMBER")
    audio_url = (
        f"{GITHUB_AUDIO_BASE_URL}/{AUDIO_FILENAMES[phone_call_type]}"
    )
    payload = urlencode(
        {
            "To": phone_number,
            "From": TWILIO_PHONE_NUMBER,
            "Twiml": f"<Response><Play>{escape(audio_url)}</Play></Response>",
        }
    ).encode()
    credentials = b64encode(
        f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()
    ).decode()
    request = Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json",
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

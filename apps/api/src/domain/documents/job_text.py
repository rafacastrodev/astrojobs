import re

UNSAFE_JOB_TEXT_MESSAGE = "HTML and script are not allowed"

_UNSAFE_MARKUP = re.compile(
    r"<\s*/?\s*[a-zA-Z!]|javascript\s*:|data\s*:\s*text/html|\bon\w+\s*=|&\s*#|&lt;",
    re.IGNORECASE,
)


def reject_unsafe_job_text(value: str) -> str:
    if any(ord(character) < 32 and character not in "\t\n\r" for character in value):
        raise ValueError(UNSAFE_JOB_TEXT_MESSAGE)
    if _UNSAFE_MARKUP.search(value):
        raise ValueError(UNSAFE_JOB_TEXT_MESSAGE)
    return value

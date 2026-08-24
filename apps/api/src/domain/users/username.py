import re
import unicodedata


def legacy_username_base(name: str, user_id: int) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    normalized = re.sub(r"[^a-z0-9]", "", ascii_name.lower())
    return (normalized or f"user{user_id}")[:30]


def unique_legacy_username(base: str, user_id: int, used: set[str]) -> str:
    if base not in used:
        return base
    suffix = str(user_id)
    candidate = f"{base[: 30 - len(suffix)]}{suffix}"
    counter = 2
    while candidate in used:
        extra = f"{user_id}{counter}"
        candidate = f"{base[: 30 - len(extra)]}{extra}"
        counter += 1
    return candidate

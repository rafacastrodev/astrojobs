import re
from typing import Any

from domain.entities.document_entity import DocumentType


class HeuristicTextExtractor:
    RESUME_SECTION_ALIASES = {
        "about": ("about", "summary", "profile", "objective", "overview"),
        "experience": ("experience", "work experience", "employment", "work history", "professional experience"),
        "education": ("education", "academic", "studies", "qualifications"),
    }

    JOB_SECTION_ALIASES = {
        "title": ("title", "position", "role", "job title"),
        "requirements": ("requirements", "qualifications", "what you'll need", "must have", "skills"),
        "responsibilities": ("responsibilities", "what you'll do", "duties", "role description", "about the role"),
        "seniority": ("seniority", "level", "experience level"),
        "employment_type": ("employment type", "job type", "contract type", "employment"),
    }

    EMPLOYED_PATTERNS = (
        r"\bpresent\b",
        r"\bcurrent(?:ly)?\b",
        r"\bnow\b",
        r"\btill date\b",
        r"\bto date\b",
    )

    def extract(self, text: str, doc_type: DocumentType) -> dict[str, Any]:
        normalized = self._normalize(text)
        if not normalized.strip():
            raise ValueError("Document text is empty after extraction")
        if doc_type == "resume":
            return self._extract_resume(normalized)
        return self._extract_job(normalized)

    def _extract_resume(self, text: str) -> dict[str, Any]:
        sections = self._split_sections(text, self.RESUME_SECTION_ALIASES)
        about = sections.get("about") or self._first_paragraph(text)
        experiences = self._split_entries(sections.get("experience", ""))
        education = self._split_entries(sections.get("education", ""))
        experience_block = sections.get("experience", "")
        currently_employed = any(
            re.search(pattern, experience_block, flags=re.IGNORECASE)
            for pattern in self.EMPLOYED_PATTERNS
        )
        return {
            "about": about,
            "experiences": experiences,
            "education": education,
            "structure": {
                "has_about": bool(about.strip()),
                "has_experience": len(experiences) > 0,
                "has_education": len(education) > 0,
                "section_count": sum(
                    1 for key in ("about", "experience", "education") if sections.get(key)
                ),
            },
            "currently_employed": currently_employed,
        }

    def _extract_job(self, text: str) -> dict[str, Any]:
        sections = self._split_sections(text, self.JOB_SECTION_ALIASES)
        title = sections.get("title") or self._first_line(text)
        return {
            "title": self._first_line(title),
            "requirements": self._split_entries(sections.get("requirements", ""))
            or self._bullet_lines(text),
            "responsibilities": self._split_entries(sections.get("responsibilities", "")),
            "seniority": self._guess_seniority(sections.get("seniority", "") or text),
            "employment_type": self._guess_employment_type(
                sections.get("employment_type", "") or text
            ),
        }

    def _split_sections(self, text: str, aliases: dict[str, tuple[str, ...]]) -> dict[str, str]:
        lines = text.splitlines()
        headings: list[tuple[int, str]] = []
        for index, line in enumerate(lines):
            key = self._match_heading(line, aliases)
            if key is not None:
                headings.append((index, key))

        sections: dict[str, str] = {}
        for i, (start, key) in enumerate(headings):
            end = headings[i + 1][0] if i + 1 < len(headings) else len(lines)
            body = "\n".join(lines[start + 1 : end]).strip()
            if body:
                sections[key] = body
        return sections

    def _match_heading(self, line: str, aliases: dict[str, tuple[str, ...]]) -> str | None:
        cleaned = re.sub(r"[:\-–—|]+$", "", line.strip(), flags=re.UNICODE)
        cleaned = cleaned.strip().lower()
        if not cleaned or len(cleaned) > 60:
            return None
        for key, names in aliases.items():
            for name in names:
                if cleaned == name or cleaned.startswith(f"{name} "):
                    return key
        return None

    def _split_entries(self, block: str) -> list[str]:
        if not block.strip():
            return []
        chunks = re.split(r"\n\s*\n+", block)
        entries: list[str] = []
        for chunk in chunks:
            cleaned = chunk.strip()
            if cleaned:
                entries.append(cleaned)
        if len(entries) <= 1:
            bullets = self._bullet_lines(block)
            return bullets or entries
        return entries

    def _bullet_lines(self, text: str) -> list[str]:
        lines = []
        for line in text.splitlines():
            stripped = line.strip()
            if re.match(r"^([•\-\*]|\d+[.)])\s+", stripped):
                lines.append(re.sub(r"^([•\-\*]|\d+[.)])\s+", "", stripped).strip())
        return [line for line in lines if line]

    def _first_paragraph(self, text: str) -> str:
        parts = re.split(r"\n\s*\n+", text.strip())
        return parts[0].strip() if parts else ""

    def _first_line(self, text: str) -> str:
        for line in text.splitlines():
            if line.strip():
                return line.strip()
        return text.strip()

    def _guess_seniority(self, text: str) -> str:
        lowered = text.lower()
        for label in ("intern", "junior", "mid", "senior", "lead", "principal", "staff"):
            if re.search(rf"\b{label}\b", lowered):
                return label
        return "unspecified"

    def _guess_employment_type(self, text: str) -> str:
        lowered = text.lower()
        for label in ("full-time", "full time", "part-time", "part time", "contract", "internship", "temporary"):
            if label in lowered:
                return label.replace(" ", "-")
        return "unspecified"

    def _normalize(self, text: str) -> str:
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

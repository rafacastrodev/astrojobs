"""Canonical technology names accepted by recruiter job postings."""

import re

TECHNOLOGIES: tuple[str, ...] = (
    ".NET",
    "Android",
    "Angular",
    "Ansible",
    "Apache Airflow",
    "Apache Kafka",
    "AWS",
    "Azure",
    "C",
    "C#",
    "C++",
    "Cassandra",
    "ClickHouse",
    "Cloudflare",
    "CSS",
    "Cypress",
    "Dart",
    "Databricks",
    "Django",
    "Docker",
    "Elasticsearch",
    "Elixir",
    "FastAPI",
    "Figma",
    "Firebase",
    "Flask",
    "Flutter",
    "GCP",
    "Git",
    "GitHub Actions",
    "GitLab CI",
    "Go",
    "Grafana",
    "GraphQL",
    "HTML",
    "iOS",
    "Java",
    "JavaScript",
    "Jenkins",
    "Jest",
    "Kotlin",
    "Kubernetes",
    "Laravel",
    "Linux",
    "Looker",
    "MariaDB",
    "MongoDB",
    "MySQL",
    "NestJS",
    "Next.js",
    "Node.js",
    "NoSQL",
    "NumPy",
    "OpenAI API",
    "Oracle",
    "Pandas",
    "PHP",
    "Pinecone",
    "Playwright",
    "PostgreSQL",
    "Power BI",
    "Prometheus",
    "PyTorch",
    "Python",
    "RabbitMQ",
    "React",
    "React Native",
    "Redis",
    "Ruby",
    "Ruby on Rails",
    "Rust",
    "Salesforce",
    "Scala",
    "Selenium",
    "Snowflake",
    "Spark",
    "Spring Boot",
    "SQL",
    "SQLite",
    "Svelte",
    "Swift",
    "Tableau",
    "Tailwind CSS",
    "TensorFlow",
    "Terraform",
    "TypeScript",
    "Vue.js",
)

_ALIASES = {
    "amazon web services": "AWS",
    "dotnet": ".NET",
    "fast api": "FastAPI",
    "golang": "Go",
    "google cloud": "GCP",
    "google cloud platform": "GCP",
    "js": "JavaScript",
    "k8s": "Kubernetes",
    "node": "Node.js",
    "nodejs": "Node.js",
    "postgres": "PostgreSQL",
    "reactjs": "React",
    "react.js": "React",
    "ts": "TypeScript",
    "vue": "Vue.js",
}

_BY_KEY = {technology.casefold(): technology for technology in TECHNOLOGIES}
_SECTION_PREFIX = re.compile(
    r"^(?:languages?|frameworks?|databases?|cloud|tools?|other|testing|"
    r"skills?|tech(?:nical)?\s*skills?|tech\s*stack)\s*:\s*",
    re.IGNORECASE,
)

TECH_STACK_CATEGORIES = (
    "languages",
    "frameworks",
    "databases",
    "cloud",
    "tools",
    "other",
)

_TECHNOLOGY_CATEGORY: dict[str, str] = {
    ".NET": "languages",
    "C": "languages",
    "C#": "languages",
    "C++": "languages",
    "CSS": "languages",
    "Dart": "languages",
    "Elixir": "languages",
    "Go": "languages",
    "HTML": "languages",
    "Java": "languages",
    "JavaScript": "languages",
    "Kotlin": "languages",
    "PHP": "languages",
    "Python": "languages",
    "Ruby": "languages",
    "Rust": "languages",
    "SQL": "languages",
    "Scala": "languages",
    "Swift": "languages",
    "TypeScript": "languages",
    "Angular": "frameworks",
    "Django": "frameworks",
    "FastAPI": "frameworks",
    "Flask": "frameworks",
    "Flutter": "frameworks",
    "GraphQL": "frameworks",
    "Laravel": "frameworks",
    "NestJS": "frameworks",
    "Next.js": "frameworks",
    "Node.js": "frameworks",
    "React": "frameworks",
    "React Native": "frameworks",
    "Ruby on Rails": "frameworks",
    "Spring Boot": "frameworks",
    "Svelte": "frameworks",
    "Tailwind CSS": "frameworks",
    "Vue.js": "frameworks",
    "Cassandra": "databases",
    "ClickHouse": "databases",
    "Elasticsearch": "databases",
    "Firebase": "databases",
    "MariaDB": "databases",
    "MongoDB": "databases",
    "MySQL": "databases",
    "NoSQL": "databases",
    "Oracle": "databases",
    "Pinecone": "databases",
    "PostgreSQL": "databases",
    "Redis": "databases",
    "SQLite": "databases",
    "Snowflake": "databases",
    "AWS": "cloud",
    "Azure": "cloud",
    "Cloudflare": "cloud",
    "GCP": "cloud",
    "Android": "tools",
    "Ansible": "tools",
    "Apache Airflow": "tools",
    "Apache Kafka": "tools",
    "Cypress": "tools",
    "Databricks": "tools",
    "Docker": "tools",
    "Figma": "tools",
    "Git": "tools",
    "GitHub Actions": "tools",
    "GitLab CI": "tools",
    "Grafana": "tools",
    "Jenkins": "tools",
    "Jest": "tools",
    "Kubernetes": "tools",
    "Linux": "tools",
    "Looker": "tools",
    "NumPy": "tools",
    "OpenAI API": "tools",
    "Pandas": "tools",
    "Playwright": "tools",
    "Power BI": "tools",
    "Prometheus": "tools",
    "PyTorch": "tools",
    "RabbitMQ": "tools",
    "Salesforce": "tools",
    "Selenium": "tools",
    "Spark": "tools",
    "Tableau": "tools",
    "TensorFlow": "tools",
    "Terraform": "tools",
    "iOS": "tools",
}


def canonical_technology(value: str) -> str | None:
    cleaned = _SECTION_PREFIX.sub("", value.strip()).strip()
    key = cleaned.casefold()
    if not key:
        return None
    return _ALIASES.get(key) or _BY_KEY.get(key)


def technologies_in_text(text: str) -> list[str]:
    """Return canonical technologies explicitly mentioned in free-form text."""
    if not text.strip():
        return []
    candidates = [
        *((alias, canonical) for alias, canonical in _ALIASES.items()),
        *((technology, technology) for technology in TECHNOLOGIES),
    ]
    found: list[str] = []
    seen: set[str] = set()
    for phrase, canonical in sorted(
        candidates, key=lambda item: len(item[0]), reverse=True
    ):
        flags = 0 if phrase in {"C", "Go"} else re.IGNORECASE
        left_boundary = r"(?<![\w.])" if phrase in {"js", "ts"} else r"(?<![\w])"
        if not re.search(
            rf"{left_boundary}{re.escape(phrase)}(?![\w])",
            text,
            flags=flags,
        ):
            continue
        key = canonical.casefold()
        if key not in seen:
            seen.add(key)
            found.append(canonical)
    return found


def empty_tech_stack() -> dict[str, list[str]]:
    return {category: [] for category in TECH_STACK_CATEGORIES}


def flatten_tech_stack(stack: dict) -> list[str]:
    values: list[str] = []
    seen: set[str] = set()
    for category in TECH_STACK_CATEGORIES:
        for item in stack.get(category, []):
            if not isinstance(item, str):
                continue
            key = item.casefold()
            if not item.strip() or key in seen:
                continue
            seen.add(key)
            values.append(item)
    return values


def normalize_tech_stack(*groups: object) -> dict[str, list[str]]:
    stack = empty_tech_stack()
    seen: dict[str, str] = {}
    for group in groups:
        for raw in _iter_tech_values(group):
            canonical = canonical_technology(raw)
            if not canonical:
                continue
            key = canonical.casefold()
            if key in seen:
                continue
            seen[key] = canonical
            category = _TECHNOLOGY_CATEGORY.get(canonical, "other")
            stack[category].append(canonical)
    return stack


def _iter_tech_values(value: object):
    if isinstance(value, str):
        for part in (
            value.replace("|", ",").replace(";", ",").replace("\n", ",").split(",")
        ):
            if part.strip():
                yield part.strip()
        return
    if isinstance(value, dict):
        for item in value.values():
            yield from _iter_tech_values(item)
        return
    if isinstance(value, (list, tuple)):
        for item in value:
            yield from _iter_tech_values(item)

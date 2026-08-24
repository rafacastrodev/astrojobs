from domain.documents.experience_grouping import group_experiences
from infrastructure.extraction.heuristic_text_extractor import HeuristicTextExtractor
from infrastructure.extraction.openai_resume_extractor import OpenAIResumeExtractor

RESUME = """\
Rafael Castro
Software Engineer

Experience

Full-Stack & AI Software Engineer - ReasonX (Aug 2025 - Current) · Canada (Remote)

● Consolidated multiple standalone front-end products into a unified platform by creating

Tech Stack: TypeScript, React, Next.js, Tailwind CSS, interactive canvas / node-graph UI, Python,

Software Engineer Full-Stack Developer — Fidexa (Jun 2024 - Aug 2025) · Brazil (Remote)

● Built and launched the company’s collections dashboard from the ground up using Next.js,

Tech Stack: TypeScript, React, Next.js, Vite, Tailwind CSS, WebSockets, WhatsApp Business API,

Full Stack & Data Software Engineer — AI With Data Sports (Mar 2025 - Sep 2025) · Canada

● Powered Canadian swimming rankings and athlete histories by building a Python pipeline that
"""


def test_heuristic_keeps_one_experience_per_job_header() -> None:
    payload = HeuristicTextExtractor().extract(RESUME, "resume")
    experiences = payload["experiences"]

    assert len(experiences) == 3
    blob = " ".join(
        f"{item['job_title']} {item['description']} {' '.join(item['highlights'])}"
        for item in experiences
    )
    assert "ReasonX" in blob
    assert "Fidexa" in blob
    assert "AI With Data Sports" in blob
    assert "Consolidated multiple standalone" in experiences[0]["description"] or (
        "Consolidated multiple standalone" in " ".join(experiences[0]["highlights"])
    )
    assert "Tech Stack: TypeScript" in experiences[0]["description"] or (
        "Tech Stack: TypeScript" in " ".join(experiences[0]["highlights"])
    )
    assert all("Tech Stack:" not in item["job_title"] for item in experiences)
    assert all(
        not item["job_title"].lstrip().startswith("●")
        and "Consolidated" not in item["job_title"]
        for item in experiences
    )


def test_group_experiences_merges_bullets_and_tech_stack_into_previous_job() -> None:
    grouped = group_experiences(
        [
            {
                "job_title": "Full-Stack & AI Software Engineer - ReasonX (Aug 2025 - Current) · Canada (Remote)",
                "company": "",
                "location": "",
                "start_date": "Aug 2025",
                "end_date": "Current",
                "current": True,
                "description": "",
                "highlights": [],
            },
            {
                "job_title": "Consolidated multiple standalone front-end products into a unified platform by creating",
                "company": "",
                "location": "",
                "start_date": "",
                "end_date": "",
                "current": False,
                "description": "",
                "highlights": [],
            },
            {
                "job_title": "Tech Stack: TypeScript, React, Next.js, Tailwind CSS, Python,",
                "company": "",
                "location": "",
                "start_date": "",
                "end_date": "",
                "current": False,
                "description": "",
                "highlights": [],
            },
            {
                "job_title": "Software Engineer Full-Stack Developer — Fidexa (Jun 2024 - Aug 2025) · Brazil (Remote)",
                "company": "",
                "location": "",
                "start_date": "Jun 2024",
                "end_date": "Aug 2025",
                "current": False,
                "description": "",
                "highlights": [],
            },
            {
                "job_title": "Built and launched the company’s collections dashboard from the ground up using Next.js,",
                "company": "",
                "location": "",
                "start_date": "",
                "end_date": "",
                "current": False,
                "description": "",
                "highlights": [],
            },
        ]
    )

    assert len(grouped) == 2
    assert "ReasonX" in grouped[0]["job_title"]
    assert "Fidexa" in grouped[1]["job_title"]
    first_body = " ".join([grouped[0]["description"], *grouped[0]["highlights"]])
    assert "Consolidated multiple standalone" in first_body
    assert "Tech Stack: TypeScript" in first_body


def test_openai_finalize_groups_fragmented_experiences() -> None:
    payload = OpenAIResumeExtractor._finalize(
        {
            "experiences": [
                {
                    "job_title": "Engineer",
                    "company": "ReasonX",
                    "location": "Canada",
                    "start_date": "Aug 2025",
                    "end_date": "Current",
                    "current": True,
                    "description": "",
                    "highlights": [],
                },
                {
                    "job_title": "",
                    "company": "",
                    "location": "",
                    "start_date": "",
                    "end_date": "",
                    "current": False,
                    "description": "Shipped the unified platform",
                    "highlights": [],
                },
                {
                    "job_title": "Tech Stack: TypeScript, React",
                    "company": "",
                    "location": "",
                    "start_date": "",
                    "end_date": "",
                    "current": False,
                    "description": "",
                    "highlights": [],
                },
            ],
            "tech_stack": {},
            "skills": [],
        }
    )

    assert len(payload["experiences"]) == 1
    body = " ".join(
        [
            payload["experiences"][0]["description"],
            *payload["experiences"][0]["highlights"],
        ]
    )
    assert "Shipped the unified platform" in body
    assert "Tech Stack: TypeScript" in body

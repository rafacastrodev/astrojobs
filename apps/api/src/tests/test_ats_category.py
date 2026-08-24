import pytest

from domain.analysis.entities import ats_category_for_score


@pytest.mark.parametrize(
    ("score", "expected"),
    [
        (0, "low"),
        (49, "low"),
        (50, "medium"),
        (74, "medium"),
        (75, "high"),
        (100, "high"),
    ],
)
def test_ats_category_boundaries(score, expected):
    assert ats_category_for_score(score) == expected

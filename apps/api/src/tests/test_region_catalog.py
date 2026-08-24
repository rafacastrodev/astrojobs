from domain.documents.region_catalog import (
    canonical_region,
    list_regions,
    regions_compatible,
)


def test_catalog_is_english_and_includes_worldwide_macros_countries_and_cities() -> None:
    names = {item["name"] for item in list_regions()}
    assert "Remote / Worldwide" in names
    assert "Latin America" in names
    assert "Brazil" in names
    assert "Argentina" in names
    assert "United States" in names
    assert "Sao Paulo" in names
    assert "Buenos Aires" in names
    assert "New York" in names
    assert "São Paulo" not in names


def test_canonical_region_maps_aliases_and_accents() -> None:
    assert canonical_region("  São Paulo  ") == "Sao Paulo"
    assert canonical_region("Brasil") == "Brazil"
    assert canonical_region("USA") == "United States"
    assert canonical_region("Lisboa") == "Lisbon"
    assert canonical_region("Narnia") is None


def test_city_matches_country_and_macro_but_not_a_sibling_country() -> None:
    assert regions_compatible("Sao Paulo", "Brazil")
    assert regions_compatible("Brazil", "Sao Paulo")
    assert regions_compatible("Sao Paulo", "Latin America")
    assert not regions_compatible("Brazil", "Argentina")
    assert not regions_compatible("Sao Paulo", "Buenos Aires")


def test_worldwide_matches_every_catalog_region() -> None:
    assert regions_compatible("Remote / Worldwide", "Japan")
    assert regions_compatible("Lisbon", "Remote / Worldwide")

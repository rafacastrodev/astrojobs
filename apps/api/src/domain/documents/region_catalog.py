"""Canonical regions used for professional profiles and job postings."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
import unicodedata

RegionKind = Literal["global", "macro", "country", "city"]


@dataclass(frozen=True)
class Region:
    name: str
    kind: RegionKind
    parent: str | None = None


def _fold(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.strip().casefold())
    return "".join(char for char in normalized if not unicodedata.combining(char))


def _region(name: str, kind: RegionKind, parent: str | None = None) -> Region:
    return Region(name=name, kind=kind, parent=parent)


_MACROS: tuple[str, ...] = (
    "Latin America",
    "North America",
    "Europe",
    "Africa",
    "Middle East",
    "Asia",
    "Oceania",
)

_COUNTRIES: tuple[tuple[str, str], ...] = (
    ("Argentina", "Latin America"),
    ("Bolivia", "Latin America"),
    ("Brazil", "Latin America"),
    ("Chile", "Latin America"),
    ("Colombia", "Latin America"),
    ("Costa Rica", "Latin America"),
    ("Cuba", "Latin America"),
    ("Dominican Republic", "Latin America"),
    ("Ecuador", "Latin America"),
    ("El Salvador", "Latin America"),
    ("Guatemala", "Latin America"),
    ("Honduras", "Latin America"),
    ("Mexico", "Latin America"),
    ("Nicaragua", "Latin America"),
    ("Panama", "Latin America"),
    ("Paraguay", "Latin America"),
    ("Peru", "Latin America"),
    ("Puerto Rico", "Latin America"),
    ("Uruguay", "Latin America"),
    ("Venezuela", "Latin America"),
    ("Canada", "North America"),
    ("United States", "North America"),
    ("Albania", "Europe"),
    ("Austria", "Europe"),
    ("Belgium", "Europe"),
    ("Bosnia and Herzegovina", "Europe"),
    ("Bulgaria", "Europe"),
    ("Croatia", "Europe"),
    ("Czechia", "Europe"),
    ("Denmark", "Europe"),
    ("Estonia", "Europe"),
    ("Finland", "Europe"),
    ("France", "Europe"),
    ("Germany", "Europe"),
    ("Greece", "Europe"),
    ("Hungary", "Europe"),
    ("Iceland", "Europe"),
    ("Ireland", "Europe"),
    ("Italy", "Europe"),
    ("Latvia", "Europe"),
    ("Lithuania", "Europe"),
    ("Luxembourg", "Europe"),
    ("Malta", "Europe"),
    ("Netherlands", "Europe"),
    ("Norway", "Europe"),
    ("Poland", "Europe"),
    ("Portugal", "Europe"),
    ("Romania", "Europe"),
    ("Serbia", "Europe"),
    ("Slovakia", "Europe"),
    ("Slovenia", "Europe"),
    ("Spain", "Europe"),
    ("Sweden", "Europe"),
    ("Switzerland", "Europe"),
    ("Ukraine", "Europe"),
    ("United Kingdom", "Europe"),
    ("Algeria", "Africa"),
    ("Angola", "Africa"),
    ("Cameroon", "Africa"),
    ("Egypt", "Africa"),
    ("Ethiopia", "Africa"),
    ("Ghana", "Africa"),
    ("Ivory Coast", "Africa"),
    ("Kenya", "Africa"),
    ("Morocco", "Africa"),
    ("Mozambique", "Africa"),
    ("Nigeria", "Africa"),
    ("Senegal", "Africa"),
    ("South Africa", "Africa"),
    ("Tanzania", "Africa"),
    ("Tunisia", "Africa"),
    ("Uganda", "Africa"),
    ("Bahrain", "Middle East"),
    ("Iraq", "Middle East"),
    ("Israel", "Middle East"),
    ("Jordan", "Middle East"),
    ("Kuwait", "Middle East"),
    ("Lebanon", "Middle East"),
    ("Oman", "Middle East"),
    ("Palestine", "Middle East"),
    ("Qatar", "Middle East"),
    ("Saudi Arabia", "Middle East"),
    ("Turkey", "Middle East"),
    ("United Arab Emirates", "Middle East"),
    ("Bangladesh", "Asia"),
    ("China", "Asia"),
    ("Hong Kong", "Asia"),
    ("India", "Asia"),
    ("Indonesia", "Asia"),
    ("Japan", "Asia"),
    ("Kazakhstan", "Asia"),
    ("Malaysia", "Asia"),
    ("Pakistan", "Asia"),
    ("Philippines", "Asia"),
    ("Singapore", "Asia"),
    ("South Korea", "Asia"),
    ("Sri Lanka", "Asia"),
    ("Taiwan", "Asia"),
    ("Thailand", "Asia"),
    ("Vietnam", "Asia"),
    ("Australia", "Oceania"),
    ("New Zealand", "Oceania"),
)

_CITIES: tuple[tuple[str, str], ...] = (
    ("Buenos Aires", "Argentina"),
    ("Cordoba", "Argentina"),
    ("Rosario", "Argentina"),
    ("Belo Horizonte", "Brazil"),
    ("Brasilia", "Brazil"),
    ("Campinas", "Brazil"),
    ("Curitiba", "Brazil"),
    ("Florianopolis", "Brazil"),
    ("Fortaleza", "Brazil"),
    ("Porto Alegre", "Brazil"),
    ("Recife", "Brazil"),
    ("Rio de Janeiro", "Brazil"),
    ("Salvador", "Brazil"),
    ("Sao Paulo", "Brazil"),
    ("Santiago", "Chile"),
    ("Bogota", "Colombia"),
    ("Cali", "Colombia"),
    ("Medellin", "Colombia"),
    ("San Jose", "Costa Rica"),
    ("Guayaquil", "Ecuador"),
    ("Quito", "Ecuador"),
    ("Guadalajara", "Mexico"),
    ("Mexico City", "Mexico"),
    ("Monterrey", "Mexico"),
    ("Panama City", "Panama"),
    ("Lima", "Peru"),
    ("Montevideo", "Uruguay"),
    ("Caracas", "Venezuela"),
    ("Montreal", "Canada"),
    ("Toronto", "Canada"),
    ("Vancouver", "Canada"),
    ("Atlanta", "United States"),
    ("Austin", "United States"),
    ("Boston", "United States"),
    ("Chicago", "United States"),
    ("Dallas", "United States"),
    ("Denver", "United States"),
    ("Los Angeles", "United States"),
    ("Miami", "United States"),
    ("New York", "United States"),
    ("Portland", "United States"),
    ("San Diego", "United States"),
    ("San Francisco", "United States"),
    ("Seattle", "United States"),
    ("Washington DC", "United States"),
    ("Vienna", "Austria"),
    ("Brussels", "Belgium"),
    ("Prague", "Czechia"),
    ("Copenhagen", "Denmark"),
    ("Helsinki", "Finland"),
    ("Lyon", "France"),
    ("Paris", "France"),
    ("Berlin", "Germany"),
    ("Munich", "Germany"),
    ("Athens", "Greece"),
    ("Budapest", "Hungary"),
    ("Dublin", "Ireland"),
    ("Milan", "Italy"),
    ("Rome", "Italy"),
    ("Amsterdam", "Netherlands"),
    ("Oslo", "Norway"),
    ("Krakow", "Poland"),
    ("Warsaw", "Poland"),
    ("Lisbon", "Portugal"),
    ("Porto", "Portugal"),
    ("Bucharest", "Romania"),
    ("Barcelona", "Spain"),
    ("Madrid", "Spain"),
    ("Stockholm", "Sweden"),
    ("Geneva", "Switzerland"),
    ("Zurich", "Switzerland"),
    ("Kyiv", "Ukraine"),
    ("Edinburgh", "United Kingdom"),
    ("London", "United Kingdom"),
    ("Manchester", "United Kingdom"),
    ("Cairo", "Egypt"),
    ("Accra", "Ghana"),
    ("Nairobi", "Kenya"),
    ("Casablanca", "Morocco"),
    ("Lagos", "Nigeria"),
    ("Cape Town", "South Africa"),
    ("Johannesburg", "South Africa"),
    ("Tel Aviv", "Israel"),
    ("Istanbul", "Turkey"),
    ("Abu Dhabi", "United Arab Emirates"),
    ("Dubai", "United Arab Emirates"),
    ("Beijing", "China"),
    ("Shanghai", "China"),
    ("Shenzhen", "China"),
    ("Bangalore", "India"),
    ("Delhi", "India"),
    ("Hyderabad", "India"),
    ("Mumbai", "India"),
    ("Jakarta", "Indonesia"),
    ("Osaka", "Japan"),
    ("Tokyo", "Japan"),
    ("Kuala Lumpur", "Malaysia"),
    ("Manila", "Philippines"),
    ("Singapore City", "Singapore"),
    ("Seoul", "South Korea"),
    ("Taipei", "Taiwan"),
    ("Bangkok", "Thailand"),
    ("Ho Chi Minh City", "Vietnam"),
    ("Melbourne", "Australia"),
    ("Sydney", "Australia"),
    ("Auckland", "New Zealand"),
    ("Wellington", "New Zealand"),
)

_ALIASES: dict[str, str] = {
    "anywhere": "Remote / Worldwide",
    "global": "Remote / Worldwide",
    "remote": "Remote / Worldwide",
    "worldwide": "Remote / Worldwide",
    "latam": "Latin America",
    "brasil": "Brazil",
    "sao paulo": "Sao Paulo",
    "sampa": "Sao Paulo",
    "rio": "Rio de Janeiro",
    "bs as": "Buenos Aires",
    "usa": "United States",
    "us": "United States",
    "united states of america": "United States",
    "uk": "United Kingdom",
    "great britain": "United Kingdom",
    "england": "United Kingdom",
    "uae": "United Arab Emirates",
    "emirates": "United Arab Emirates",
    "south korea": "South Korea",
    "korea": "South Korea",
    "czechia": "Czechia",
    "czech republic": "Czechia",
    "holland": "Netherlands",
    "the netherlands": "Netherlands",
    "lisboa": "Lisbon",
    "cdmx": "Mexico City",
    "ciudad de mexico": "Mexico City",
    "nyc": "New York",
    "sf": "San Francisco",
    "la": "Los Angeles",
    "dc": "Washington DC",
    "washington": "Washington DC",
    "hong kong sar": "Hong Kong",
    "viet nam": "Vietnam",
    "turkiye": "Turkey",
    "bengaluru": "Bangalore",
}


def _build_regions() -> tuple[Region, ...]:
    regions = [_region("Remote / Worldwide", "global")]
    regions.extend(_region(name, "macro") for name in _MACROS)
    regions.extend(
        _region(name, "country", parent) for name, parent in _COUNTRIES
    )
    regions.extend(_region(name, "city", parent) for name, parent in _CITIES)
    return tuple(regions)


REGIONS: tuple[Region, ...] = _build_regions()
_BY_NAME: dict[str, Region] = {region.name: region for region in REGIONS}
_BY_KEY: dict[str, str] = {_fold(region.name): region.name for region in REGIONS}
for alias, canonical in _ALIASES.items():
    _BY_KEY.setdefault(_fold(alias), canonical)


def list_regions() -> list[dict[str, str | None]]:
    return [
        {"name": region.name, "kind": region.kind, "parent": region.parent}
        for region in REGIONS
    ]


def canonical_region(value: str) -> str | None:
    key = _fold(value)
    if not key:
        return None
    return _BY_KEY.get(key)


def region_lineage(value: str) -> tuple[str, ...]:
    current = canonical_region(value)
    if current is None:
        return ()
    lineage: list[str] = []
    seen: set[str] = set()
    while current and current not in seen:
        seen.add(current)
        lineage.append(current)
        parent = _BY_NAME[current].parent
        current = parent
    return tuple(lineage)


def regions_compatible(left: str, right: str) -> bool:
    left_name = canonical_region(left)
    right_name = canonical_region(right)
    if left_name is None or right_name is None:
        return False
    if left_name == "Remote / Worldwide" or right_name == "Remote / Worldwide":
        return True
    left_line = region_lineage(left_name)
    right_line = region_lineage(right_name)
    return left_name in right_line or right_name in left_line

import re
from typing import Tuple, Optional

# High hazard emergency patterns and keywords
EMERGENCY_RULES = [
    {
        "category": "ELECTRICAL_HAZARD",
        "patterns": [
            r"live\s+(?:electric|electrical)?\s*wire",
            r"exposed\s+(?:high[\s-]voltage|electric|electrical)?\s*(?:cable|wire)",
            r"electric\s+shock",
            r"sparking\s+(?:transformer|wire|pole|cable)",
            r"transformer\s+(?:blast|explosion|fire)",
            r"electrocution",
            r"hanging\s+(?:electric|electrical|power)\s*line",
            r"snapped\s+power\s*line"
        ],
        "reason": "Immediate risk of electrocution or electrical explosion in a public area."
    },
    {
        "category": "FIRE_EXPLOSION",
        "patterns": [
            r"\bfire\b",
            r"\bexplosion\b",
            r"\bblaze\b",
            r"gas\s*leak",
            r"lpg\s*(?:cylinder|leak|smell)",
            r"chemical\s*leak",
            r"toxic\s*(?:fumes|gas|smoke)"
        ],
        "reason": "Immediate risk of fire, explosion, or asphyxiation requiring instant containment."
    },
    {
        "category": "STRUCTURAL_COLLAPSE",
        "patterns": [
            r"collapsed\s+building",
            r"building\s+collapse",
            r"bridge\s+collapse",
            r"wall\s+collapse",
            r"cracked\s+pillar\s+falling",
            r"roof\s+cave[\s-]in",
            r"landslide",
            r"sinkhole"
        ],
        "reason": "Severe structural collapse creating catastrophic public hazard."
    },
    {
        "category": "PEDESTRIAN_ROAD_SAFETY",
        "patterns": [
            r"open\s+manhole",
            r"uncovered\s+manhole",
            r"missing\s+manhole\s+cover",
            r"fatal\s+accident",
            r"major\s+accident",
            r"pile[\s-]up",
            r"deep\s+drain\s+open"
        ],
        "reason": "Severe physical trap or immediate fatal vehicle/pedestrian hazard."
    },
    {
        "category": "LIFE_THREATENING",
        "patterns": [
            r"life[\s-]threatening",
            r"critical\s+danger",
            r"people\s+trapped",
            r"drowning\s+risk",
            r"severe\s+poisoning",
            r"contaminated\s+drinking\s+water\s+hospital"
        ],
        "reason": "Direct life-threatening scenario detected."
    }
]


def check_emergency(title: str, description: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Perform deterministic backend safety check for critical public emergencies.
    Returns:
        (is_emergency: bool, emergency_category: Optional[str], emergency_reason: Optional[str])
    """
    combined_text = f"{title} {description}".lower()

    for rule in EMERGENCY_RULES:
        for pattern in rule["patterns"]:
            if re.search(pattern, combined_text, re.IGNORECASE):
                return True, rule["category"], rule["reason"]

    return False, None, None

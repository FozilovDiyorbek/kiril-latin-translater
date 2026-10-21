"""
Uzbek Transliteration Orthographical Rules & Letter Mappings
Supports bidirectional (Latin <-> Cyrillic) conversion with context-awareness.
"""

import re
from typing import Dict, List, Tuple

# All variations of Uzbek Latin apostrophes and modifier letters
APOSTROPHE_VARIANTS = ["'", "ʻ", "ʼ", "’", "`", "´", "‘"]

# Vowels in Latin and Cyrillic for context checking
LATIN_VOWELS = set("aeiouAEIOU")
LATIN_VOWELS_WITH_O = LATIN_VOWELS | set("o'oʻoʼo’g'gʻgʼg’O'OʻOʼO’G'GʻGʼG’")
CYRILLIC_VOWELS = set("аеёиоуэюяАЕЁИОУЭЮЯўЎ")

# Mappings for single characters (Latin -> Cyrillic)
LATIN_TO_CYRILLIC_SINGLE: Dict[str, str] = {
    'a': 'а', 'A': 'А',
    'b': 'б', 'B': 'Б',
    'd': 'д', 'D': 'Д',
    'f': 'ф', 'F': 'Ф',
    'g': 'г', 'G': 'Г',
    'h': 'ҳ', 'H': 'Ҳ',
    'i': 'и', 'I': 'И',
    'j': 'ж', 'J': 'Ж',
    'k': 'к', 'K': 'К',
    'l': 'л', 'L': 'Л',
    'm': 'м', 'M': 'М',
    'n': 'н', 'N': 'Н',
    'o': 'о', 'O': 'О',
    'p': 'п', 'P': 'П',
    'q': 'қ', 'Q': 'Қ',
    'r': 'р', 'R': 'Р',
    's': 'с', 'S': 'С',
    't': 'т', 'T': 'Т',
    'u': 'у', 'U': 'У',
    'v': 'в', 'V': 'В',
    'x': 'х', 'X': 'Х',
    'y': 'й', 'Y': 'Й',
    'z': 'з', 'Z': 'З',
}

# Mappings for single characters (Cyrillic -> Latin)
CYRILLIC_TO_LATIN_SINGLE: Dict[str, str] = {
    'а': 'a', 'А': 'A',
    'б': 'b', 'Б': 'B',
    'в': 'v', 'В': 'V',
    'г': 'g', 'Г': 'G',
    'д': 'd', 'Д': 'D',
    'ж': 'j', 'Ж': 'J',
    'з': 'z', 'З': 'Z',
    'и': 'i', 'И': 'I',
    'й': 'y', 'Й': 'Y',
    'к': 'k', 'К': 'K',
    'л': 'l', 'Л': 'L',
    'м': 'm', 'М': 'M',
    'н': 'n', 'Н': 'N',
    'о': 'o', 'О': 'O',
    'п': 'p', 'П': 'P',
    'р': 'r', 'Р': 'R',
    'с': 's', 'С': 'S',
    'т': 't', 'Т': 'T',
    'у': 'u', 'У': 'U',
    'ф': 'f', 'Ф': 'F',
    'х': 'x', 'Х': 'X',
    'ҳ': 'h', 'Ҳ': 'H',
    'қ': 'q', 'Қ': 'Q',
    'э': 'e', 'Э': 'E',
    'щ': 'sh', 'Щ': 'Sh',
    'ы': 'i',  'Ы': 'I',
    'ь': '',  'Ь': '',  # Soft sign is omitted or converted contextually
}

def normalize_apostrophes(text: str) -> str:
    """Normalizes all non-standard apostrophes in Latin text to standard single quote '."""
    for apos in APOSTROPHE_VARIANTS:
        if apos != "'":
            text = text.replace(apos, "'")
    return text

def apply_case(original: str, converted: str) -> str:
    """Applies original token case (UPPERCASE, Titlecase, lowercase) to converted string."""
    if original.isupper():
        return converted.upper()
    elif original.istitle() or (len(original) > 0 and original[0].isupper() and original.islower() == False and any(c.islower() for c in original)):
        return converted.capitalize()
    return converted

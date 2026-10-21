"""
Custom & Domain Dictionary Manager with Morphological Uzbek Stemming
Supports exact lookups + agglutinative suffix stripping for Russian-keyboard Cyrillic.
"""

from typing import Dict, Optional, Tuple

# Common Uzbek Cyrillic agglutinative suffixes sorted by length descending
UZBEK_CYRILLIC_SUFFIXES = [
    "ларидаги", "ларидан", "ларимиз", "ларингиз", "никидаги", "нгиздаги",
    "лардаги", "лардан", "ларига", "ларни", "ларим", "ларинг", "ларда", "лари",
    "никига", "никида", "никини", "никидан",
    "миздан", "нгиздан", "имизга", "ингизга", "ларим",
    "даги", "нинг", "зига", "зида", "зидан", "нгизда", "мизда",
    "лари", "лар", "дан", "га", "да", "ни",
    "миз", "нгиз", "им", "инг", "и", "си", "зи",
    "лик", "лоқ", "лок", "роқ", "рок", "ди", "ган", "ши", "са", "ман", "миз", "сиз"
]

class DictionaryManager:
    """Manages custom user, domain, and proper noun exception dictionaries."""

    def __init__(self):
        # High-frequency Uzbek words typed on Russian keyboards (Russian к, х, г, у/о -> Uzbek q, h, g', o')
        self.cyrillic_to_latin_defaults: Dict[str, str] = {
            # --- Q words (Russian к -> q) ---
            "карор": "qaror", "кабул": "qabul", "качон": "qachon", "каер": "qayer",
            "каерда": "qayerda", "каерга": "qayerga", "каердан": "qayerdan",
            "кандай": "qanday", "карши": "qarshi", "кадам": "qadam", "калам": "qalam",
            "калб": "qalb", "кадри": "qadri", "кадр": "qadr", "кайнона": "qaynona",
            "кайнота": "qaynota", "кайта": "qayta", "кайтадан": "qaytadan", "кайси": "qaysi",
            "катори": "qatori", "катор": "qator", "кават": "qavat", "каватли": "qavatli",
            "каттик": "qattiq", "кайноқ": "qaynoq", "кишлок": "qishloq", "кишлоги": "qishlog'i",
            "киз": "qiz", "килмок": "qilmoq", "килинган": "qilingan", "килиш": "qilish",
            "килинди": "qilindi", "килди": "qildi", "килади": "qiladi", "киламан": "qilaman",
            "киламиз": "qilamiz", "киласиз": "qilasiz", "килса": "qilsa", "килувчи": "qiluvchi",
            "кизикарли": "qiziqarli", "кизик": "qiziq", "кисқа": "qisqa", "кисм": "qism",
            "кисман": "qisman", "куёш": "quyosh", "кувнок": "quvnoq", "кул": "qo'l",
            "курол": "qurol", "кувват": "quvvat", "курилиш": "qurilish", "куриш": "qurish",
            "курилган": "qurilgan", "куйидаги": "quyidagi", "куйидагилар": "quyidagilar",
            "куш": "qush", "кути": "quti", "кулай": "qulay", "кулайлик": "qulaylik",
            "конун": "qonun", "конуний": "qonuniy", "коида": "qoida", "коидалар": "qoidalar",
            "кора": "qora", "корин": "qorin", "коп": "qop", "козон": "qozon", "кош": "qosh",
            "кошик": "qoshiq", "кон": "qon", "кишлоқ": "qishloq", "қишлок": "qishloq",
            "буюк": "buyuk", "кулок": "quloq", "узок": "uzoq", "иссик": "issiq",
            "совук": "sovuq", "балик": "baliq", "очик": "ochiq", "ёпик": "yopiq",
            "курук": "quruq", "суюк": "suyuq", "йирик": "yirik", "тезрок": "tezroq",
            "яхширок": "yaxshiroq", "каттарок": "kattaroq", "купрок": "ko'proq",
            "хукук": "huquq", "хукукий": "huquqiy", "хакикат": "haqiqat",

            # --- H words (Russian х -> h) ---
            "хаёт": "hayot", "хаётий": "hayotiy", "хурмат": "hurmat", "хурматли": "hurmatli",
            "шахар": "shahar", "шахри": "shahri", "хамма": "hamma", "хаммаси": "hammasi",
            "хаво": "havo", "хеч": "hech", "харакат": "harakat",
            "хак": "haq", "хакида": "haqida", "хакидаги": "haqidagi",
            "хукумат": "hukumat", "худуд": "hudud", "худудий": "hududiy", "хозир": "hozir",
            "хозирги": "hozirgi", "хол": "hol", "холат": "holat", "холда": "holda",
            "хисоб": "hisob", "хисобот": "hisobot", "хисобланган": "hisoblangan",
            "хам": "ham", "хамиша": "hamisha", "хамкор": "hamkor", "хамкорлик": "hamkorlik",
            "хафта": "hafta", "хунар": "hunar",

            # --- O' words (Russian у/о -> o') ---
            "узбек": "o'zbek", "узбекистон": "o'zbekiston", "узи": "o'zi", "узини": "o'zini",
            "узингиз": "o'zingiz", "урганиш": "o'rganish", "урганган": "o'rgangan",
            "укиш": "o'qish", "укитувчи": "o'qituvchi", "укувчи": "o'quvchi",
            "урта": "o'rta", "уртасида": "o'rtasida", "уртача": "o'rtacha", "урин": "o'rin",
            "усимлик": "o'simlik", "уткир": "o'tkir", "узгартириш": "o'zgartirish",
            "узгариш": "o'zgarish", "утган": "o'tgan",

            # --- G' words (Russian г -> g') ---
            "бог": "bog'", "тог": "tog'", "сог": "sog'", "буг": "bug'", "дог": "dog'",
            "соглиқ": "sog'liq", "соглом": "sog'lom", "боглаш": "bog'lash",
            "богланган": "bog'langan", "богланиш": "bog'lanish", "огрик": "og'riq",
            "йиглаш": "yig'lash",

            # Defaults
            "шуберт": "schubert", "шопен": "chopin",
        }

        self.latin_to_cyrillic_defaults: Dict[str, str] = {
            "schubert": "шуберт",
            "chopin": "шопен",
            "tsht": "тшт",
        }

    def lookup(self, word: str, direction: str, custom_dict: Optional[Dict[str, str]] = None) -> Optional[str]:
        """
        Looks up a word in user dictionary or default exceptions with agglutinative stemming.
        Preserves original capitalization (lower, Title, UPPER).
        """
        word_lower = word.lower()

        # 1. Check custom user dictionary first (exact match)
        if custom_dict and word_lower in custom_dict:
            return self._match_case(word, custom_dict[word_lower])

        # 2. Check direction defaults
        target_dict = self.cyrillic_to_latin_defaults if direction == "cyrillic_to_latin" else self.latin_to_cyrillic_defaults

        # 2a. Direct exact match
        if word_lower in target_dict:
            return self._match_case(word, target_dict[word_lower])

        # 2b. Morphological agglutinative stem match (for Cyrillic -> Latin)
        if direction == "cyrillic_to_latin":
            stem_match = self._stem_lookup(word_lower, target_dict)
            if stem_match:
                return self._match_case(word, stem_match)

        return None

    def _stem_lookup(self, word_lower: str, target_dict: Dict[str, str]) -> Optional[str]:
        """Strips common Uzbek Cyrillic suffixes and checks if stem exists in exception dictionary."""
        from app.core.rules import CYRILLIC_TO_LATIN_SINGLE

        for suffix in UZBEK_CYRILLIC_SUFFIXES:
            if word_lower.endswith(suffix) and len(word_lower) > len(suffix):
                stem = word_lower[:-len(suffix)]
                if stem in target_dict:
                    lat_stem = target_dict[stem]
                    # Transliterate suffix character by character
                    lat_suffix = "".join(CYRILLIC_TO_LATIN_SINGLE.get(c, c) for c in suffix)
                    return lat_stem + lat_suffix
        return None

    def _match_case(self, original: str, target: str) -> str:
        if original.isupper():
            return target.upper()
        elif original.istitle() or (len(original) > 0 and original[0].isupper()):
            return target.capitalize()
        return target.lower()

# Singleton instance
dictionary_manager = DictionaryManager()

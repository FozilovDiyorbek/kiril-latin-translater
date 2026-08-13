"""
Enterprise Uzbek Transliteration Engine (Cyrillic ↔ Latin)
High-performance, context-aware, dictionary-backed rules processor.
"""

import re
import time
from typing import Dict, List, Optional, Tuple
from app.core.rules import (
    APOSTROPHE_VARIANTS,
    LATIN_VOWELS,
    CYRILLIC_VOWELS,
    LATIN_TO_CYRILLIC_SINGLE,
    CYRILLIC_TO_LATIN_SINGLE,
    normalize_apostrophes,
)
from app.core.dictionary import dictionary_manager

class TransliterationEngine:
    """Core Transliteration Engine for Uzbek Language."""

    def __init__(self, target_apostrophe: str = "'"):
        self.target_apostrophe = target_apostrophe

    def transliterate(
        self,
        text: str,
        direction: str = "latin_to_cyrillic",
        user_dictionary: Optional[Dict[str, str]] = None,
    ) -> Tuple[str, float]:
        """
        Main entry point for transliterating text.
        Returns tuple of (transliterated_text, execution_time_ms).
        """
        start_time = time.perf_counter()

        if not text:
            return "", 0.0

        if direction == "latin_to_cyrillic":
            result = self._latin_to_cyrillic(text, user_dictionary)
        elif direction == "cyrillic_to_latin":
            result = self._cyrillic_to_latin(text, user_dictionary)
        else:
            raise ValueError(f"Unsupported direction: {direction}. Use 'latin_to_cyrillic' or 'cyrillic_to_latin'.")

        exec_time_ms = (time.perf_counter() - start_time) * 1000.0
        return result, round(exec_time_ms, 3)

    def _latin_to_cyrillic(self, text: str, user_dict: Optional[Dict[str, str]] = None) -> str:
        # Step 1: Normalize all apostrophe variations
        text = normalize_apostrophes(text)

        # Step 2: Split text into tokens keeping apostrophes inside word tokens
        tokens = re.split(r'([^a-zA-Z\']+)', text)
        result_tokens = []

        for token in tokens:
            if not token:
                continue

            # Non-word tokens (spaces, numbers, punctuation) pass through
            if not re.search(r'[a-zA-Z]', token):
                result_tokens.append(token)
                continue

            # Step 3: Check dictionary override
            dict_match = dictionary_manager.lookup(token, "latin_to_cyrillic", user_dict)
            if dict_match:
                result_tokens.append(dict_match)
                continue

            # Step 4: Transliterate word character-by-character
            result_tokens.append(self._transliterate_latin_word(token))

        return "".join(result_tokens)

    def _transliterate_latin_word(self, word: str) -> str:
        res = []
        n = len(word)
        i = 0

        while i < n:
            char = word[i]
            char_lower = char.lower()
            next_char = word[i + 1] if i + 1 < n else ""
            next_char_lower = next_char.lower()

            # 1. Check multi-character digraphs: o', g'
            if char_lower == 'o' and next_char in APOSTROPHE_VARIANTS + ["'"]:
                target = 'Ў' if char.isupper() else 'ў'
                res.append(target)
                i += 2
                continue

            if char_lower == 'g' and next_char in APOSTROPHE_VARIANTS + ["'"]:
                target = 'Ғ' if char.isupper() else 'ғ'
                res.append(target)
                i += 2
                continue

            # 2. Check digraphs: sh, ch, ng
            if char_lower == 's' and next_char_lower == 'h':
                target = self._match_case_digraph(char, next_char, 'Ш', 'ш')
                res.append(target)
                i += 2
                continue

            if char_lower == 'c' and next_char_lower == 'h':
                target = self._match_case_digraph(char, next_char, 'Ч', 'ч')
                res.append(target)
                i += 2
                continue

            if char_lower == 'n' and next_char_lower == 'g':
                target = self._match_case_digraph(char, next_char, 'НГ', 'нг', title_upper='Нг')
                res.append(target)
                i += 2
                continue

            # 3. Check diphthongs / multi-char vowels: yo, yu, ya, ye, ts
            if char_lower == 'y' and next_char_lower in ('o', 'u', 'a', 'e'):
                vowel_map = {'o': 'Ё', 'u': 'Ю', 'a': 'Я', 'e': 'Е'}
                vowel_map_lower = {'o': 'ё', 'u': 'ю', 'a': 'я', 'e': 'е'}
                cap_target = vowel_map[next_char_lower]
                low_target = vowel_map_lower[next_char_lower]
                target = self._match_case_digraph(char, next_char, cap_target, low_target)
                res.append(target)
                i += 2
                continue

            if char_lower == 't' and next_char_lower == 's':
                target = self._match_case_digraph(char, next_char, 'Ц', 'ц')
                res.append(target)
                i += 2
                continue

            # 4. Contextual E / e check
            if char_lower == 'e':
                # Word-initial or post-vowel -> э / Э
                is_start = (i == 0)
                prev_char = word[i - 1] if i > 0 else ""
                prev_is_vowel = (prev_char.lower() in LATIN_VOWELS)

                if is_start or prev_is_vowel:
                    res.append('Э' if char.isupper() else 'э')
                else:
                    res.append('Е' if char.isupper() else 'е')
                i += 1
                continue

            # 5. Apostrophe / Tutuq belgisi handling (')
            if char in APOSTROPHE_VARIANTS + ["'"]:
                # If preceded by letter and followed by letter -> tutuq belgisi ъ
                prev_char = word[i - 1] if i > 0 else ""
                if prev_char.isalpha() and next_char.isalpha():
                    res.append('ъ')
                i += 1
                continue

            # 6. Single character mapping
            if char in LATIN_TO_CYRILLIC_SINGLE:
                res.append(LATIN_TO_CYRILLIC_SINGLE[char])
            else:
                res.append(char)
            i += 1

        return "".join(res)

    def _cyrillic_to_latin(self, text: str, user_dict: Optional[Dict[str, str]] = None) -> str:
        # Split into tokens
        tokens = re.split(r'([^\u0400-\u04FF]+)', text)
        result_tokens = []

        apos = self.target_apostrophe

        for token in tokens:
            if not token:
                continue

            # Non-cyrillic tokens
            if not re.search(r'[\u0400-\u04FF]', token):
                result_tokens.append(token)
                continue

            # Dictionary override check
            dict_match = dictionary_manager.lookup(token, "cyrillic_to_latin", user_dict)
            if dict_match:
                result_tokens.append(dict_match)
                continue

            # Character-by-character transliteration
            result_tokens.append(self._transliterate_cyrillic_word(token, apos))

        return "".join(result_tokens)

    def _transliterate_cyrillic_word(self, word: str, apos: str) -> str:
        res = []
        n = len(word)
        i = 0

        while i < n:
            char = word[i]
            char_lower = char.lower()
            next_char = word[i + 1] if i + 1 < n else ""
            prev_char = word[i - 1] if i > 0 else ""

            # 1. Check Contextual 'е' / 'Е'
            if char_lower == 'е':
                is_start = (i == 0)
                prev_is_vowel = (prev_char.lower() in CYRILLIC_VOWELS or prev_char in "ъЪьЬ")
                if is_start or prev_is_vowel:
                    res.append('Ye' if char.isupper() else 'ye')
                else:
                    res.append('E' if char.isupper() else 'e')
                i += 1
                continue

            # 2. Check 'ё', 'ю', 'я'
            if char_lower == 'ё':
                res.append('Yo' if char.isupper() else 'yo')
                i += 1
                continue
            if char_lower == 'ю':
                res.append('Yu' if char.isupper() else 'yu')
                i += 1
                continue
            if char_lower == 'я':
                res.append('Ya' if char.isupper() else 'ya')
                i += 1
                continue

            # 3. Check 'ў' and 'ғ'
            if char_lower == 'ў':
                target = f"O{apos}" if char.isupper() else f"o{apos}"
                res.append(target)
                i += 1
                continue
            if char_lower == 'ғ':
                target = f"G{apos}" if char.isupper() else f"g{apos}"
                res.append(target)
                i += 1
                continue

            # 4. Check 'ш', 'ч'
            if char_lower == 'ш':
                res.append('Sh' if char.isupper() else 'sh')
                i += 1
                continue
            if char_lower == 'ч':
                res.append('Ch' if char.isupper() else 'ch')
                i += 1
                continue

            # 5. Check 'ц' (Standard Uzbek Latin maps ц -> s)
            if char_lower == 'ц':
                res.append('S' if char.isupper() else 's')
                i += 1
                continue

            # 6. Check Tutuq belgisi ъ / Ъ
            if char_lower == 'ъ':
                res.append(apos)
                i += 1
                continue

            # 7. Check Soft sign ь / Ь
            if char_lower == 'ь':
                # Soft sign is omitted in modern Uzbek Latin
                i += 1
                continue

            # 8. Single character mapping
            if char in CYRILLIC_TO_LATIN_SINGLE:
                res.append(CYRILLIC_TO_LATIN_SINGLE[char])
            else:
                res.append(char)
            i += 1

        return "".join(res)

    def _match_case_digraph(self, c1: str, c2: str, cap: str, low: str, title_upper: Optional[str] = None) -> str:
        if c1.isupper() and c2.isupper():
            return cap
        elif c1.isupper() and c2.islower():
            return title_upper if title_upper else cap[0] + low[1:]
        return low

# Singleton instance
transliterator = TransliterationEngine()

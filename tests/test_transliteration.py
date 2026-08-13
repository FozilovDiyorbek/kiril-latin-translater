"""
Unit Tests for Uzbek Transliteration Engine
"""

import pytest
from app.core.transliterator import transliterator

def test_latin_to_cyrillic_basic():
    text = "O'zbekiston Respublikasi kelajagi buyuk davlatdir."
    res, exec_time = transliterator.transliterate(text, direction="latin_to_cyrillic")
    assert res == "Ўзбекистон Республикаси келажаги буюк давлатдир."

def test_digraphs_case_preservation():
    assert transliterator.transliterate("Shahar", "latin_to_cyrillic")[0] == "Шаҳар"
    assert transliterator.transliterate("SHAHAR", "latin_to_cyrillic")[0] == "ШАҲАР"
    assert transliterator.transliterate("shahar", "latin_to_cyrillic")[0] == "шаҳар"
    assert transliterator.transliterate("Choyxona", "latin_to_cyrillic")[0] == "Чойхона"
    assert transliterator.transliterate("Bodring", "latin_to_cyrillic")[0] == "Бодринг"

def test_e_context_latin_to_cyrillic():
    # Word initial E -> Э
    assert transliterator.transliterate("Ekran", "latin_to_cyrillic")[0] == "Экран"
    assert transliterator.transliterate("Eldor", "latin_to_cyrillic")[0] == "Элдор"
    # Mid-word e -> е
    assert transliterator.transliterate("kelajak", "latin_to_cyrillic")[0] == "келажак"
    # Post-vowel e -> э
    assert transliterator.transliterate("poema", "latin_to_cyrillic")[0] == "поэма"

def test_tutuq_belgisi():
    assert transliterator.transliterate("ma'no", "latin_to_cyrillic")[0] == "маъно"
    assert transliterator.transliterate("e'tibor", "latin_to_cyrillic")[0] == "эътибор"

def test_apostrophe_variants():
    # Test o', oʻ, oʼ, o‘
    for opt in ["O'zbekiston", "Oʻzbekiston", "Oʼzbekiston", "O‘zbekiston"]:
        assert transliterator.transliterate(opt, "latin_to_cyrillic")[0] == "Ўзбекистон"

def test_cyrillic_to_latin_basic():
    text = "Ўзбекистон Республикаси келажаги буюк давлатдир."
    res, exec_time = transliterator.transliterate(text, direction="cyrillic_to_latin")
    assert res == "O'zbekiston Respublikasi kelajagi buyuk davlatdir."

def test_cyrillic_e_context():
    # Word initial е -> ye
    assert transliterator.transliterate("Европа", "cyrillic_to_latin")[0] == "Yevropa"
    # Mid-word е -> e
    assert transliterator.transliterate("келажак", "cyrillic_to_latin")[0] == "kelajak"
    # Э -> e
    assert transliterator.transliterate("Элдор", "cyrillic_to_latin")[0] == "Eldor"

def test_cyrillic_tutuq_and_ts():
    assert transliterator.transliterate("маъно", "cyrillic_to_latin")[0] == "ma'no"
    assert transliterator.transliterate("цирк", "cyrillic_to_latin")[0] == "sirk"
    assert transliterator.transliterate("акция", "cyrillic_to_latin")[0] == "aksiya"

def test_custom_dictionary_override():
    custom_dict = {"schubert": "шуберт", "apple": "эппл"}
    res, _ = transliterator.transliterate("Schubert va Apple", direction="latin_to_cyrillic", user_dictionary=custom_dict)
    assert res == "Шуберт ва Эппл"

def test_russian_keyboard_cyrillic_smart_correction():
    # Tests Uzbek words typed on Russian keyboards (к -> q, х -> h, г -> g', у -> o')
    assert transliterator.transliterate("Карор ва кабул килинди.", "cyrillic_to_latin")[0] == "Qaror va qabul qilindi."
    assert transliterator.transliterate("Качон ва каерда кишлокларда курилган?", "cyrillic_to_latin")[0] == "Qachon va qayerda qishloqlarda qurilgan?"
    assert transliterator.transliterate("Шахар хавоси ва хаёти жуда яхши.", "cyrillic_to_latin")[0] == "Shahar havosi va hayoti juda yaxshi."
    assert transliterator.transliterate("Узбекистон Республикаси конуний хукуклари.", "cyrillic_to_latin")[0] == "O'zbekiston Respublikasi qonuniy huquqlari."
    assert transliterator.transliterate("Иссик ва совук кунларда кулок ва соглиқни асранг.", "cyrillic_to_latin")[0] == "Issiq va sovuq kunlarda quloq va sog'liqni asrang."
    assert transliterator.transliterate("Бог ва тог атрофида буюк бинолар бор.", "cyrillic_to_latin")[0] == "Bog' va tog' atrofida buyuk binolar bor."

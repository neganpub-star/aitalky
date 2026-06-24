package com.aitalky.framework.translate;

/**
 * 本地语种识别(字符集启发式):按 Unicode Script 统计文本字符,判定主要语种,返回 aitalky 语言码。
 * <p>翻译网关不返回真实源语言(恒为 auto)、也无独立识别接口,故本地零依赖识别。
 * <b>能准确区分非拉丁语种</b>(中/日/韩/泰/俄/缅/老);拉丁字母系(英/法/德/西/葡/印尼/马来/土)
 * 互相无法细分,统一默认英文,但越南语含特有附加符可识别。简繁默认简体。
 */
public final class LanguageDetector {

    private LanguageDetector() {
    }

    /** 越南语特有基础字母(拉丁系中据此与英文区分) */
    private static final String VI_CHARS = "ăâđêôơưĂÂĐÊÔƠƯ";

    /**
     * 识别文本主要语种,返回 aitalky 语言码(zh_CN/en_US...);无字母字符返回 null。
     */
    public static String detect(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        int han = 0, kana = 0, hangul = 0, thai = 0, cyrillic = 0, myanmar = 0, lao = 0, latin = 0, vi = 0, total = 0;
        for (int i = 0; i < text.length(); ) {
            int cp = text.codePointAt(i);
            i += Character.charCount(cp);
            if (!Character.isLetter(cp)) {
                continue; // 跳过标点/数字/空白/emoji
            }
            total++;
            // 越南语:特有基础字母,或 Latin Extended Additional 声调块(U+1EA0–U+1EFF,几乎专属越南语,如 ạ ả ề ộ)
            if (VI_CHARS.indexOf(cp) >= 0 || (cp >= 0x1EA0 && cp <= 0x1EFF)) {
                vi++;
            }
            Character.UnicodeScript s;
            try {
                s = Character.UnicodeScript.of(cp);
            } catch (IllegalArgumentException e) {
                continue;
            }
            switch (s) {
                case HIRAGANA, KATAKANA -> kana++;
                case HAN -> han++;
                case HANGUL -> hangul++;
                case THAI -> thai++;
                case CYRILLIC -> cyrillic++;
                case MYANMAR -> myanmar++;
                case LAO -> lao++;
                case LATIN -> latin++;
                default -> { }
            }
        }
        if (total == 0) {
            return null;
        }
        // 优先非拉丁特征脚本(日文常混汉字,故先判假名;韩文偶混汉字,故 hangul 优先于 han)
        if (kana > 0) {
            return "ja_JP";
        }
        if (hangul > 0) {
            return "ko_KR";
        }
        if (thai > 0) {
            return "th_TH";
        }
        if (lao > 0) {
            return "lo_LA";
        }
        if (myanmar > 0) {
            return "my_MM";
        }
        if (cyrillic > 0) {
            return "ru_RU";
        }
        if (han > 0) {
            return "zh_CN"; // 纯汉字=中文(简繁难分,默认简体)
        }
        if (latin > 0) {
            return vi > 0 ? "vi_VN" : "en_US"; // 拉丁系:含越南语特字=越南,否则默认英文
        }
        return null;
    }
}

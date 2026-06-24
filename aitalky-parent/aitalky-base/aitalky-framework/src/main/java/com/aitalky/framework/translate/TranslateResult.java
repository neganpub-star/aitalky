package com.aitalky.framework.translate;

/**
 * 翻译结果。
 *
 * @param translatedText 译文
 * @param sourceLanguage 引擎识别出的源语言(用于「语种识别」回填客户源语言;auto 检测)
 * @param charCount      参与计费的字符数(以源文本字符数计,对齐参考系统)
 */
public record TranslateResult(String translatedText, String sourceLanguage, int charCount) {
}

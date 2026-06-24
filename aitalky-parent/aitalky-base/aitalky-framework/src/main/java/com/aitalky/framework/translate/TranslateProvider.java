package com.aitalky.framework.translate;

/**
 * 翻译引擎抽象(仿 PaymentChannel):新增引擎只加一个实现类,按 {@link #key()} 注册,
 * 配置 {@code aitalky.translate.provider} 切换。当前实现:{@code ali-gateway}(阿里云机翻网关);
 * 后续可加 {@code claude} 等 LLM 引擎。
 */
public interface TranslateProvider {

    /** 引擎唯一标识,与配置 aitalky.translate.provider 对应 */
    String key();

    /**
     * 翻译。
     * @param text       原文
     * @param targetLang aitalky 标准语言码(zh_CN/en_US/ja_JP...),由各实现内部映射成自己引擎的码
     * @return 译文 + 识别出的源语言 + 计费字符数
     */
    TranslateResult translate(String text, String targetLang);
}

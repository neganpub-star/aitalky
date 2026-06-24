package com.aitalky.framework.translate;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 翻译入口:按配置 {@code aitalky.translate.provider} 选用引擎执行翻译。
 * <p>纯翻译能力,不涉及配额/消息存储(那些由上层 app 编排)。引擎可配可扩——
 * 注入所有 {@link TranslateProvider} 按 key 索引,加引擎只加实现类。
 */
@Slf4j
@Service
public class TranslateService {

    private final TranslateProperties props;
    private final Map<String, TranslateProvider> providers;

    public TranslateService(TranslateProperties props, List<TranslateProvider> providerList) {
        this.props = props;
        this.providers = providerList.stream()
                .collect(Collectors.toMap(TranslateProvider::key, Function.identity()));
    }

    public boolean enabled() {
        return props.enabled();
    }

    /**
     * 翻译。
     * @param text       原文
     * @param targetLang aitalky 标准语言码(zh_CN/en_US...)
     * @return 译文 + 源语言 + 计费字符数
     */
    public TranslateResult translate(String text, String targetLang) {
        if (!props.enabled()) {
            throw new BizException(ResultCode.SYSTEM_ERROR);
        }
        TranslateProvider provider = providers.get(props.provider());
        if (provider == null) {
            log.error("未找到翻译引擎 provider={}, 已注册={}", props.provider(), providers.keySet());
            throw new BizException(ResultCode.SYSTEM_ERROR);
        }
        return provider.translate(text, targetLang);
    }
}

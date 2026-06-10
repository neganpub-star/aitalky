package com.aitalky.messenger.service;

import com.aitalky.messenger.dto.MessengerConfigVO;
import com.aitalky.messenger.dto.MessengerLanguageVO;
import com.aitalky.messenger.dto.MessengerPublicVO;

import java.util.List;

/** 信使配置服务(品牌/欢迎语/紧急通知等;project_id 多租户隔离) */
public interface MessengerConfigService {

    /** 读取当前项目信使配置(后管,依赖登录租户上下文);无配置返回默认值 */
    MessengerConfigVO getConfig();

    /** 保存当前项目信使配置(后管,整体覆盖式 upsert) */
    void saveConfig(MessengerConfigVO vo);

    /**
     * 信使端公开配置(init 带出):显式按 projectId 查询,不依赖租户上下文。
     * @param lang 客户语言;该语言无内容时回退默认语言。无配置返回 null。
     */
    MessengerPublicVO getPublicConfig(Long projectId, String lang);

    /** 当前项目启用语种(默认语种排前);无配置返回 简体中文+英文 */
    List<MessengerLanguageVO> listLanguages();

    /** 覆盖式保存当前项目启用语种(增删 + 设默认,恰好一个默认) */
    void saveLanguages(List<MessengerLanguageVO> languages);
}

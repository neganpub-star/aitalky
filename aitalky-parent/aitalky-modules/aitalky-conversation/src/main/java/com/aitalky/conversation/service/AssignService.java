package com.aitalky.conversation.service;

import com.aitalky.conversation.dto.AssignConfigVO;

import java.util.List;

/**
 * 会话分配设置(普通分配模式):分配规则/最大会话数 + 参与队友。
 * 参与队友增删实时保存(对齐参考,无需额外"保存"按钮)。
 */
public interface AssignService {

    /** 取项目分配配置(无则返回默认:轮流/不限) */
    AssignConfigVO getConfig(Long projectId);

    /** 更新分配规则与最大会话数 */
    void updateConfig(Long projectId, Integer assignMode, Integer maxConcurrent);

    /** 参与自动分配的队友成员ID列表 */
    List<Long> participantIds(Long projectId);

    /** 添加参与队友(实时保存;已存在忽略) */
    void addParticipant(Long projectId, Long memberId);

    /** 移除参与队友(实时保存) */
    void removeParticipant(Long projectId, Long memberId);
}

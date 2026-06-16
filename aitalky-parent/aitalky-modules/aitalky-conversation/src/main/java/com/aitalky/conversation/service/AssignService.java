package com.aitalky.conversation.service;

import com.aitalky.conversation.dto.AsnGroupVO;
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

    /** 更新会话保持期(分钟):空闲超过该时长由定时任务自动结束;<=0=不自动(开关关)。独立于分配规则,互不覆盖 */
    void updateRetention(Long projectId, Integer autoCloseIdleMinutes);

    /** 参与自动分配的队友成员ID列表 */
    List<Long> participantIds(Long projectId);

    /** 添加参与队友(实时保存;已存在忽略) */
    void addParticipant(Long projectId, Long memberId);

    /** 移除参与队友(实时保存) */
    void removeParticipant(Long projectId, Long memberId);

    /**
     * 轮流分配:在候选(升序)中取游标之后的下一个并推进游标;候选空返回 null。
     * 游标持久化在分配配置上,实现跨会话的顺序轮转。
     */
    Long nextRoundRobin(Long projectId, java.util.List<Long> candidatesAsc);

    // ============ 专属分配模式(P2):专属策略 CRUD + 接入解析 ============

    /** 项目下全部专属策略(asn_group type=2),含各自参与队友ID */
    List<AsnGroupVO> listGroups(Long projectId);

    /** 新增专属策略:自动生成唯一 groupKey,落库策略 + 队友。返回含 id/groupKey 的 VO */
    AsnGroupVO createGroup(Long projectId, String name, String remark, List<Long> memberIds);

    /** 编辑专属策略(名称/备注/队友全量覆盖);groupKey 不可改(保证接入 URL 稳定) */
    void updateGroup(Long projectId, Long groupId, String name, String remark, List<Long> memberIds);

    /** 删除专属策略(软删策略 + 物理清空队友);存量会话保留 group_id 引用不动 */
    void deleteGroup(Long projectId, Long groupId);

    /** 某专属策略的参与队友成员ID(供分配引擎按 conv.groupId 取范围) */
    List<Long> groupMembers(Long groupId);

    /** 接入时按 groupKey 反解专属策略id(限本项目、type=2、未删);不存在返回 null(降级普通分配) */
    Long resolveGroupId(Long projectId, String groupKey);
}

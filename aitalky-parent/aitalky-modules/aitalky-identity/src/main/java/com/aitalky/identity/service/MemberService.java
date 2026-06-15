package com.aitalky.identity.service;

import com.aitalky.common.api.PageResult;
import com.aitalky.identity.dto.MemberBrief;
import com.aitalky.identity.dto.MemberQuery;
import com.aitalky.identity.dto.MemberVO;
import com.aitalky.identity.dto.ProfileVO;
import com.aitalky.identity.dto.PushSettingsVO;

/**
 * 成员管理服务(均在当前项目范围内,多租户拦截器自动隔离)。
 * <p>管理操作需「member.manage」功能权限(由 Controller 注解校验);项目负责人不可被改角色/禁用/删除。
 */
public interface MemberService {

    /** 分页查询成员 */
    PageResult<MemberVO> page(MemberQuery query);

    /** 调整角色 */
    void updateRole(Long memberId, Long roleId);

    /** 重命名(改昵称) */
    void rename(Long memberId, String nickname);

    /** 修改头像 */
    void updateAvatar(Long memberId, String avatar);

    /** 设置工作状态(坐席自助:1在线 0离开)。对齐参考系统——在线是参与自动分配的前提 */
    void updateWorkStatus(Long memberId, Integer workStatus);

    /**
     * 信使端用:取指定项目某成员的坐席展示信息(含在线工作状态)。
     * 信使无成员租户上下文,故显式 projectId + 绕开多租户拦截器;成员不存在/被删返回 null。
     */
    com.aitalky.identity.dto.MemberAgent agentOf(Long projectId, Long memberId);

    /**
     * 信使端用:取项目的坐席列表。onlineOnly=true 只取工作状态在线的;按创建时间升序,最多 limit 个。
     * 仅含启用(status=1)成员;显式 projectId + 绕租户。
     */
    java.util.List<com.aitalky.identity.dto.MemberAgent> agentsOf(Long projectId, boolean onlineOnly, int limit);

    /** 启用/禁用(status 1启用 0禁用) */
    void updateStatus(Long memberId, Integer status);

    /** 删除成员(逻辑删除) */
    void delete(Long memberId);

    /** 成员轻量信息(昵称/头像),用于消息发送者快照 */
    MemberBrief brief(Long memberId);

    /** 个人中心资料:账户邮箱 + 当前项目成员信息聚合(含是否 owner、偏好设置) */
    ProfileVO profile(Long memberId);

    /** 更新个人偏好(语言/声音/推送);传 null 的字段不改 */
    void updatePreferences(Long memberId, String language, Integer soundEnabled, Integer pushEnabled);

    /** 系统推送设置(4 类消息 x APP/Web) */
    PushSettingsVO pushSettings(Long memberId);

    /** 更新系统推送设置(整体覆盖 8 个开关) */
    void updatePushSettings(Long memberId, PushSettingsVO settings);
}

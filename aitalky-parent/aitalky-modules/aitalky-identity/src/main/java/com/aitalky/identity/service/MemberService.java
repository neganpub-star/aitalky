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

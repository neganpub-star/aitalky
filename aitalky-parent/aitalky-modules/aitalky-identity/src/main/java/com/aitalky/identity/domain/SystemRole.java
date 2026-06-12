package com.aitalky.identity.domain;

/**
 * 预置系统角色模板(创建项目时为该项目写入这 3 条,is_system=1,名/权限不可改)。
 * <p>权限 JSON 与 {@code sql/02-seed.sql} 末尾的模板保持一致:
 * pages 页面权限、functions 功能权限。
 */
public enum SystemRole {

    /** 负责人:全部权限(billing 仅其可用) */
    OWNER("负责人", """
            {"pages":["inbox","customers","statistics","settings"],\
            "functions":["inbox.viewAll","inbox.viewUnassigned","inbox.search","conversation.send","conversation.withdraw",\
            "conversation.transfer","conversation.close","conversation.blacklist","member.manage","role.manage",\
            "messenger.setting","assign.setting","group.manage","quickreply.manage","blacklist.manage",\
            "project.setting","billing.manage"]}"""),

    /** 管理员:除 billing.manage 外的全部 */
    ADMIN("管理员", """
            {"pages":["inbox","customers","statistics","settings"],\
            "functions":["inbox.viewAll","inbox.viewUnassigned","inbox.search","conversation.send","conversation.withdraw",\
            "conversation.transfer","conversation.close","conversation.blacklist","member.manage","role.manage",\
            "messenger.setting","assign.setting","group.manage","quickreply.manage","blacklist.manage","project.setting"]}"""),

    /** 普通成员:只看 我的/提及我的;能回复/撤回/结束;无管理与设置 */
    MEMBER("普通成员", """
            {"pages":["inbox","customers"],\
            "functions":["inbox.search","conversation.send","conversation.withdraw","conversation.close"]}""");

    /** 角色显示名 */
    private final String roleName;
    /** 权限 JSON 文本 */
    private final String permissions;

    SystemRole(String roleName, String permissions) {
        this.roleName = roleName;
        this.permissions = permissions;
    }

    public String getRoleName() {
        return roleName;
    }

    public String getPermissions() {
        return permissions;
    }
}

package com.aitalky.platform.constant;

import java.util.Arrays;
import java.util.List;

/**
 * 平台后管「可分配功能码」单一来源。
 * <p>角色的 permissions 即从这里挑选;新增后管菜单 = 这里加一项 + Controller 标 {@code @RequiresFunction} + 前端菜单加 perm。
 * <p>Dashboard 人人可见,不在此列(不需要权限码)。
 */
public enum AdminFunction {

    USERS("users", "用户管理", "Users"),
    TENANTS("tenants", "项目管理", "Projects"),
    PLANS("plans", "套餐管理", "Plans"),
    ADDONS("addons", "加量包", "Add-on Packs"),
    AGREEMENTS("agreements", "协议管理", "Agreements"),
    DICT("dict", "语种字典", "Languages"),
    ADMINS("admins", "账号管理", "Admins"),
    ROLES("roles", "角色管理", "Roles");

    /** 功能码(写入角色 permissions / 接口 @RequiresFunction 校验) */
    private final String code;
    /** 中文名(角色勾选框展示) */
    private final String zhName;
    /** 英文名 */
    private final String enName;

    AdminFunction(String code, String zhName, String enName) {
        this.code = code;
        this.zhName = zhName;
        this.enName = enName;
    }

    public String getCode() {
        return code;
    }

    public String getZhName() {
        return zhName;
    }

    public String getEnName() {
        return enName;
    }

    /** 全部功能码(按枚举声明顺序),供角色管理页渲染勾选项 */
    public static List<AdminFunction> all() {
        return Arrays.asList(values());
    }
}

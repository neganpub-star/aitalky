package com.aitalky.platform.service;

import com.aitalky.common.api.PageResult;
import com.aitalky.platform.dto.AdminQuery;
import com.aitalky.platform.dto.AdminVO;
import com.aitalky.platform.dto.SaveAdminCmd;

/**
 * 平台管理员账号管理:CRUD + 启停 + 重置密码。
 */
public interface PfAdminManageService {

    /** 管理员分页(关键词=用户名/姓名,可按状态筛选) */
    PageResult<AdminVO> pageAdmins(AdminQuery query);

    /** 新增/编辑管理员(id 为空=新增,username 唯一且 password 必填);返回 id */
    Long saveAdmin(SaveAdminCmd cmd);

    /** 启用/禁用(不可禁用自己) */
    void updateStatus(Long id, Integer status, Long currentAdminId);

    /** 重置密码(rawEncrypted 为 RSA 加密文本) */
    void resetPassword(Long id, String rawEncrypted);

    /** 删除(不可删除自己) */
    void deleteAdmin(Long id, Long currentAdminId);
}

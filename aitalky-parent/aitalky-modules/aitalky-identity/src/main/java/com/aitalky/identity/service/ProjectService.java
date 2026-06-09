package com.aitalky.identity.service;

import com.aitalky.identity.dto.CreateProjectCmd;
import com.aitalky.identity.dto.EnterResult;
import com.aitalky.identity.dto.ProjectBrief;

/** 项目服务:创建 / 进入 */
public interface ProjectService {

    /**
     * 创建项目(同一事务):项目 + 预置 3 系统角色 + owner 成员。
     *
     * @param ownerAccountId 创建者账号id(成为 owner)
     * @return 新项目简要信息
     */
    ProjectBrief create(Long ownerAccountId, CreateProjectCmd cmd);

    /**
     * 进入项目:校验账号是该项目成员,签发「项目级」令牌(含 projectId/memberId/roleId/functions)。
     */
    EnterResult enter(Long accountId, Long projectId);
}

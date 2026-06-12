package com.aitalky.identity.service;

import com.aitalky.identity.dto.CreateProjectCmd;
import com.aitalky.identity.dto.DeactivateProjectCmd;
import com.aitalky.identity.dto.EnterResult;
import com.aitalky.identity.dto.ProjectBrief;
import com.aitalky.identity.dto.ProjectDetailVO;
import com.aitalky.identity.dto.TransferOwnerCmd;
import com.aitalky.identity.dto.UpdateProjectCmd;

/** 项目服务:创建 / 进入 / 基本信息 / 转让 / 注销 */
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

    /** 按 appId 查项目(信使接入校验);不存在/停用返回 null */
    com.aitalky.identity.entity.IdProject findByAppId(String appId);

    /** 按 id 取项目(个人中心判断是否 owner 等) */
    com.aitalky.identity.entity.IdProject getById(Long id);

    /** 当前项目基本信息(团队设置 → 基本信息) */
    ProjectDetailVO currentDetail();

    /** 更新项目基本信息(改名/换 Logo;仅负责人) */
    void update(UpdateProjectCmd cmd);

    /** 负责人转让(危险操作,仅负责人;需密码+邮箱码二次校验) */
    void transferOwner(TransferOwnerCmd cmd);

    /** 注销项目(危险操作,仅负责人;需密码+邮箱码二次校验) */
    void deactivate(DeactivateProjectCmd cmd);
}

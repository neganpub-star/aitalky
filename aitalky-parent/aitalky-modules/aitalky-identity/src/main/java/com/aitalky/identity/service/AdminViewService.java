package com.aitalky.identity.service;

import com.aitalky.common.api.PageResult;
import com.aitalky.identity.dto.AdminAccountDetailVO;
import com.aitalky.identity.dto.AdminAccountQuery;
import com.aitalky.identity.dto.AdminAccountVO;
import com.aitalky.identity.dto.AdminProjectDetailVO;
import com.aitalky.identity.dto.AdminProjectQuery;
import com.aitalky.identity.dto.AdminProjectVO;

/**
 * 平台后管对 identity 数据(账号/项目)的跨租户管理视图。
 * <p>仅供平台后管(pf_admin)调用:调用方上下文 projectId=null,多租户拦截器整表忽略,可看全平台。
 * <p>与租户面 {@link AccountService}/{@link ProjectService} 分开,避免管理逻辑污染租户接口。
 */
public interface AdminViewService {

    /** 用户(账号)分页 */
    PageResult<AdminAccountVO> pageAccounts(AdminAccountQuery query);

    /** 用户详情(含其加入的项目) */
    AdminAccountDetailVO accountDetail(Long accountId);

    /** 启用/禁用账号(status 1正常 0禁用) */
    void setAccountStatus(Long accountId, Integer status);

    /** 项目(租户)分页 */
    PageResult<AdminProjectVO> pageProjects(AdminProjectQuery query);

    /** 项目详情 */
    AdminProjectDetailVO projectDetail(Long projectId);

    /** 启用/停用项目(status 1正常 0停用) */
    void setProjectStatus(Long projectId, Integer status);
}

package com.aitalky.messenger.service;

import com.aitalky.common.api.PageResult;
import com.aitalky.messenger.dto.BlacklistVO;

/** 黑名单服务(项目内,project_id 多租户自动隔离) */
public interface BlacklistService {

    /** 分页列表 */
    PageResult<BlacklistVO> page(long page, long size);

    /** 加入黑名单(targetType 1用户 2设备;同值已存在则忽略) */
    void add(Integer targetType, String targetValue, String reason);

    /** 移出黑名单 */
    void remove(Long id);

    /**
     * 是否被拉黑(信使 init 校验用,显式传 projectId 以兼容无登录上下文)。
     * 命中规则:用户(UID)拉黑 → 全设备生效;游客(visitorId)拉黑 → 仅该设备。
     */
    boolean isBlocked(Long projectId, String externalUserId, String visitorId);
}

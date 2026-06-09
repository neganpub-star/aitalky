package com.aitalky.customer.service;

import com.aitalky.customer.entity.CusCustomer;

/** 客户服务 */
public interface CustomerService {

    /**
     * 解析或创建客户:有 externalUserId 按用户态聚合,否则按游客 visitorId。
     * 不存在则创建(随机名/头像)。
     *
     * @param projectId      项目id
     * @param externalUserId 业务UID(用户态,可空)
     * @param visitorId      游客设备标识(游客态,可空)
     * @param lang           客户源语言
     */
    CusCustomer resolveOrCreate(Long projectId, String externalUserId, String visitorId, String lang);

    /** 按id取客户 */
    CusCustomer getById(Long customerId);
}

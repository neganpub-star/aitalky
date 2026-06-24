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

    /**
     * 更新客户联系方式/邮箱(坐席在详情面板编辑)。校验客户属于该项目(多租户隔离)。
     *
     * @param customerId 客户id
     * @param projectId  当前项目id(越权保护)
     * @param contact    联系方式(可空=清空)
     * @param email      邮箱(可空=清空)
     */
    void updateContact(Long customerId, Long projectId, String contact, String email);

    /** 更新客户源语言(详情面板「语言」/底部「客户源语言」下拉;B 方向坐席消息翻译目标) */
    void updateSourceLanguage(Long customerId, Long projectId, String lang);

    /** 统计项目客户数(计费配额计量用) */
    long countByProject(Long projectId);
}

package com.aitalky.customer.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 终端客户。同一 (project_id, external_user_id) 聚合为同一客户(跨设备);游客用 visitor_id。
 * 名称/头像系统随机生成。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("cus_customer")
public class CusCustomer extends BaseEntity {

    /** 项目id */
    private Long projectId;

    /** 业务UID(用户态,跨设备聚合) */
    private String externalUserId;

    /** 游客设备/缓存标识(匿名态) */
    private String visitorId;

    /** 名称(系统随机生成) */
    private String name;

    /** 头像(系统随机生成) */
    private String avatar;

    /** 类型 1游客 2用户 */
    private Integer type;

    /** 客户源语言(翻译用) */
    private String sourceLanguage;

    /** 联系方式 */
    private String contact;

    /** 邮箱 */
    private String email;

    /** 自定义属性(钱包地址/链/交易号等 Web3 字段)JSON 文本 */
    private String customAttrs;
}

package com.aitalky.billing.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 项目收款地址:每项目每链一个固定地址(uk project_id+chain_id)。
 * <p>地址 AES-256-GCM 密文存 address_enc;address_hash(SHA-256)供回调按地址反查项目，不暴露明文。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("bil_address")
public class BilAddress extends BaseEntity {

    private Long projectId;
    private String channel;
    private String chainId;
    /** 收款地址 AES-256-GCM 密文 */
    private String addressEnc;
    /** 地址 SHA-256(回调反查用) */
    private String addressHash;
    private String tokenId;
    private String currency;
}

package com.aitalky.billing.service.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 加购报价(加购弹窗实时算合计用;金额最终以下单后端为准)。
 *
 * @param resourceType 加购资源类型 seat/customer
 * @param subscribed   是否有有效订阅(加购前提:无有效订阅不能加购)
 * @param unitPrice    单价:席位=单席位月价;客户配额=每包价
 * @param packAmount   每包配额数:客户配额=拓展包 specAmount;席位=1
 * @param remainingDays 席位加购按剩余天数折算(席位用;客户为 null)
 * @param expireTime   当前订阅到期时间(席位加购展示;无订阅为 null)
 */
public record AddonQuoteVO(
        String resourceType,
        boolean subscribed,
        BigDecimal unitPrice,
        Long packAmount,
        Integer remainingDays,
        LocalDateTime expireTime
) {
}

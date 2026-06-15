package com.aitalky.conversation.dto;

import java.util.List;

/**
 * 专属分配策略(asn_group type=2)。
 * groupKey = 接入 URL 的 groupId;memberIds = 该策略参与队友(昵称/头像由前端用成员表映射)。
 */
public record AsnGroupVO(Long id, String name, String groupKey, String remark, List<Long> memberIds) {
}

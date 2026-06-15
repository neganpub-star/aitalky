package com.aitalky.app.dto;

import java.util.List;

/**
 * 信使端聊天头部「服务坐席」展示信息。
 * <p>mode 决定头部样式(对齐参考系统):
 * <ul>
 *   <li>{@code ASSIGNED_ONLINE}:会话已分配且该坐席在线——头像+名+预计回复时间</li>
 *   <li>{@code ASSIGNED_OFFLINE}:会话已分配但该坐席离线——头像+名+「离线」</li>
 *   <li>{@code POOL_ONLINE}:未分配但项目有在线坐席——在线坐席头像(最多3)+预计回复时间</li>
 *   <li>{@code POOL_BUSY}:未分配且无人在线——坐席头像(最多3)+「客服当前忙碌,请留言」</li>
 * </ul>
 * replyTime 仅在线态有值(后管配置的预计回复时长)。
 */
public record MessengerAgentVO(String mode, List<AgentItem> agents, String replyTime) {

    /** 头部展示的单个坐席(name 仅已分配态展示) */
    public record AgentItem(String name, String avatar) {
    }
}

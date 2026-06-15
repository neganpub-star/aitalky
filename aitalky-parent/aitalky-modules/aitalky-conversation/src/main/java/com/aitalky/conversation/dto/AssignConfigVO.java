package com.aitalky.conversation.dto;

/** 会话分配配置。assignMode:0手动 1轮流 2负载;maxConcurrent:每坐席最大同时进行中会话数,0=不限 */
public record AssignConfigVO(Integer assignMode, Integer maxConcurrent) {
}

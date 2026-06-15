package com.aitalky.app.dto;

import jakarta.validation.constraints.NotNull;

/** 工作状态更新(坐席自助):1在线 0离开 */
public record WorkStatusReq(@NotNull Integer workStatus) {
}

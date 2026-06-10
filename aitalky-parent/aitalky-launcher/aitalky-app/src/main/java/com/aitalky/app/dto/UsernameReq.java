package com.aitalky.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 修改用户名 */
public record UsernameReq(@NotBlank @Size(max = 64) String username) {
}

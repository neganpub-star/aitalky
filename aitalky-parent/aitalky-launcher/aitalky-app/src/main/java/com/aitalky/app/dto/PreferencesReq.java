package com.aitalky.app.dto;

/** 个人偏好更新(语言/声音/推送);字段可空,空=不改 */
public record PreferencesReq(String language, Integer soundEnabled, Integer pushEnabled) {
}

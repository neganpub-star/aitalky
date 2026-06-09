package com.aitalky.common.api;

import java.util.List;

/**
 * 统一分页结果。
 *
 * @param records 当前页数据
 * @param total   总条数
 * @param current 当前页码
 * @param size    每页大小
 */
public record PageResult<T>(List<T> records, long total, long current, long size) {

    public static <T> PageResult<T> of(List<T> records, long total, long current, long size) {
        return new PageResult<>(records, total, current, size);
    }
}

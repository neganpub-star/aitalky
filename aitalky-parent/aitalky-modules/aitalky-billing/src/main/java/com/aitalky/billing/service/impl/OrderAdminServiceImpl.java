package com.aitalky.billing.service.impl;

import com.aitalky.billing.entity.BilOrder;
import com.aitalky.billing.mapper.BilOrderMapper;
import com.aitalky.billing.service.OrderAdminService;
import com.aitalky.billing.service.dto.AdminOrderQuery;
import com.aitalky.billing.service.dto.AdminOrderVO;
import com.aitalky.billing.service.dto.OrderStatsVO;
import com.aitalky.common.api.PageResult;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 订单管理实现(后管)。后管无租户上下文(projectId=null),多租户拦截器整体忽略,故能跨项目查全部订单。
 * <p>按创建时间倒序;可选 projectId/status/type 过滤。
 */
@Service
@RequiredArgsConstructor
public class OrderAdminServiceImpl implements OrderAdminService {

    private final BilOrderMapper orderMapper;

    @Override
    public PageResult<AdminOrderVO> page(AdminOrderQuery query) {
        long current = query.page() == null || query.page() < 1 ? 1 : query.page();
        long size = query.size() == null || query.size() < 1 ? 10 : query.size();
        Page<BilOrder> page = orderMapper.selectPage(Page.of(current, size),
                Wrappers.<BilOrder>lambdaQuery()
                        .eq(query.projectId() != null, BilOrder::getProjectId, query.projectId())
                        .eq(query.status() != null, BilOrder::getStatus, query.status())
                        .eq(query.type() != null && !query.type().isBlank(), BilOrder::getType, query.type())
                        .orderByDesc(BilOrder::getCreateTime));
        return PageResult.of(page.getRecords().stream().map(this::toVO).toList(),
                page.getTotal(), current, size);
    }

    @Override
    public OrderStatsVO stats() {
        // 计数走逻辑删除自动过滤;后管无租户上下文,统计为全平台跨项目口径
        long total = orderMapper.selectCount(null);
        long paid = orderMapper.selectCount(Wrappers.<BilOrder>lambdaQuery().eq(BilOrder::getStatus, 1));
        long pending = orderMapper.selectCount(Wrappers.<BilOrder>lambdaQuery().eq(BilOrder::getStatus, 0));
        // 累计成交额=已完成订单金额合计;SUM 在 SQL 层做,IFNULL 兜底无数据
        QueryWrapper<BilOrder> sumQuery = Wrappers.<BilOrder>query()
                .select("IFNULL(SUM(amount), 0) AS paid_amount")
                .eq("status", 1);
        Map<String, Object> row = orderMapper.selectMaps(sumQuery).stream().findFirst().orElse(Map.of());
        Object sum = row.get("paid_amount");
        BigDecimal paidAmount = sum == null ? BigDecimal.ZERO : new BigDecimal(sum.toString());
        return new OrderStatsVO(total, paid, pending, paidAmount, "USDT");
    }

    private AdminOrderVO toVO(BilOrder o) {
        return new AdminOrderVO(o.getId(), o.getOrderNo(), o.getProjectId(), null,
                o.getType(), o.getPlanId(), o.getPlanName(), o.getMonths(), o.getSeats(),
                o.getAmount(), o.getCurrency(), o.getStatus(), o.getPaidTime(), o.getCreateTime());
    }
}

package com.aitalky.platform.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.platform.dto.PlanQuotaVO;
import com.aitalky.platform.dto.PlanVO;
import com.aitalky.platform.dto.SavePlanCmd;
import com.aitalky.platform.entity.PfPlan;
import com.aitalky.platform.entity.PfPlanQuota;
import com.aitalky.platform.mapper.PfPlanMapper;
import com.aitalky.platform.mapper.PfPlanQuotaMapper;
import com.aitalky.platform.service.PlanService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 套餐管理实现。套餐 + 配额(pf_plan_quota)一体维护。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlanServiceImpl implements PlanService {

    private final PfPlanMapper planMapper;
    private final PfPlanQuotaMapper quotaMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final ObjectMapper objectMapper;

    @Override
    public List<PlanVO> list() {
        List<PfPlan> plans = planMapper.selectList(
                Wrappers.<PfPlan>lambdaQuery().orderByAsc(PfPlan::getLevel));
        if (plans.isEmpty()) {
            return List.of();
        }
        // 一次查出全部配额,按 planId 分组,避免 N 次查询
        List<Long> planIds = plans.stream().map(PfPlan::getId).toList();
        Map<Long, List<PfPlanQuota>> quotaMap = quotaMapper.selectList(
                        Wrappers.<PfPlanQuota>lambdaQuery().in(PfPlanQuota::getPlanId, planIds))
                .stream().collect(Collectors.groupingBy(PfPlanQuota::getPlanId));
        return plans.stream().map(p -> toVO(p, quotaMap.getOrDefault(p.getId(), List.of()))).toList();
    }

    @Override
    public PlanVO get(Long id) {
        PfPlan plan = planMapper.selectById(id);
        if (plan == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        List<PfPlanQuota> quotas = quotaMapper.selectList(
                Wrappers.<PfPlanQuota>lambdaQuery().eq(PfPlanQuota::getPlanId, id));
        return toVO(plan, quotas);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long save(SavePlanCmd cmd) {
        // 编码唯一校验(排除自身)
        Long exist = planMapper.selectCount(Wrappers.<PfPlan>lambdaQuery()
                .eq(PfPlan::getCode, cmd.code())
                .ne(cmd.id() != null, PfPlan::getId, cmd.id()));
        if (exist != null && exist > 0) {
            throw new BizException(ResultCode.DATA_DUPLICATED);
        }
        PfPlan plan = new PfPlan();
        plan.setCode(cmd.code());
        plan.setName(cmd.name());
        plan.setLevel(cmd.level() == null ? 0 : cmd.level());
        plan.setMonthlyPrice(cmd.monthlyPrice());
        plan.setCurrency(cmd.currency() == null ? "USD" : cmd.currency());
        plan.setMinMonths(cmd.minMonths() == null ? 6 : cmd.minMonths());
        plan.setIsCustom(cmd.isCustom() == null ? 0 : cmd.isCustom());
        plan.setFeatures(writeJson(cmd.features()));
        plan.setStatus(cmd.status() == null ? 1 : cmd.status());

        Long planId;
        if (cmd.id() == null) {
            planId = idGenerator.nextId();
            plan.setId(planId);
            planMapper.insert(plan);
        } else {
            planId = cmd.id();
            plan.setId(planId);
            planMapper.updateById(plan);
        }
        // 配额:整体覆盖(先删后插),保持与提交一致
        quotaMapper.delete(Wrappers.<PfPlanQuota>lambdaQuery().eq(PfPlanQuota::getPlanId, planId));
        if (cmd.quotas() != null) {
            for (PlanQuotaVO q : cmd.quotas()) {
                PfPlanQuota quota = new PfPlanQuota();
                quota.setId(idGenerator.nextId());
                quota.setPlanId(planId);
                quota.setResourceType(q.resourceType());
                quota.setAmount(q.amount() == null ? 0 : q.amount());
                quota.setIsUnlimited(q.isUnlimited() == null ? 0 : q.isUnlimited());
                quotaMapper.insert(quota);
            }
        }
        log.info("套餐保存 planId={}, code={}", planId, cmd.code());
        return planId;
    }

    @Override
    public void updateStatus(Long id, Integer status) {
        PfPlan plan = planMapper.selectById(id);
        if (plan == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        PfPlan update = new PfPlan();
        update.setId(id);
        update.setStatus(status);
        planMapper.updateById(update);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        planMapper.deleteById(id);
        quotaMapper.delete(Wrappers.<PfPlanQuota>lambdaQuery().eq(PfPlanQuota::getPlanId, id));
    }

    private PlanVO toVO(PfPlan p, List<PfPlanQuota> quotas) {
        List<PlanQuotaVO> quotaVOs = quotas.stream()
                .map(q -> new PlanQuotaVO(q.getResourceType(), q.getAmount(), q.getIsUnlimited()))
                .toList();
        return new PlanVO(p.getId(), p.getCode(), p.getName(), p.getLevel(), p.getMonthlyPrice(),
                p.getCurrency(), p.getMinMonths(), p.getIsCustom(), readJson(p.getFeatures()),
                p.getStatus(), quotaVOs);
    }

    /** features JSON 数组文本 → List;空/异常返回空列表 */
    private List<String> readJson(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            log.warn("套餐 features 解析失败: {}", e.getMessage());
            return List.of();
        }
    }

    /** List → JSON 数组文本;空返回 "[]" */
    private String writeJson(List<String> list) {
        if (list == null || list.isEmpty()) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
    }
}

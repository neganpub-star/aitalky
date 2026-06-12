package com.aitalky.messenger.service.impl;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.messenger.dto.BlacklistVO;
import com.aitalky.messenger.entity.SupBlacklist;
import com.aitalky.messenger.mapper.SupBlacklistMapper;
import com.aitalky.messenger.service.BlacklistService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 黑名单实现。project_id 由多租户拦截器自动注入(insert 自动填、select 自动过滤);
 * isBlocked 在无登录上下文(信使 init)下调用,故显式按 projectId 过滤。
 */
@Service
@RequiredArgsConstructor
public class BlacklistServiceImpl implements BlacklistService {

    private final SupBlacklistMapper blacklistMapper;
    private final SnowflakeIdGenerator idGenerator;

    @Override
    public PageResult<BlacklistVO> page(long page, long size, String keyword) {
        var q = Wrappers.<SupBlacklist>lambdaQuery().orderByDesc(SupBlacklist::getCreateTime);
        // keyword 模糊匹配:UID/MID 落在 target_value;另含用户名/联系方式/邮箱
        if (StringUtils.hasText(keyword)) {
            String kw = keyword.trim();
            q.and(w -> w.like(SupBlacklist::getTargetValue, kw)
                    .or().like(SupBlacklist::getCustomerName, kw)
                    .or().like(SupBlacklist::getContact, kw)
                    .or().like(SupBlacklist::getEmail, kw));
        }
        Page<SupBlacklist> p = blacklistMapper.selectPage(Page.of(page, size), q);
        List<BlacklistVO> vos = p.getRecords().stream().map(this::toVO).toList();
        return PageResult.of(vos, p.getTotal(), p.getCurrent(), p.getSize());
    }

    /** 实体 → VO:按 targetType 派生 UID/MID 列 */
    private BlacklistVO toVO(SupBlacklist b) {
        boolean isUser = b.getTargetType() != null && b.getTargetType() == 1;
        String uid = isUser ? b.getTargetValue() : null;
        String mid = isUser ? null : b.getTargetValue();
        return new BlacklistVO(b.getId(), b.getTargetType(), b.getTargetValue(),
                uid, mid, b.getCustomerName(), b.getContact(), b.getEmail(), b.getLocation(),
                b.getOperatorName(), b.getReason(), b.getCreateTime());
    }

    @Override
    public void add(Integer targetType, String targetValue, String reason,
                    String customerName, String contact, String email, String location, String operatorName) {
        if (targetType == null || !StringUtils.hasText(targetValue)) {
            return;
        }
        // 已存在(同类型同值)则忽略,避免重复(project_id 自动隔离)
        Long exists = blacklistMapper.selectCount(Wrappers.<SupBlacklist>lambdaQuery()
                .eq(SupBlacklist::getTargetType, targetType)
                .eq(SupBlacklist::getTargetValue, targetValue));
        if (exists != null && exists > 0) {
            return;
        }
        SupBlacklist b = new SupBlacklist();
        b.setTargetType(targetType);
        b.setTargetValue(targetValue);
        b.setReason(reason);
        b.setCustomerName(customerName);
        b.setContact(contact);
        b.setEmail(email);
        b.setLocation(location);
        b.setOperatorName(operatorName);
        b.setId(idGenerator.nextId()); // 主键 IdType.INPUT,需手动注入雪花ID
        blacklistMapper.insert(b); // project_id / 审计字段由拦截器与填充器自动写入
    }

    @Override
    public void remove(Long id) {
        blacklistMapper.deleteById(id);
    }

    @Override
    public boolean isBlocked(Long projectId, String externalUserId, String visitorId) {
        boolean hasUser = StringUtils.hasText(externalUserId);
        boolean hasVisitor = StringUtils.hasText(visitorId);
        if (!hasUser && !hasVisitor) {
            return false;
        }
        var q = Wrappers.<SupBlacklist>lambdaQuery().eq(SupBlacklist::getProjectId, projectId);
        // (用户态 UID 命中) OR (游客 visitorId 命中)
        q.and(w -> {
            if (hasUser) {
                w.nested(n -> n.eq(SupBlacklist::getTargetType, 1).eq(SupBlacklist::getTargetValue, externalUserId));
            }
            if (hasUser && hasVisitor) {
                w.or();
            }
            if (hasVisitor) {
                w.nested(n -> n.eq(SupBlacklist::getTargetType, 2).eq(SupBlacklist::getTargetValue, visitorId));
            }
        });
        Long cnt = blacklistMapper.selectCount(q);
        return cnt != null && cnt > 0;
    }
}

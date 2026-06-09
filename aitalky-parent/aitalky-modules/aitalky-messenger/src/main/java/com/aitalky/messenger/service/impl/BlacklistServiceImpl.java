package com.aitalky.messenger.service.impl;

import com.aitalky.common.api.PageResult;
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

    @Override
    public PageResult<BlacklistVO> page(long page, long size) {
        Page<SupBlacklist> p = blacklistMapper.selectPage(Page.of(page, size),
                Wrappers.<SupBlacklist>lambdaQuery().orderByDesc(SupBlacklist::getCreateTime));
        List<BlacklistVO> vos = p.getRecords().stream()
                .map(b -> new BlacklistVO(b.getId(), b.getTargetType(), b.getTargetValue(), b.getReason(), b.getCreateTime()))
                .toList();
        return PageResult.of(vos, p.getTotal(), p.getCurrent(), p.getSize());
    }

    @Override
    public void add(Integer targetType, String targetValue, String reason) {
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

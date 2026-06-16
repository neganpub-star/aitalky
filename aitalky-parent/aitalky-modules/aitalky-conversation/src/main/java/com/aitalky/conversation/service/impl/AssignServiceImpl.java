package com.aitalky.conversation.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.conversation.dto.AsnGroupVO;
import com.aitalky.conversation.dto.AssignConfigVO;
import com.aitalky.conversation.entity.AsnConfig;
import com.aitalky.conversation.entity.AsnGroup;
import com.aitalky.conversation.entity.AsnGroupMember;
import com.aitalky.conversation.mapper.AsnConfigMapper;
import com.aitalky.conversation.mapper.AsnGroupMapper;
import com.aitalky.conversation.mapper.AsnGroupMemberMapper;
import com.aitalky.conversation.service.AssignService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 会话分配设置实现(基于 asn_* 表)。
 * <p>对外 AssignConfigVO.assignMode 沿用 0手动/1轮流/2负载;asn_config.mode 为 1/2/3,边界处 ±1 映射。
 * <p>普通分配「参与队友」= 项目「普通组」(asn_group.type=1)的成员;普通组首次需要时懒创建。
 * <p>显式按 projectId 读写,兼容分配引擎在无成员租户上下文(客户令牌新建会话)下调用。
 */
@Service
@RequiredArgsConstructor
public class AssignServiceImpl implements AssignService {

    /** 对外默认:轮流(1)、不限(0) */
    private static final int DEFAULT_MODE = 1;
    private static final int DEFAULT_MAX = 0;
    private static final int GROUP_NORMAL = 1; // asn_group.type 普通组
    private static final int GROUP_EXCLUSIVE = 2; // asn_group.type 专属组

    /** groupKey 字符集(去掉易混 0/O/1/I/l)与长度,与项目 appId 同风格 */
    private static final String KEY_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final int KEY_LEN = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AsnConfigMapper configMapper;
    private final AsnGroupMapper groupMapper;
    private final AsnGroupMemberMapper groupMemberMapper;
    private final com.aitalky.framework.lock.DistributedLockTemplate lockTemplate;

    @Override
    public AssignConfigVO getConfig(Long projectId) {
        AsnConfig cfg = findConfig(projectId);
        if (cfg == null) {
            return new AssignConfigVO(DEFAULT_MODE, DEFAULT_MAX, 0);
        }
        int keep = cfg.getAutoCloseIdleMinutes() == null ? 0 : cfg.getAutoCloseIdleMinutes();
        return new AssignConfigVO(toVoMode(cfg.getMode()), cfg.getCapacityLimit(), keep);
    }

    @Override
    public void updateRetention(Long projectId, Integer autoCloseIdleMinutes) {
        // <=0 统一存 0(=关闭自动结束);只动保持期字段,分配规则/最大会话数不受影响
        int minutes = autoCloseIdleMinutes == null || autoCloseIdleMinutes < 0 ? 0 : autoCloseIdleMinutes;
        AsnConfig cfg = findConfig(projectId);
        if (cfg == null) {
            cfg = new AsnConfig();
            cfg.setProjectId(projectId);
            cfg.setMode(toDbMode(DEFAULT_MODE));
            cfg.setCapacityLimit(DEFAULT_MAX);
            cfg.setAutoCloseIdleMinutes(minutes);
            configMapper.insert(cfg);
        } else {
            cfg.setAutoCloseIdleMinutes(minutes);
            configMapper.updateById(cfg);
        }
    }

    @Override
    public void updateConfig(Long projectId, Integer assignMode, Integer maxConcurrent) {
        int dbMode = toDbMode(assignMode);
        int max = maxConcurrent == null || maxConcurrent < 0 ? DEFAULT_MAX : maxConcurrent;
        AsnConfig cfg = findConfig(projectId);
        if (cfg == null) {
            cfg = new AsnConfig();
            cfg.setProjectId(projectId);
            cfg.setMode(dbMode);
            cfg.setCapacityLimit(max);
            configMapper.insert(cfg);
        } else {
            cfg.setMode(dbMode);
            cfg.setCapacityLimit(max);
            configMapper.updateById(cfg);
        }
    }

    @Override
    public List<Long> participantIds(Long projectId) {
        Long groupId = normalGroupId(projectId, false);
        if (groupId == null) {
            return List.of();
        }
        return groupMemberMapper.selectList(Wrappers.<AsnGroupMember>lambdaQuery()
                        .eq(AsnGroupMember::getGroupId, groupId))
                .stream().map(AsnGroupMember::getMemberId).toList();
    }

    @Override
    public void addParticipant(Long projectId, Long memberId) {
        Long groupId = normalGroupId(projectId, true);
        // 先物理清掉该 (group, member) 的残留行(含历史软删行)再插入:
        // uk(group_id, member_id) 不含 del_flag,软删行会让 exists() 查不到却又撞唯一键;
        // 物理删+插也天然幂等(已存在则等价于重插)。
        groupMemberMapper.physicalDeleteMember(groupId, memberId);
        AsnGroupMember m = new AsnGroupMember();
        m.setProjectId(projectId);
        m.setGroupId(groupId);
        m.setMemberId(memberId);
        groupMemberMapper.insert(m);
    }

    @Override
    public void removeParticipant(Long projectId, Long memberId) {
        Long groupId = normalGroupId(projectId, false);
        if (groupId == null) {
            return;
        }
        // 物理删除:避免软删残留行让"移除后重新加入同一队友"撞唯一键
        groupMemberMapper.physicalDeleteMember(groupId, memberId);
    }

    @Override
    public Long nextRoundRobin(Long projectId, List<Long> candidatesAsc) {
        if (candidatesAsc == null || candidatesAsc.isEmpty()) {
            return null;
        }
        AsnConfig cfg = findConfig(projectId);
        Long cursor = cfg == null ? null : cfg.getRoundRobinCursor();
        Long picked = candidatesAsc.stream()
                .filter(id -> cursor == null || id > cursor)
                .findFirst()
                .orElse(candidatesAsc.get(0));
        if (cfg == null) {
            cfg = new AsnConfig();
            cfg.setProjectId(projectId);
            cfg.setMode(DEFAULT_MODE == 1 ? 2 : DEFAULT_MODE); // 默认轮流(db=2)
            cfg.setCapacityLimit(DEFAULT_MAX);
            cfg.setRoundRobinCursor(picked);
            configMapper.insert(cfg);
        } else {
            cfg.setRoundRobinCursor(picked);
            configMapper.updateById(cfg);
        }
        return picked;
    }

    // ============ 专属分配模式(P2) ============

    @Override
    public List<AsnGroupVO> listGroups(Long projectId) {
        List<AsnGroup> groups = groupMapper.selectList(Wrappers.<AsnGroup>lambdaQuery()
                .eq(AsnGroup::getProjectId, projectId)
                .eq(AsnGroup::getType, GROUP_EXCLUSIVE)
                .orderByAsc(AsnGroup::getId));
        if (groups.isEmpty()) {
            return List.of();
        }
        // 批量取各组队友,避免 N+1
        List<Long> groupIds = groups.stream().map(AsnGroup::getId).toList();
        Map<Long, List<Long>> membersByGroup = groupMemberMapper.selectList(Wrappers.<AsnGroupMember>lambdaQuery()
                        .in(AsnGroupMember::getGroupId, groupIds))
                .stream()
                .collect(Collectors.groupingBy(AsnGroupMember::getGroupId,
                        Collectors.mapping(AsnGroupMember::getMemberId, Collectors.toList())));
        return groups.stream()
                .map(g -> new AsnGroupVO(g.getId(), g.getName(), g.getGroupKey(), g.getRemark(),
                        membersByGroup.getOrDefault(g.getId(), List.of())))
                .toList();
    }

    @Override
    public AsnGroupVO createGroup(Long projectId, String name, String remark, List<Long> memberIds) {
        if (!StringUtils.hasText(name)) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        AsnGroup g = new AsnGroup();
        g.setProjectId(projectId);
        g.setType(GROUP_EXCLUSIVE);
        g.setName(name.trim());
        g.setRemark(remark == null ? null : remark.trim());
        g.setGroupKey(generateUniqueGroupKey());
        groupMapper.insert(g);
        replaceMembers(projectId, g.getId(), memberIds);
        return new AsnGroupVO(g.getId(), g.getName(), g.getGroupKey(), g.getRemark(),
                memberIds == null ? List.of() : memberIds);
    }

    @Override
    public void updateGroup(Long projectId, Long groupId, String name, String remark, List<Long> memberIds) {
        AsnGroup g = requireGroup(projectId, groupId);
        if (StringUtils.hasText(name)) {
            g.setName(name.trim());
        }
        g.setRemark(remark == null ? null : remark.trim());
        groupMapper.updateById(g); // groupKey 保持不变
        replaceMembers(projectId, groupId, memberIds);
    }

    @Override
    public void deleteGroup(Long projectId, Long groupId) {
        AsnGroup g = requireGroup(projectId, groupId);
        groupMemberMapper.physicalDeleteByGroup(groupId);
        groupMapper.deleteById(g.getId()); // 软删策略;存量会话保留 group_id 引用
    }

    @Override
    public List<Long> groupMembers(Long groupId) {
        return groupMemberMapper.selectList(Wrappers.<AsnGroupMember>lambdaQuery()
                        .eq(AsnGroupMember::getGroupId, groupId))
                .stream().map(AsnGroupMember::getMemberId).toList();
    }

    @Override
    public Long resolveGroupId(Long projectId, String groupKey) {
        if (!StringUtils.hasText(groupKey)) {
            return null;
        }
        AsnGroup g = groupMapper.selectOne(Wrappers.<AsnGroup>lambdaQuery()
                .eq(AsnGroup::getProjectId, projectId)
                .eq(AsnGroup::getType, GROUP_EXCLUSIVE)
                .eq(AsnGroup::getGroupKey, groupKey)
                .last("limit 1"));
        return g == null ? null : g.getId();
    }

    /** 取本项目下指定专属策略,不存在/类型不符则报错 */
    private AsnGroup requireGroup(Long projectId, Long groupId) {
        AsnGroup g = groupMapper.selectById(groupId);
        if (g == null || !projectId.equals(g.getProjectId()) || !Integer.valueOf(GROUP_EXCLUSIVE).equals(g.getType())) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        return g;
    }

    /** 全量覆盖组队友:物理清空旧成员后按新名单重建(物理删避免唯一键复活冲突) */
    private void replaceMembers(Long projectId, Long groupId, List<Long> memberIds) {
        groupMemberMapper.physicalDeleteByGroup(groupId);
        if (memberIds == null || memberIds.isEmpty()) {
            return;
        }
        for (Long memberId : memberIds.stream().distinct().toList()) {
            AsnGroupMember m = new AsnGroupMember();
            m.setProjectId(projectId);
            m.setGroupId(groupId);
            m.setMemberId(memberId);
            groupMemberMapper.insert(m);
        }
    }

    /** 生成全局唯一 groupKey(随机串,碰撞极低,仍做唯一性校验重试) */
    private String generateUniqueGroupKey() {
        while (true) {
            StringBuilder sb = new StringBuilder(KEY_LEN);
            for (int i = 0; i < KEY_LEN; i++) {
                sb.append(KEY_CHARS.charAt(RANDOM.nextInt(KEY_CHARS.length())));
            }
            String key = sb.toString();
            boolean exists = groupMapper.exists(Wrappers.<AsnGroup>lambdaQuery()
                    .eq(AsnGroup::getGroupKey, key));
            if (!exists) {
                return key;
            }
        }
    }

    private AsnConfig findConfig(Long projectId) {
        return configMapper.selectOne(Wrappers.<AsnConfig>lambdaQuery()
                .eq(AsnConfig::getProjectId, projectId).last("limit 1"));
    }

    /** 取项目普通组(type=1)id;create=true 时不存在则懒创建。加项目锁防并发建重复组 */
    private Long normalGroupId(Long projectId, boolean create) {
        AsnGroup g = findNormalGroup(projectId);
        if (g != null) {
            return g.getId();
        }
        if (!create) {
            return null;
        }
        // 锁内二次查 + 创建:避免并发(前端同时加多个队友)各建一个普通组
        return lockTemplate.execute("lock:asn:normalgroup:" + projectId, 3, 10, () -> {
            AsnGroup again = findNormalGroup(projectId);
            if (again != null) {
                return again.getId();
            }
            AsnGroup ng = new AsnGroup();
            ng.setProjectId(projectId);
            ng.setType(GROUP_NORMAL);
            ng.setName("普通分配");
            groupMapper.insert(ng);
            return ng.getId();
        });
    }

    /** 普通组:取 id 最小的一个(历史可能有重复,确定性取一个) */
    private AsnGroup findNormalGroup(Long projectId) {
        return groupMapper.selectOne(Wrappers.<AsnGroup>lambdaQuery()
                .eq(AsnGroup::getProjectId, projectId)
                .eq(AsnGroup::getType, GROUP_NORMAL)
                .orderByAsc(AsnGroup::getId).last("limit 1"));
    }

    /** asn_config.mode(1手动2轮流3负载) → 对外(0手动1轮流2负载) */
    private int toVoMode(Integer dbMode) {
        return dbMode == null ? DEFAULT_MODE : Math.max(0, dbMode - 1);
    }

    /** 对外(0/1/2) → asn_config.mode(1/2/3) */
    private int toDbMode(Integer voMode) {
        int v = voMode == null ? DEFAULT_MODE : voMode;
        return v + 1;
    }
}

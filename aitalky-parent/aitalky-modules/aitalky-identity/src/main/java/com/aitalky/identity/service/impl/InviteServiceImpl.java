package com.aitalky.identity.service.impl;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.common.util.MaskUtil;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.framework.verify.VerifyCodeProperties;
import com.aitalky.identity.dto.AcceptInviteCmd;
import com.aitalky.identity.dto.EmailInviteCmd;
import com.aitalky.identity.dto.EmailInviteQuery;
import com.aitalky.identity.dto.EmailInviteVO;
import com.aitalky.identity.dto.EnterResult;
import com.aitalky.identity.dto.InviteInfoVO;
import com.aitalky.identity.dto.LinkInviteCmd;
import com.aitalky.identity.dto.LinkInviteDetailVO;
import com.aitalky.identity.dto.LinkInviteQuery;
import com.aitalky.identity.dto.LinkInviteVO;
import com.aitalky.identity.entity.IdAccount;
import com.aitalky.identity.entity.IdInvite;
import com.aitalky.identity.entity.IdInviteLink;
import com.aitalky.identity.entity.IdMember;
import com.aitalky.identity.entity.IdProject;
import com.aitalky.identity.entity.IdRole;
import com.aitalky.identity.mapper.IdAccountMapper;
import com.aitalky.identity.mapper.IdInviteLinkMapper;
import com.aitalky.identity.mapper.IdInviteMapper;
import com.aitalky.identity.mapper.IdMemberMapper;
import com.aitalky.identity.mapper.IdProjectMapper;
import com.aitalky.identity.mapper.IdRoleMapper;
import com.aitalky.identity.service.InviteService;
import com.aitalky.identity.service.ProjectService;
import com.aitalky.identity.support.DefaultAvatar;
import com.baomidou.mybatisplus.core.plugins.IgnoreStrategy;
import com.baomidou.mybatisplus.core.plugins.InterceptorIgnoreHelper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 团队邀请实现。
 * <p>管理类查询依赖项目级上下文(id_invite 自动租户隔离;id_invite_link 在忽略表中,手动带 project_id)。
 * <p>{@link #inviteInfo}/{@link #accept} 在无项目上下文调用,凭 token 直查(多租户拦截器整体忽略)。
 */
@Slf4j
@Service
public class InviteServiceImpl implements InviteService {

    /** 预置角色名:负责人(不可作为受邀角色) */
    private static final String OWNER_ROLE_NAME = "负责人";
    private static final String TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final int TOKEN_LEN = 40;
    private static final long EMAIL_EXPIRE_HOURS = 72;
    private static final long LINK_EXPIRE_DAYS = 30;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Pattern EMAIL_RE = Pattern.compile("^[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+$");

    private final IdInviteMapper inviteMapper;
    private final IdInviteLinkMapper linkMapper;
    private final IdMemberMapper memberMapper;
    private final IdRoleMapper roleMapper;
    private final IdProjectMapper projectMapper;
    private final IdAccountMapper accountMapper;
    private final ProjectService projectService;
    private final SnowflakeIdGenerator idGenerator;
    private final VerifyCodeProperties mailProps;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    /** 坐席台基址(邀请邮件链接拼这个 + /#/join?token=);上线改环境变量 */
    @Value("${aitalky.invite.console-base-url:http://localhost:5173}")
    private String consoleBaseUrl;

    public InviteServiceImpl(IdInviteMapper inviteMapper, IdInviteLinkMapper linkMapper,
                             IdMemberMapper memberMapper, IdRoleMapper roleMapper,
                             IdProjectMapper projectMapper, IdAccountMapper accountMapper,
                             ProjectService projectService, SnowflakeIdGenerator idGenerator,
                             VerifyCodeProperties mailProps, ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.inviteMapper = inviteMapper;
        this.linkMapper = linkMapper;
        this.memberMapper = memberMapper;
        this.roleMapper = roleMapper;
        this.projectMapper = projectMapper;
        this.accountMapper = accountMapper;
        this.projectService = projectService;
        this.idGenerator = idGenerator;
        this.mailProps = mailProps;
        this.mailSenderProvider = mailSenderProvider;
    }

    // ====================================================================
    // 邮箱邀请(管理)
    // ====================================================================

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void createEmailInvites(EmailInviteCmd cmd) {
        Long projectId = TenantContext.getProjectId();
        Long inviterMemberId = TenantContext.getMemberId();
        IdRole role = requireAssignableRole(cmd.roleId(), projectId);
        IdProject project = projectMapper.selectById(projectId);

        // 规整:去空、小写、去重、校验格式
        List<String> emails = cmd.emails().stream()
                .filter(StringUtils::hasText)
                .map(e -> e.trim().toLowerCase())
                .distinct()
                .filter(e -> EMAIL_RE.matcher(e).matches())
                .toList();
        if (emails.isEmpty()) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }

        for (String email : emails) {
            // 已是本项目成员 → 跳过
            if (isAlreadyMember(projectId, email)) {
                log.info("邀请跳过(已是成员) email={}", MaskUtil.maskEmail(email));
                continue;
            }
            IdInvite exist = inviteMapper.selectOne(Wrappers.<IdInvite>lambdaQuery()
                    .eq(IdInvite::getEmail, email)
                    .orderByDesc(IdInvite::getCreateTime).last("limit 1"));
            if (exist != null && exist.getStatus() == 0 && notExpired(exist.getExpireTime())) {
                // 已有待接受邀请 → 不重复创建
                continue;
            }
            String token = randomToken();
            if (exist != null) {
                // 复用记录:重新激活并累加发送次数
                exist.setToken(token);
                exist.setRoleId(role.getId());
                exist.setStatus(0);
                exist.setSendCount(exist.getSendCount() == null ? 1 : exist.getSendCount() + 1);
                exist.setInviterMemberId(inviterMemberId);
                exist.setAcceptedMemberId(null);
                exist.setExpireTime(LocalDateTime.now().plusHours(EMAIL_EXPIRE_HOURS));
                inviteMapper.updateById(exist);
            } else {
                IdInvite invite = new IdInvite();
                invite.setId(idGenerator.nextId());
                invite.setProjectId(projectId);
                invite.setEmail(email);
                invite.setToken(token);
                invite.setRoleId(role.getId());
                invite.setStatus(0);
                invite.setSendCount(1);
                invite.setInviterMemberId(inviterMemberId);
                invite.setExpireTime(LocalDateTime.now().plusHours(EMAIL_EXPIRE_HOURS));
                inviteMapper.insert(invite);
            }
            sendInviteMail(email, project == null ? "aitalky" : project.getName(), token);
        }
        log.info("创建邮箱邀请 projectId={}, count={}", projectId, emails.size());
    }

    @Override
    public PageResult<EmailInviteVO> pageEmailInvites(EmailInviteQuery q) {
        Long projectId = TenantContext.getProjectId();
        // 关键词命中邮箱 或 邀请人昵称 → 先查出昵称匹配的成员id
        List<Long> inviterIds = List.of();
        if (StringUtils.hasText(q.getKeyword())) {
            inviterIds = memberMapper.selectList(Wrappers.<IdMember>lambdaQuery()
                            .select(IdMember::getId)
                            .like(IdMember::getNickname, q.getKeyword()))
                    .stream().map(IdMember::getId).toList();
        }
        final List<Long> finalInviterIds = inviterIds;
        LocalDateTime now = LocalDateTime.now();
        // status: 1有效(待接受且未过期) / 0失效(已接受/撤销/过期),与链接邀请一致
        Page<IdInvite> page = inviteMapper.selectPage(Page.of(q.getPage(), q.getSize()),
                Wrappers.<IdInvite>lambdaQuery()
                        .eq(q.getStatus() != null && q.getStatus() == 1, IdInvite::getStatus, 0)
                        .gt(q.getStatus() != null && q.getStatus() == 1, IdInvite::getExpireTime, now)
                        .and(q.getStatus() != null && q.getStatus() == 0,
                                w -> w.ne(IdInvite::getStatus, 0).or().le(IdInvite::getExpireTime, now))
                        .ge(StringUtils.hasText(q.getStartDate()), IdInvite::getCreateTime, startOfDay(q.getStartDate()))
                        .le(StringUtils.hasText(q.getEndDate()), IdInvite::getCreateTime, endOfDay(q.getEndDate()))
                        .and(StringUtils.hasText(q.getKeyword()), w -> w
                                .like(IdInvite::getEmail, q.getKeyword())
                                .or(!finalInviterIds.isEmpty(), x -> x.in(IdInvite::getInviterMemberId, finalInviterIds)))
                        .orderByDesc(IdInvite::getCreateTime));

        List<IdInvite> records = page.getRecords();
        Map<Long, String> roleNames = batchRoleNames(records.stream().map(IdInvite::getRoleId).toList());
        Map<Long, String> memberNames = batchMemberNames(records.stream()
                .flatMap(r -> java.util.stream.Stream.of(r.getInviterMemberId(), r.getAcceptedMemberId()))
                .filter(java.util.Objects::nonNull).toList());

        List<EmailInviteVO> vos = records.stream().map(r -> new EmailInviteVO(
                r.getId(),
                memberNames.get(r.getInviterMemberId()),
                r.getEmail(),
                roleNames.get(r.getRoleId()),
                memberNames.get(r.getAcceptedMemberId()),
                r.getStatus(),
                r.getStatus() == 0 && notExpired(r.getExpireTime()),
                r.getSendCount(),
                r.getCreateTime()
        )).toList();
        return PageResult.of(vos, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public void revokeEmailInvite(Long inviteId) {
        IdInvite invite = inviteMapper.selectById(inviteId);
        if (invite == null) {
            throw new BizException(ResultCode.INVITE_NOT_FOUND);
        }
        invite.setStatus(2); // 已撤销
        inviteMapper.updateById(invite);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void resendEmailInvite(Long inviteId) {
        IdInvite invite = inviteMapper.selectById(inviteId);
        if (invite == null) {
            throw new BizException(ResultCode.INVITE_NOT_FOUND);
        }
        if (isAlreadyMember(invite.getProjectId(), invite.getEmail())) {
            throw new BizException(ResultCode.ALREADY_MEMBER);
        }
        String token = randomToken();
        invite.setToken(token);
        invite.setStatus(0);
        invite.setSendCount(invite.getSendCount() == null ? 1 : invite.getSendCount() + 1);
        invite.setInviterMemberId(TenantContext.getMemberId());
        invite.setAcceptedMemberId(null);
        invite.setExpireTime(LocalDateTime.now().plusHours(EMAIL_EXPIRE_HOURS));
        inviteMapper.updateById(invite);
        IdProject project = projectMapper.selectById(invite.getProjectId());
        sendInviteMail(invite.getEmail(), project == null ? "aitalky" : project.getName(), token);
    }

    // ====================================================================
    // 链接邀请(管理)—— id_invite_link 在多租户忽略表中,手动带 project_id
    // ====================================================================

    @Override
    public LinkInviteVO createLinkInvite(LinkInviteCmd cmd) {
        Long projectId = TenantContext.getProjectId();
        IdRole role = requireAssignableRole(cmd.roleId(), projectId);
        boolean privateLink = cmd.accessType() != null && cmd.accessType() == 1;

        IdInviteLink link = new IdInviteLink();
        link.setId(idGenerator.nextId());
        link.setProjectId(projectId);
        link.setToken(randomToken());
        link.setRoleId(role.getId());
        link.setAccessType(privateLink ? 1 : 0);
        link.setAccessCode(privateLink ? randomDigits(6) : null);
        link.setJoinCount(0);
        link.setDisabled(0);
        link.setInviterMemberId(TenantContext.getMemberId());
        link.setExpireTime(LocalDateTime.now().plusDays(LINK_EXPIRE_DAYS));
        linkMapper.insert(link);
        log.info("创建链接邀请 projectId={}, linkId={}, accessType={}", projectId, link.getId(), link.getAccessType());

        String inviterName = memberName(TenantContext.getMemberId());
        return new LinkInviteVO(link.getId(), inviterName, role.getName(), 0,
                link.getAccessType(), true, link.getToken(), link.getCreateTime());
    }

    @Override
    public PageResult<LinkInviteVO> pageLinkInvites(LinkInviteQuery q) {
        Long projectId = TenantContext.getProjectId();
        List<Long> inviterIds = List.of();
        if (StringUtils.hasText(q.getKeyword())) {
            inviterIds = memberMapper.selectList(Wrappers.<IdMember>lambdaQuery()
                            .select(IdMember::getId)
                            .like(IdMember::getNickname, q.getKeyword()))
                    .stream().map(IdMember::getId).toList();
            if (inviterIds.isEmpty()) {
                return PageResult.of(List.of(), 0, q.getPage(), q.getSize());
            }
        }
        // 状态筛选:1有效=未禁用且未过期;0失效
        Page<IdInviteLink> page = linkMapper.selectPage(Page.of(q.getPage(), q.getSize()),
                Wrappers.<IdInviteLink>lambdaQuery()
                        .eq(IdInviteLink::getProjectId, projectId)
                        .in(!inviterIds.isEmpty(), IdInviteLink::getInviterMemberId, inviterIds)
                        .ge(StringUtils.hasText(q.getStartDate()), IdInviteLink::getCreateTime, startOfDay(q.getStartDate()))
                        .le(StringUtils.hasText(q.getEndDate()), IdInviteLink::getCreateTime, endOfDay(q.getEndDate()))
                        .orderByDesc(IdInviteLink::getCreateTime));

        List<IdInviteLink> records = page.getRecords();
        Map<Long, String> roleNames = batchRoleNames(records.stream().map(IdInviteLink::getRoleId).toList());
        Map<Long, String> memberNames = batchMemberNames(records.stream()
                .map(IdInviteLink::getInviterMemberId).filter(java.util.Objects::nonNull).toList());

        List<LinkInviteVO> vos = records.stream()
                .map(l -> new LinkInviteVO(l.getId(), memberNames.get(l.getInviterMemberId()),
                        roleNames.get(l.getRoleId()), l.getJoinCount(), l.getAccessType(),
                        l.getDisabled() == 0 && notExpired(l.getExpireTime()), l.getToken(), l.getCreateTime()))
                // 状态筛选放内存(有效/失效是派生值)
                .filter(v -> q.getStatus() == null || (q.getStatus() == 1) == v.valid())
                .toList();
        return PageResult.of(vos, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public LinkInviteDetailVO linkInviteDetail(Long linkId) {
        IdInviteLink link = requireLink(linkId);
        IdProject project = projectMapper.selectById(link.getProjectId());
        IdRole role = roleMapper.selectById(link.getRoleId());
        return new LinkInviteDetailVO(link.getId(), project == null ? null : project.getName(),
                role == null ? null : role.getName(), link.getJoinCount(), link.getAccessType(),
                link.getAccessCode(), link.getDisabled() == 0 && notExpired(link.getExpireTime()),
                link.getToken(), link.getCreateTime(), link.getExpireTime());
    }

    @Override
    public void disableLinkInvite(Long linkId) {
        IdInviteLink link = requireLink(linkId);
        link.setDisabled(1);
        linkMapper.updateById(link);
    }

    // ====================================================================
    // 接受加入(公开 / 账号级)
    // ====================================================================

    @Override
    public InviteInfoVO inviteInfo(String token) {
        // 凭 token 跨项目查(可能在项目级令牌下调用,如"切换项目-待加入"点入);绕租户避免被当前项目过滤
        InterceptorIgnoreHelper.handle(IgnoreStrategy.builder().tenantLine(true).build());
        try {
            IdInvite email = inviteMapper.selectOne(Wrappers.<IdInvite>lambdaQuery()
                    .eq(IdInvite::getToken, token).last("limit 1"));
            if (email != null) {
                boolean valid = email.getStatus() == 0 && notExpired(email.getExpireTime());
                IdProject project = projectMapper.selectById(email.getProjectId());
                IdRole role = roleMapper.selectById(email.getRoleId());
                return new InviteInfoVO("email", email.getProjectId(),
                        project == null ? null : project.getName(), project == null ? null : project.getLogo(),
                        role == null ? null : role.getName(), email.getEmail(),
                        memberName(email.getInviterMemberId()), false, valid,
                        valid ? null : "邀请已失效");
            }
            IdInviteLink link = linkMapper.selectOne(Wrappers.<IdInviteLink>lambdaQuery()
                    .eq(IdInviteLink::getToken, token).last("limit 1"));
            if (link != null) {
                boolean valid = link.getDisabled() == 0 && notExpired(link.getExpireTime());
                IdProject project = projectMapper.selectById(link.getProjectId());
                IdRole role = roleMapper.selectById(link.getRoleId());
                return new InviteInfoVO("link", link.getProjectId(),
                        project == null ? null : project.getName(), project == null ? null : project.getLogo(),
                        role == null ? null : role.getName(), null,
                        memberName(link.getInviterMemberId()), link.getAccessType() == 1, valid,
                        valid ? null : "邀请已失效");
            }
            throw new BizException(ResultCode.INVITE_NOT_FOUND);
        } finally {
            InterceptorIgnoreHelper.clearIgnoreStrategy();
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public EnterResult accept(Long accountId, String token, AcceptInviteCmd cmd) {
        // 凭 token 跨项目接受(同上,可能在项目级令牌下调用);绕租户。enter() 内部自管租户开关。
        InterceptorIgnoreHelper.handle(IgnoreStrategy.builder().tenantLine(true).build());
        try {
            IdAccount account = accountMapper.selectById(accountId);
            if (account == null) {
                throw new BizException(ResultCode.UNAUTHORIZED);
            }
            IdInvite email = inviteMapper.selectOne(Wrappers.<IdInvite>lambdaQuery()
                    .eq(IdInvite::getToken, token).last("limit 1"));
            if (email != null) {
                return acceptEmail(account, email, cmd);
            }
            IdInviteLink link = linkMapper.selectOne(Wrappers.<IdInviteLink>lambdaQuery()
                    .eq(IdInviteLink::getToken, token).last("limit 1"));
            if (link != null) {
                return acceptLink(account, link, cmd);
            }
            throw new BizException(ResultCode.INVITE_NOT_FOUND);
        } finally {
            InterceptorIgnoreHelper.clearIgnoreStrategy();
        }
    }

    private EnterResult acceptEmail(IdAccount account, IdInvite invite, AcceptInviteCmd cmd) {
        if (invite.getStatus() != 0 || !notExpired(invite.getExpireTime())) {
            throw new BizException(ResultCode.INVITE_INVALID);
        }
        if (!invite.getEmail().equalsIgnoreCase(account.getEmail())) {
            throw new BizException(ResultCode.INVITE_EMAIL_MISMATCH);
        }
        if (isMember(invite.getProjectId(), account.getId())) {
            throw new BizException(ResultCode.ALREADY_MEMBER);
        }
        Long memberId = createMember(invite.getProjectId(), account.getId(), invite.getRoleId(), cmd.nickname(), null);
        invite.setStatus(1); // 已接受
        invite.setAcceptedMemberId(memberId);
        inviteMapper.updateById(invite);
        log.info("接受邮箱邀请 accountId={}, projectId={}, memberId={}", account.getId(), invite.getProjectId(), memberId);
        return projectService.enter(account.getId(), invite.getProjectId());
    }

    private EnterResult acceptLink(IdAccount account, IdInviteLink link, AcceptInviteCmd cmd) {
        if (link.getDisabled() == 1 || !notExpired(link.getExpireTime())) {
            throw new BizException(ResultCode.INVITE_INVALID);
        }
        if (link.getAccessType() == 1
                && (cmd.accessCode() == null || !cmd.accessCode().equals(link.getAccessCode()))) {
            throw new BizException(ResultCode.INVITE_CODE_WRONG);
        }
        if (isMember(link.getProjectId(), account.getId())) {
            throw new BizException(ResultCode.ALREADY_MEMBER);
        }
        createMember(link.getProjectId(), account.getId(), link.getRoleId(), cmd.nickname(), link.getId());
        link.setJoinCount(link.getJoinCount() == null ? 1 : link.getJoinCount() + 1);
        linkMapper.updateById(link);
        log.info("接受链接邀请 accountId={}, projectId={}, linkId={}", account.getId(), link.getProjectId(), link.getId());
        return projectService.enter(account.getId(), link.getProjectId());
    }

    @Override
    public List<com.aitalky.identity.dto.PendingInviteVO> myPendingInvites(Long accountId) {
        IdAccount account = accountMapper.selectById(accountId);
        if (account == null || !StringUtils.hasText(account.getEmail())) {
            return List.of();
        }
        String email = account.getEmail().toLowerCase();
        // 按账号邮箱跨项目查自己的待加入邀请:id_invite/id_role/id_member 均受租户过滤,
        // 这里持账号级或项目级令牌都要全程绕租户(只读自己邮箱/自己的成员身份,安全)。
        InterceptorIgnoreHelper.handle(IgnoreStrategy.builder().tenantLine(true).build());
        try {
            List<IdInvite> invites = inviteMapper.selectList(Wrappers.<IdInvite>lambdaQuery()
                    .eq(IdInvite::getEmail, email)
                    .eq(IdInvite::getStatus, 0)
                    .orderByDesc(IdInvite::getCreateTime));
            List<com.aitalky.identity.dto.PendingInviteVO> result = new ArrayList<>();
            Set<Long> seenProjects = new HashSet<>();
            for (IdInvite inv : invites) {
                if (!notExpired(inv.getExpireTime())) {
                    continue; // 过期跳过
                }
                if (!seenProjects.add(inv.getProjectId())) {
                    continue; // 同项目取最新(已按 create_time 倒序)
                }
                if (isMember(inv.getProjectId(), accountId)) {
                    continue; // 已是该项目成员跳过
                }
                IdProject project = projectMapper.selectById(inv.getProjectId());
                IdRole role = roleMapper.selectById(inv.getRoleId());
                result.add(new com.aitalky.identity.dto.PendingInviteVO(
                        inv.getToken(), inv.getProjectId(),
                        project == null ? null : project.getName(),
                        project == null ? null : project.getLogo(),
                        role == null ? null : role.getName(),
                        memberName(inv.getInviterMemberId())));
            }
            return result;
        } finally {
            InterceptorIgnoreHelper.clearIgnoreStrategy();
        }
    }

    // ====================================================================
    // 辅助
    // ====================================================================

    /** 受邀角色必须存在、属于本项目、且非"负责人" */
    private IdRole requireAssignableRole(Long roleId, Long projectId) {
        IdRole role = roleMapper.selectById(roleId);
        if (role == null || !role.getProjectId().equals(projectId)) {
            throw new BizException(ResultCode.ROLE_NOT_FOUND);
        }
        if (role.getIsSystem() == 1 && OWNER_ROLE_NAME.equals(role.getName())) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        return role;
    }

    /** 建成员(接受邀请;account 无项目上下文,显式带 projectId) */
    private Long createMember(Long projectId, Long accountId, Long roleId, String nickname, Long inviteLinkId) {
        IdMember member = new IdMember();
        member.setId(idGenerator.nextId());
        member.setProjectId(projectId);
        member.setAccountId(accountId);
        member.setRoleId(roleId);
        member.setNickname(nickname);
        member.setAvatar(DefaultAvatar.urlFor(member.getId())); // 默认头像(对齐参考)
        member.setStatus(1);
        member.setOnlineStatus(0);
        member.setWorkStatus(1); // 默认在线(对齐参考:开关默认开,参与自动分配)
        member.setLanguage("zh_CN");
        member.setSoundEnabled(1);
        member.setPushEnabled(1);
        memberMapper.insert(member);
        return member.getId();
    }

    private boolean isAlreadyMember(Long projectId, String email) {
        IdAccount account = accountMapper.selectOne(Wrappers.<IdAccount>lambdaQuery()
                .eq(IdAccount::getEmail, email).last("limit 1"));
        return account != null && isMember(projectId, account.getId());
    }

    private boolean isMember(Long projectId, Long accountId) {
        return memberMapper.exists(Wrappers.<IdMember>lambdaQuery()
                .eq(IdMember::getProjectId, projectId)
                .eq(IdMember::getAccountId, accountId));
    }

    private IdInviteLink requireLink(Long linkId) {
        IdInviteLink link = linkMapper.selectOne(Wrappers.<IdInviteLink>lambdaQuery()
                .eq(IdInviteLink::getId, linkId)
                .eq(IdInviteLink::getProjectId, TenantContext.getProjectId()).last("limit 1"));
        if (link == null) {
            throw new BizException(ResultCode.INVITE_NOT_FOUND);
        }
        return link;
    }

    private String memberName(Long memberId) {
        if (memberId == null) {
            return null;
        }
        IdMember m = memberMapper.selectById(memberId);
        return m == null ? null : m.getNickname();
    }

    private Map<Long, String> batchRoleNames(List<Long> roleIds) {
        List<Long> ids = roleIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return roleMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(IdRole::getId, IdRole::getName, (a, b) -> a));
    }

    private Map<Long, String> batchMemberNames(List<Long> memberIds) {
        List<Long> ids = memberIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return memberMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(IdMember::getId, IdMember::getNickname, (a, b) -> a));
    }

    private boolean notExpired(LocalDateTime expire) {
        return expire == null || expire.isAfter(LocalDateTime.now());
    }

    private LocalDateTime startOfDay(String date) {
        return StringUtils.hasText(date) ? LocalDate.parse(date).atStartOfDay() : null;
    }

    private LocalDateTime endOfDay(String date) {
        return StringUtils.hasText(date) ? LocalDate.parse(date).atTime(LocalTime.MAX) : null;
    }

    private String randomToken() {
        return randomFrom(TOKEN_CHARS, TOKEN_LEN);
    }

    private String randomDigits(int len) {
        return randomFrom("0123456789", len);
    }

    private String randomFrom(String chars, int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(chars.charAt(RANDOM.nextInt(chars.length())));
        }
        return sb.toString();
    }

    /** 发送邀请邮件(失败仅告警,不阻断;开发期可直接用复制的链接) */
    private void sendInviteMail(String email, String projectName, String token) {
        String link = consoleBaseUrl + "/#/join?token=" + token;
        // 开发期(开启万能码):不真发邮件,把加入链接打到日志,便于直接复制测试
        if (mailProps.masterEnabled()) {
            log.info("【邀请·DEV】已开启万能码,跳过发信。email={}, 加入链接={}", MaskUtil.maskEmail(email), link);
            return;
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("未配置邮件发送器,跳过邀请发信 email={},可手动用链接加入", MaskUtil.maskEmail(email));
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(mailProps.from());
            msg.setTo(email);
            msg.setSubject("【aitalky】邀请您加入「" + projectName + "」");
            msg.setText("您好,您被邀请加入团队「" + projectName + "」。\n请点击以下链接接受邀请(72小时内有效):\n" + link);
            sender.send(msg);
        } catch (Exception e) {
            log.warn("邀请邮件发送失败 email={}, 原因={}", MaskUtil.maskEmail(email), e.getMessage());
        }
    }
}

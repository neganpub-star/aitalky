package com.aitalky.identity.service;

import com.aitalky.common.api.PageResult;
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

/**
 * 团队邀请服务:邮箱邀请 + 链接邀请 + 接受加入。
 * <p>管理类方法在项目级上下文调用(自动租户隔离);
 * {@link #inviteInfo}/{@link #accept} 在无项目上下文(公开/账号级)调用,内部按 token 直查。
 */
public interface InviteService {

    // ===== 邮箱邀请(管理) =====
    void createEmailInvites(EmailInviteCmd cmd);

    PageResult<EmailInviteVO> pageEmailInvites(EmailInviteQuery query);

    void revokeEmailInvite(Long inviteId);

    void resendEmailInvite(Long inviteId);

    // ===== 链接邀请(管理) =====
    LinkInviteVO createLinkInvite(LinkInviteCmd cmd);

    PageResult<LinkInviteVO> pageLinkInvites(LinkInviteQuery query);

    LinkInviteDetailVO linkInviteDetail(Long linkId);

    void disableLinkInvite(Long linkId);

    // ===== 接受加入 =====
    /** 落地页信息(公开,凭 token);token 完全无效抛 INVITE_NOT_FOUND,失效/过期返回 valid=false */
    InviteInfoVO inviteInfo(String token);

    /** 接受邀请→建成员→返回项目级令牌(账号级令牌调用) */
    EnterResult accept(Long accountId, String token, AcceptInviteCmd cmd);
}

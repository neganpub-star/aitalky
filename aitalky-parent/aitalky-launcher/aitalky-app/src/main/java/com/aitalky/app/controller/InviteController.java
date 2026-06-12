package com.aitalky.app.controller;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.R;
import com.aitalky.framework.log.Log;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.identity.dto.EmailInviteCmd;
import com.aitalky.identity.dto.EmailInviteQuery;
import com.aitalky.identity.dto.EmailInviteVO;
import com.aitalky.identity.dto.LinkInviteCmd;
import com.aitalky.identity.dto.LinkInviteDetailVO;
import com.aitalky.identity.dto.LinkInviteQuery;
import com.aitalky.identity.dto.LinkInviteVO;
import com.aitalky.identity.service.InviteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 团队邀请管理接口(团队设置 → 邀请记录 / 成员管理的"邀请成员")。
 * <p>全部要求「member.manage」功能权限。
 */
@RestController
@RequestMapping("/api/invites")
@RequiredArgsConstructor
public class InviteController {

    private final InviteService inviteService;

    // ===== 邮箱邀请 =====
    /** 创建邮箱邀请(单个/批量) */
    @PostMapping("/email")
    @RequiresFunction("member.manage")
    @Log("创建邮箱邀请")
    public R<Void> createEmail(@Valid @RequestBody EmailInviteCmd cmd) {
        inviteService.createEmailInvites(cmd);
        return R.ok();
    }

    /** 邮箱邀请记录分页 */
    @GetMapping("/email")
    @RequiresFunction("member.manage")
    public R<PageResult<EmailInviteVO>> pageEmail(EmailInviteQuery query) {
        return R.ok(inviteService.pageEmailInvites(query));
    }

    /** 撤销邮箱邀请 */
    @PostMapping("/email/{id}/revoke")
    @RequiresFunction("member.manage")
    @Log("撤销邮箱邀请")
    public R<Void> revokeEmail(@PathVariable Long id) {
        inviteService.revokeEmailInvite(id);
        return R.ok();
    }

    /** 再次邀请(重发) */
    @PostMapping("/email/{id}/resend")
    @RequiresFunction("member.manage")
    @Log("再次邀请")
    public R<Void> resendEmail(@PathVariable Long id) {
        inviteService.resendEmailInvite(id);
        return R.ok();
    }

    // ===== 链接邀请 =====
    /** 创建链接邀请,返回 token(前端拼接落地页 URL) */
    @PostMapping("/link")
    @RequiresFunction("member.manage")
    @Log("创建链接邀请")
    public R<LinkInviteVO> createLink(@Valid @RequestBody LinkInviteCmd cmd) {
        return R.ok(inviteService.createLinkInvite(cmd));
    }

    /** 链接邀请记录分页 */
    @GetMapping("/link")
    @RequiresFunction("member.manage")
    public R<PageResult<LinkInviteVO>> pageLink(LinkInviteQuery query) {
        return R.ok(inviteService.pageLinkInvites(query));
    }

    /** 链接邀请详情 */
    @GetMapping("/link/{id}")
    @RequiresFunction("member.manage")
    public R<LinkInviteDetailVO> linkDetail(@PathVariable Long id) {
        return R.ok(inviteService.linkInviteDetail(id));
    }

    /** 禁用链接邀请 */
    @PostMapping("/link/{id}/disable")
    @RequiresFunction("member.manage")
    @Log("禁用链接邀请")
    public R<Void> disableLink(@PathVariable Long id) {
        inviteService.disableLinkInvite(id);
        return R.ok();
    }
}

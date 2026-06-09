package com.aitalky.app.controller;

import com.aitalky.app.dto.PreferencesReq;
import com.aitalky.common.api.R;
import com.aitalky.framework.log.Log;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.identity.dto.MemberAvatarCmd;
import com.aitalky.identity.dto.MemberNicknameCmd;
import com.aitalky.identity.dto.ProfileVO;
import com.aitalky.identity.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 个人中心(账户自助)。均作用于「当前登录成员自己」,身份取自 TenantContext,无需 member.manage 权限。
 * <p>改昵称/头像复用 MemberService(对自己);退出项目=删自己的成员身份(负责人受 owner 保护不可退)。
 */
@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final MemberService memberService;

    /** 个人资料:账户邮箱 + 当前项目成员信息(昵称/头像/角色/是否owner/偏好) */
    @GetMapping("/profile")
    public R<ProfileVO> profile() {
        return R.ok(memberService.profile(TenantContext.getMemberId()));
    }

    /** 改自己的昵称 */
    @PutMapping("/nickname")
    @Log("个人中心-改昵称")
    public R<Void> rename(@Valid @RequestBody MemberNicknameCmd cmd) {
        memberService.rename(TenantContext.getMemberId(), cmd.nickname());
        return R.ok();
    }

    /** 改自己的头像 */
    @PutMapping("/avatar")
    @Log("个人中心-改头像")
    public R<Void> updateAvatar(@Valid @RequestBody MemberAvatarCmd cmd) {
        memberService.updateAvatar(TenantContext.getMemberId(), cmd.avatar());
        return R.ok();
    }

    /** 更新偏好(语言/声音/推送) */
    @PutMapping("/preferences")
    @Log("个人中心-改偏好")
    public R<Void> preferences(@RequestBody PreferencesReq req) {
        memberService.updatePreferences(TenantContext.getMemberId(), req.language(), req.soundEnabled(), req.pushEnabled());
        return R.ok();
    }

    /** 退出当前项目(删除自己的成员身份;项目负责人不可退出,由 service owner 保护拦截) */
    @PostMapping("/leave-project")
    @Log("个人中心-退出项目")
    public R<Void> leaveProject() {
        memberService.delete(TenantContext.getMemberId());
        return R.ok();
    }
}

package com.aitalky.app.controller;

import com.aitalky.app.dto.ChangeEmailReq;
import com.aitalky.app.dto.ChangePasswordReq;
import com.aitalky.app.dto.PreferencesReq;
import com.aitalky.app.dto.ResetPasswordReq;
import com.aitalky.app.dto.UsernameReq;
import com.aitalky.app.dto.WorkStatusReq;
import com.aitalky.common.api.R;
import com.aitalky.framework.log.Log;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.identity.dto.MemberAvatarCmd;
import com.aitalky.identity.dto.MemberNicknameCmd;
import com.aitalky.identity.dto.ProfileVO;
import com.aitalky.identity.dto.PushSettingsVO;
import com.aitalky.identity.service.AccountService;
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
    private final AccountService accountService;

    /** 个人资料:账户邮箱/用户名/邀请码 + 当前项目成员信息(昵称/头像/角色/是否owner/偏好) */
    @GetMapping("/profile")
    public R<ProfileVO> profile() {
        return R.ok(memberService.profile(TenantContext.getMemberId()));
    }

    /** 改用户名(账号显示名) */
    @PutMapping("/username")
    @Log("个人中心-改用户名")
    public R<Void> updateUsername(@Valid @RequestBody UsernameReq req) {
        accountService.updateUsername(TenantContext.getAccountId(), req.username());
        return R.ok();
    }

    /** 更改邮箱(新邮箱 + 发往新邮箱的验证码) */
    @PutMapping("/email")
    @Log("个人中心-改邮箱")
    public R<Void> changeEmail(@Valid @RequestBody ChangeEmailReq req) {
        accountService.changeEmail(TenantContext.getAccountId(), req.email(), req.code());
        return R.ok();
    }

    /** 更改密码(旧密码 + 新密码,均 RSA 密文) */
    @PutMapping("/password")
    @Log("个人中心-改密码")
    public R<Void> changePassword(@Valid @RequestBody ChangePasswordReq req) {
        accountService.changePassword(TenantContext.getAccountId(), req.oldPassword(), req.newPassword());
        return R.ok();
    }

    /** 重置密码(验证码 + 新密码;忘记旧密码场景) */
    @PutMapping("/password/reset")
    @Log("个人中心-重置密码")
    public R<Void> resetPassword(@Valid @RequestBody ResetPasswordReq req) {
        accountService.resetPassword(TenantContext.getAccountId(), req.code(), req.newPassword());
        return R.ok();
    }

    /** 系统推送设置(4 类 x APP/Web) */
    @GetMapping("/push")
    public R<PushSettingsVO> pushSettings() {
        return R.ok(memberService.pushSettings(TenantContext.getMemberId()));
    }

    /** 更新系统推送设置 */
    @PutMapping("/push")
    @Log("个人中心-改系统推送")
    public R<Void> updatePushSettings(@RequestBody PushSettingsVO req) {
        memberService.updatePushSettings(TenantContext.getMemberId(), req);
        return R.ok();
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
    /** 设置工作状态(1在线 0离开)。在线是参与自动分配的前提,并对客户端展示坐席在线/离线 */
    @PutMapping("/work-status")
    @Log("设置工作状态")
    public R<Void> updateWorkStatus(@Valid @RequestBody WorkStatusReq req) {
        memberService.updateWorkStatus(TenantContext.getMemberId(), req.workStatus());
        return R.ok();
    }

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

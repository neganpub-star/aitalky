package com.aitalky.app.controller;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.R;
import com.aitalky.framework.log.Log;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.identity.dto.MemberAvatarCmd;
import com.aitalky.identity.dto.MemberNicknameCmd;
import com.aitalky.identity.dto.MemberQuery;
import com.aitalky.identity.dto.MemberRoleCmd;
import com.aitalky.identity.dto.MemberStatusCmd;
import com.aitalky.identity.dto.MemberVO;
import com.aitalky.identity.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 成员管理接口(团队设置 → 成员管理)。
 * <p>全部要求「member.manage」功能权限:普通成员无权访问;项目负责人不可被改角色/禁用/删除。
 */
@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    /** 成员分页列表 */
    @GetMapping
    @RequiresFunction({"member.view", "member.manage"})
    public R<PageResult<MemberVO>> page(MemberQuery query) {
        return R.ok(memberService.page(query));
    }

    /** 调整角色 */
    @PutMapping("/{id}/role")
    @RequiresFunction("member.manage")
    @Log("调整成员角色")
    public R<Void> updateRole(@PathVariable Long id, @Valid @RequestBody MemberRoleCmd cmd) {
        memberService.updateRole(id, cmd.roleId());
        return R.ok();
    }

    /** 重命名 */
    @PutMapping("/{id}/nickname")
    @RequiresFunction("member.manage")
    @Log("重命名成员")
    public R<Void> rename(@PathVariable Long id, @Valid @RequestBody MemberNicknameCmd cmd) {
        memberService.rename(id, cmd.nickname());
        return R.ok();
    }

    /** 修改头像 */
    @PutMapping("/{id}/avatar")
    @RequiresFunction("member.manage")
    public R<Void> updateAvatar(@PathVariable Long id, @Valid @RequestBody MemberAvatarCmd cmd) {
        memberService.updateAvatar(id, cmd.avatar());
        return R.ok();
    }

    /** 启用/禁用 */
    @PutMapping("/{id}/status")
    @RequiresFunction("member.manage")
    @Log("启用/禁用成员")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody MemberStatusCmd cmd) {
        memberService.updateStatus(id, cmd.status());
        return R.ok();
    }

    /** 删除成员 */
    @DeleteMapping("/{id}")
    @RequiresFunction("member.manage")
    @Log("删除成员")
    public R<Void> delete(@PathVariable Long id) {
        memberService.delete(id);
        return R.ok();
    }
}

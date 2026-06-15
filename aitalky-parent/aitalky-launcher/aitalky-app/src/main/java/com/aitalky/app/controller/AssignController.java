package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.conversation.dto.AssignConfigVO;
import com.aitalky.conversation.service.AssignService;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.framework.web.RequiresFunction;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 会话分配设置(普通分配模式):分配规则/最大会话数 + 参与队友。需 assign.setting 权限。
 * 参与队友昵称/头像在此调 MemberService 拼(AssignService 只存成员ID,不依赖 identity)。
 */
@RestController
@RequestMapping("/api/assign")
@RequiredArgsConstructor
public class AssignController {

    private final AssignService assignService;

    /** 分配配置 */
    @GetMapping("/config")
    @RequiresFunction("assign.setting")
    public R<AssignConfigVO> getConfig() {
        return R.ok(assignService.getConfig(TenantContext.getProjectId()));
    }

    /** 更新分配规则与最大会话数 */
    @PutMapping("/config")
    @RequiresFunction("assign.setting")
    public R<Void> updateConfig(@RequestBody AssignConfigReq req) {
        assignService.updateConfig(TenantContext.getProjectId(), req.assignMode(), req.maxConcurrent());
        return R.ok();
    }

    /** 参与队友成员ID列表(前端用成员表映射出昵称/头像/角色) */
    @GetMapping("/members")
    @RequiresFunction("assign.setting")
    public R<List<Long>> members() {
        return R.ok(assignService.participantIds(TenantContext.getProjectId()));
    }

    /** 添加参与队友(实时保存) */
    @PostMapping("/members")
    @RequiresFunction("assign.setting")
    public R<Void> addMember(@RequestBody MemberRef req) {
        assignService.addParticipant(TenantContext.getProjectId(), req.memberId());
        return R.ok();
    }

    /** 移除参与队友(实时保存) */
    @DeleteMapping("/members/{memberId}")
    @RequiresFunction("assign.setting")
    public R<Void> removeMember(@PathVariable Long memberId) {
        assignService.removeParticipant(TenantContext.getProjectId(), memberId);
        return R.ok();
    }

    public record AssignConfigReq(Integer assignMode, Integer maxConcurrent) {
    }

    public record MemberRef(Long memberId) {
    }
}

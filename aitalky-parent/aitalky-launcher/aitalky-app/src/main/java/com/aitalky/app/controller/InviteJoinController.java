package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.identity.dto.AcceptInviteCmd;
import com.aitalky.identity.dto.EnterResult;
import com.aitalky.identity.dto.InviteInfoVO;
import com.aitalky.identity.service.InviteService;
import com.aitalky.framework.tenant.TenantContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 邀请落地/接受加入接口。
 * <p>{@code GET /{token}} 为公开接口(WebMvcConfig 放行,落地页未登录即可看邀请信息);
 * <p>{@code POST /{token}/accept} 需「账号级」令牌(先注册/登录拿到账号 token,再接受加入)。
 */
@RestController
@RequestMapping("/api/auth/invite")
@RequiredArgsConstructor
public class InviteJoinController {

    private final InviteService inviteService;

    /** 落地页:凭 token 查邀请信息(项目/角色/邀请人/是否私密) */
    @GetMapping("/{token}")
    public R<InviteInfoVO> info(@PathVariable String token) {
        return R.ok(inviteService.inviteInfo(token));
    }

    /** 接受邀请→建成员→返回项目级令牌(账号级令牌调用) */
    @PostMapping("/{token}/accept")
    public R<EnterResult> accept(@PathVariable String token, @Valid @RequestBody AcceptInviteCmd cmd) {
        return R.ok(inviteService.accept(TenantContext.getAccountId(), token, cmd));
    }
}

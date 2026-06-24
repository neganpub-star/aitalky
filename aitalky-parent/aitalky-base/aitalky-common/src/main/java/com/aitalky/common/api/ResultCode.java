package com.aitalky.common.api;

/**
 * 统一错误码。
 * <p>message 仅作为兜底默认文案；对外提示走 i18n（framework 的 MessageUtil 按 code 取多语言文案）。
 */
public enum ResultCode {

    /** 成功 */
    SUCCESS(0, "success"),
    /** 通用业务失败 */
    FAIL(1, "fail"),

    // ===== 鉴权 / 权限 4xx =====
    UNAUTHORIZED(401, "unauthorized"),
    FORBIDDEN(403, "forbidden"),
    NOT_FOUND(404, "not.found"),

    // ===== 业务域 1xxx =====
    PARAM_INVALID(1001, "param.invalid"),
    TENANT_MISSING(1002, "tenant.missing"),
    NO_FUNCTION_PERMISSION(1003, "no.function.permission"),
    /** 项目无有效订阅(未订阅/已到期);前端据此引导前往订阅页 */
    NO_SUBSCRIPTION(1004, "no.subscription"),

    // ===== 身份/账号 101x =====
    EMAIL_ALREADY_EXISTS(1010, "email.exists"),
    LOGIN_FAILED(1011, "login.failed"),
    ACCOUNT_DISABLED(1012, "account.disabled"),
    PROJECT_NOT_FOUND(1013, "project.not.found"),
    NOT_PROJECT_MEMBER(1014, "not.project.member"),
    VERIFY_CODE_ERROR(1015, "verify.code.error"),
    VERIFY_CODE_TOO_FREQUENT(1016, "verify.code.too.frequent"),
    OPERATE_OWNER_FORBIDDEN(1017, "operate.owner.forbidden"),
    MEMBER_NOT_FOUND(1018, "member.not.found"),
    OLD_PASSWORD_ERROR(1019, "old.password.error"),
    INVITE_CODE_INVALID(1021, "invite.code.invalid"),
    CAPTCHA_ERROR(1022, "captcha.error"),
    DATA_DUPLICATED(1023, "data.duplicated"),

    // ===== 团队/邀请/角色 103x =====
    /** 邀请不存在 */
    INVITE_NOT_FOUND(1030, "invite.not.found"),
    /** 邀请已失效(撤销/过期/禁用) */
    INVITE_INVALID(1031, "invite.invalid"),
    /** 邀请验证码错误(私密链接) */
    INVITE_CODE_WRONG(1032, "invite.code.wrong"),
    /** 已是该项目成员 */
    ALREADY_MEMBER(1033, "already.member"),
    /** 注册/登录邮箱与受邀邮箱不一致 */
    INVITE_EMAIL_MISMATCH(1034, "invite.email.mismatch"),
    /** 角色不存在 */
    ROLE_NOT_FOUND(1035, "role.not.found"),
    /** 系统预置角色不可修改/删除 */
    ROLE_SYSTEM_READONLY(1036, "role.system.readonly"),
    /** 角色下仍有成员,不可删除 */
    ROLE_IN_USE(1037, "role.in.use"),
    /** 角色名重复 */
    ROLE_NAME_DUPLICATED(1038, "role.name.duplicated"),
    /** 仅项目负责人可操作 */
    OWNER_ONLY(1039, "owner.only"),

    // ===== 限流 102x =====
    RATE_LIMITED(1020, "rate.limited"),

    // ===== 信使/会话 102x =====
    /** 客户被拉黑,会话不可用(信使端发消息时拦截) */
    CONVERSATION_BLOCKED(1024, "conversation.blocked"),
    /** 消息不存在(撤回时) */
    MESSAGE_NOT_FOUND(1025, "message.not.found"),
    /** 超过可撤回时限 */
    RETRACT_EXPIRED(1026, "retract.expired"),
    /** 无权撤回该消息(非本人发送 / 客户撤回权限未开启) */
    RETRACT_FORBIDDEN(1027, "retract.forbidden"),

    // ===== 订阅计费 105x =====
    /** 不支持的币种/链(bil_coin 未配置或已停用) */
    BILLING_COIN_NOT_SUPPORTED(1050, "billing.coin.not.supported"),
    /** 支付渠道异常(建址失败/渠道未配置/网络错误) */
    BILLING_CHANNEL_ERROR(1051, "billing.channel.error"),
    /** 回调验签失败 */
    BILLING_CALLBACK_SIGN_INVALID(1052, "billing.callback.sign.invalid"),
    /** 回调地址无法反查到项目(地址不属于本系统) */
    BILLING_CALLBACK_ADDRESS_UNKNOWN(1053, "billing.callback.address.unknown"),
    /** 余额入账并发冲突(乐观锁重试耗尽) */
    BILLING_WALLET_CREDIT_CONFLICT(1054, "billing.wallet.credit.conflict"),
    /** 套餐不可订阅(未上架/定制版需联系商务) */
    BILLING_PLAN_UNAVAILABLE(1055, "billing.plan.unavailable"),
    /** 余额不足，请先充值 */
    BILLING_BALANCE_INSUFFICIENT(1056, "billing.balance.insufficient"),
    /** 订单不可支付(不存在/已支付/已作废) */
    BILLING_ORDER_NOT_PAYABLE(1057, "billing.order.not.payable"),
    /** 加购需先有有效订阅(未订阅/已过期不能加购席位/客户配额) */
    BILLING_SUBSCRIPTION_REQUIRED(1058, "billing.subscription.required"),
    /** 加购项不可用(对应加量包未配置/已下架) */
    BILLING_ADDON_UNAVAILABLE(1059, "billing.addon.unavailable"),
    /** 已有待支付订单,需先处理完(支付/取消)再下新单 */
    BILLING_HAS_PENDING_ORDER(1060, "billing.has.pending.order"),
    /** 资源配额不足(席位/客户配额等已达上限,需升级套餐或加购) */
    RESOURCE_QUOTA_EXCEEDED(1061, "billing.resource.quota.exceeded"),
    /** 验证码连续输错次数过多,已临时锁定(防暴力枚举) */
    VERIFY_CODE_LOCKED(1062, "verify.code.locked"),
    /** 翻译额度不足(translate_char 配额耗尽);提示充值或关闭自动翻译 */
    TRANSLATE_QUOTA_EXCEEDED(1063, "translate.quota.exceeded"),

    // ===== 系统 5xx =====
    SYSTEM_ERROR(500, "system.error");

    private final int code;
    /** i18n key（messages_*.properties 中的键），同时作为默认英文文案的占位 */
    private final String i18nKey;

    ResultCode(int code, String i18nKey) {
        this.code = code;
        this.i18nKey = i18nKey;
    }

    public int getCode() {
        return code;
    }

    public String getI18nKey() {
        return i18nKey;
    }
}

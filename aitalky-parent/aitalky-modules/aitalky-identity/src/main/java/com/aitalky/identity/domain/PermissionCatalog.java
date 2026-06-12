package com.aitalky.identity.domain;

import com.aitalky.identity.dto.PermModule;
import com.aitalky.identity.dto.PermNode;

import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

/**
 * 权限目录(角色管理权限树的"单一真相")。
 * <p>按本系统**真实的 RBAC**(SystemRole 中的 pages/functions)组织成「模块 / 页面 / 功能」三列,
 * 不照搬参考系统里我们没有的模块(Wiki/智能AI/数字员工等),避免授予无法鉴权的"假权限"。
 * <p>保存角色权限时,前端勾选的 token 按 {@link PermNode#store()} 拆回 pages[] / functions[]。
 */
public final class PermissionCatalog {

    private PermissionCatalog() {
    }

    private static final String PAGE = "page";
    private static final String FUNC = "function";

    private static final List<PermModule> MODULES = List.of(
            new PermModule("inbox", "收件箱",
                    List.of(
                            new PermNode("inbox", "收件箱", PAGE),
                            new PermNode("inbox.viewAll", "全部会话", FUNC),
                            new PermNode("inbox.viewUnassigned", "未分配", FUNC)),
                    List.of(
                            new PermNode("conversation.send", "发送消息", FUNC),
                            new PermNode("conversation.withdraw", "撤回消息", FUNC),
                            new PermNode("conversation.transfer", "转接会话", FUNC),
                            new PermNode("conversation.close", "结束会话", FUNC),
                            new PermNode("conversation.blacklist", "加入黑名单", FUNC))),
            new PermModule("customers", "客户",
                    List.of(new PermNode("customers", "客户", PAGE)),
                    List.of()),
            new PermModule("statistics", "数据统计",
                    List.of(new PermNode("statistics", "数据统计", PAGE)),
                    List.of()),
            new PermModule("settings", "设置",
                    List.of(new PermNode("settings", "设置", PAGE)),
                    List.of(
                            new PermNode("member.manage", "成员管理", FUNC),
                            new PermNode("role.manage", "角色管理", FUNC),
                            new PermNode("messenger.setting", "信使设置", FUNC),
                            new PermNode("assign.setting", "会话分配设置", FUNC),
                            new PermNode("group.manage", "客服组管理", FUNC),
                            new PermNode("quickreply.manage", "快捷回复管理", FUNC),
                            new PermNode("blacklist.manage", "黑名单管理", FUNC),
                            new PermNode("project.setting", "项目设置", FUNC),
                            new PermNode("billing.manage", "订阅计费", FUNC))));

    public static List<PermModule> modules() {
        return MODULES;
    }

    /** 目录中所有合法 token(保存时过滤越权 token) */
    public static Set<String> allTokens() {
        return MODULES.stream()
                .flatMap(m -> Stream.concat(m.pages().stream(), m.functions().stream()))
                .map(PermNode::token)
                .collect(java.util.stream.Collectors.toSet());
    }

    /** token → store("page"/"function"),用于把勾选拆回 pages/functions */
    public static String storeOf(String token) {
        return MODULES.stream()
                .flatMap(m -> Stream.concat(m.pages().stream(), m.functions().stream()))
                .filter(n -> n.token().equals(token))
                .map(PermNode::store)
                .findFirst().orElse(null);
    }
}

package com.aitalky.identity.domain;

import com.aitalky.identity.dto.PermModule;
import com.aitalky.identity.dto.PermNode;
import com.aitalky.identity.dto.PermRow;

import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

/**
 * 权限目录(角色管理权限树的"单一真相"),按参考系统 1:1 铺开。
 * 结构对齐参考:**5 个模块**(收件箱 / 客户管理 / Wiki / 智能AI / 设置),每个模块名跨多行,
 * 每行 = 「页面」节点 + 该行「功能」节点。
 *
 * <p><b>token 生效情况</b>:
 * <ul>
 *   <li><b>已生效</b>:inbox.viewAll/viewUnassigned/search、conversation.*、messenger.setting、assign.setting、
 *       group.manage、blacklist.manage、quickreply.manage、project.setting、member.manage、role.manage、billing.manage,
 *       以及各设置区的 *.view 只读 token。</li>
 *   <li><b>占位</b>(功能未做,勾选可存暂不拦截,落地再接 {@code @RequiresFunction}):客户管理/Wiki/智能AI/
 *       紧急通知/API管理/概览·套餐·订单 等叶子,及已有区域下更细子动作(如 member.invite、messenger.greeting…)。</li>
 * </ul>
 *
 * <p>系统角色权限运行时由 {@link #forRole(String)} 按本目录派生(显示+鉴权统一,免迁移)。
 * <p>列归属由放在 row.pages 还是 row.functions 决定;存入角色 JSON 的数组由 {@link PermNode#store()} 决定
 * (page→pages[]、function→functions[],鉴权只看 functions[])。已生效功能 token 即使在「页面」列,store 仍为 function。
 */
public final class PermissionCatalog {

    private PermissionCatalog() {
    }

    private static final String PAGE = "page";
    private static final String FUNC = "function";

    private static final List<String> CONV_ALL = List.of(
            "conversation.send", "conversation.withdraw", "conversation.transfer",
            "conversation.close", "conversation.blacklist");
    private static final List<String> CONV_MEMBER = List.of(
            "conversation.send", "conversation.withdraw", "conversation.close");

    // 节点:pp=页面列存pages[];pf=页面列但存functions[](已生效功能);ff=功能列存functions[]
    private static PermNode pp(String token, String name) { return new PermNode(token, name, PAGE); }
    private static PermNode pf(String token, String name) { return new PermNode(token, name, FUNC); }
    private static PermNode ff(String token, String name) { return new PermNode(token, name, FUNC); }

    private static PermRow row(List<PermNode> pages, List<PermNode> functions) {
        return new PermRow(pages, functions);
    }

    private static final List<PermModule> MODULES = List.of(
            new PermModule("inbox", "收件箱", List.of(
                    row(List.of(pf("inbox.viewAll", "全部"), pf("inbox.viewUnassigned", "未分配"),
                            pp("inbox.digitalEmployee", "数字员工"), pf("inbox.search", "会话搜索")), List.of()))),

            new PermModule("customers", "客户管理", List.of(
                    row(List.of(pp("customer.list", "客户列表"), pp("customer.marketing", "自动营销"),
                            pp("customer.insight", "洞察设置")), List.of()))),

            new PermModule("wiki", "Wiki", List.of(
                    row(List.of(pp("wiki.article", "文章列表")),
                            List.of(ff("wiki.article.create", "新增文章"), ff("wiki.article.edit", "编辑"),
                                    ff("wiki.article.publish", "发布/取消发布"), ff("wiki.article.delete", "删除"),
                                    ff("wiki.article.setting", "文章设置"))),
                    row(List.of(pp("wiki.app", "应用")),
                            List.of(ff("wiki.app.create", "创建自定义应用"), ff("wiki.app.site", "站点配置"),
                                    ff("wiki.app.style", "样式配置"), ff("wiki.app.content", "内容配置"),
                                    ff("wiki.app.delete", "删除应用"))))),

            new PermModule("ai", "智能AI", List.of(
                    row(List.of(pp("ai.home", "首页")), List.of(ff("ai.home.toggle", "启用/暂停"))),
                    row(List.of(pp("ai.train", "训练")),
                            List.of(ff("ai.train.model", "会话自动建模"), ff("ai.train.employee", "训练数字员工"))),
                    row(List.of(pp("ai.config", "设置")),
                            List.of(ff("ai.config.style", "样式设置"), ff("ai.config.reply", "回复设置"))),
                    row(List.of(pp("ai.flow", "流程列表")), List.of(ff("ai.flow.manage", "流程管理"))))),

            new PermModule("settings", "设置", List.of(
                    row(List.of(pp("notice.urgent", "紧急通知设置")), List.of(ff("notice.edit", "编辑通知"))),
                    row(List.of(pf("messenger.view", "信使设置")),
                            List.of(ff("messenger.setting", "设置欢迎语"), ff("messenger.replyTime", "设置回复时间"),
                                    ff("messenger.bizCard", "设置业务卡片"), ff("messenger.viewTime", "信使查看时间配置"),
                                    ff("messenger.launcher", "启动器样式"), ff("messenger.sysMsg", "系统消息显示"),
                                    ff("messenger.preference", "偏好设置"), ff("messenger.customerRetract", "客户撤回消息权限"),
                                    ff("messenger.webMeta", "自定义网站标题和图标"))),
                    row(List.of(pf("assign.view", "会话设置")),
                            List.of(ff("assign.setting", "基本设置"), ff("assign.domain", "域名自定义"),
                                    ff("assign.normal", "普通分配模式"), ff("group.manage", "专属分配模式"),
                                    ff("assign.keep", "保持期设置"))),
                    row(List.of(pp("api.manage", "API管理")), List.of(ff("api.resetSecret", "重置Secret Key"))),
                    row(List.of(pf("blacklist.view", "黑名单")), List.of(ff("blacklist.manage", "移除黑名单"))),
                    row(List.of(pf("quickreply.view", "快捷回复")), List.of(ff("quickreply.manage", "快捷回复管理"))),
                    row(List.of(pf("project.view", "基本信息")), List.of(ff("project.setting", "编辑信息"))),
                    row(List.of(pf("member.view", "成员信息")),
                            List.of(ff("member.manage", "邀请成员"), ff("member.rename", "重命名"),
                                    ff("member.role", "调整角色"), ff("member.avatar", "修改头像"),
                                    ff("member.ban", "禁用/解禁"), ff("member.delete", "删除"))),
                    row(List.of(pp("invite.record", "邀请记录")),
                            List.of(ff("invite.revoke", "撤销邀请"), ff("invite.resend", "再次邀请"),
                                    ff("invite.ban", "禁用/解禁"))),
                    row(List.of(pf("role.view", "角色管理")),
                            List.of(ff("role.manage", "添加角色"), ff("role.rename", "重命名"),
                                    ff("role.delete", "删除"), ff("role.editPerm", "修改权限"))),
                    row(List.of(pp("project.cancel", "注销项目")), List.of(ff("project.cancelConfirm", "确认注销"))),
                    row(List.of(pf("billing.view", "概览")),
                            List.of(ff("billing.manage", "增加席位"), ff("billing.buyTranslate", "购买翻译包"),
                                    ff("billing.buyTokens", "购买tokens"), ff("billing.buyCustomerPack", "购买客户拓展包"))),
                    row(List.of(pp("billing.plan", "套餐信息")), List.of(ff("billing.subscribe", "订阅"))),
                    row(List.of(pp("billing.order", "订单记录")),
                            List.of(ff("billing.pay", "支付"), ff("billing.cancelOrder", "取消订单"))))));

    public static List<PermModule> modules() {
        return MODULES;
    }

    private static Stream<PermNode> allNodes() {
        return MODULES.stream().flatMap(m -> m.rows().stream())
                .flatMap(r -> Stream.concat(r.pages().stream(), r.functions().stream()));
    }

    /** 目录中所有合法 token(保存自定义角色时过滤越权 token) */
    public static Set<String> allTokens() {
        return allNodes().map(PermNode::token).collect(java.util.stream.Collectors.toSet());
    }

    /** token → store("page"/"function") */
    public static String storeOf(String token) {
        return allNodes().filter(n -> n.token().equals(token)).map(PermNode::store).findFirst().orElse(null);
    }

    private static List<String> tokensByStore(String store) {
        return allNodes().filter(n -> store.equals(n.store())).map(PermNode::token).distinct().toList();
    }

    /**
     * 系统角色权限(运行时派生,不取 DB):
     * <ul>
     *   <li>负责人:全部 pages + 全部 functions + 会话动作。</li>
     *   <li>管理员:同负责人,去掉「基本信息→编辑信息」「注销项目/确认注销」。</li>
     *   <li>普通成员:收件箱(全部/未分配/会话搜索)+ 会话回复/撤回/结束 + 各设置区 *.view 只读 token
     *       (可看不能改)+ 占位查看类(Wiki/AI首页·流程/API/邀请记录/套餐/订单)。即对齐参考"可见不可改"。</li>
     * </ul>
     * 非系统角色名返回 null。
     */
    public static PermissionView forRole(String roleName) {
        List<String> allPages = tokensByStore(PAGE);
        List<String> allFuncs = tokensByStore(FUNC);
        return switch (roleName == null ? "" : roleName) {
            case "负责人" -> new PermissionView(allPages, concat(allFuncs, CONV_ALL));
            // 管理员去掉「注销项目/确认注销」;基本信息编辑(project.setting)保留——它同时是项目管理写权,
            // 去掉会让管理员无法管理项目,故与参考"编辑信息未勾"略有出入但更稳妥。
            case "管理员" -> new PermissionView(
                    minus(allPages, Set.of("project.cancel")),
                    concat(minus(allFuncs, Set.of("project.cancelConfirm")), CONV_ALL));
            case "普通成员" -> new PermissionView(
                    List.of("wiki.article", "wiki.app", "ai.home", "ai.flow",
                            "api.manage", "invite.record", "billing.plan", "billing.order"),
                    concat(List.of("inbox.viewAll", "inbox.viewUnassigned", "inbox.search",
                            "messenger.view", "assign.view", "blacklist.view", "quickreply.view",
                            "project.view", "member.view", "role.view", "billing.view",
                            "wiki.article.create", "wiki.article.edit", "wiki.article.publish",
                            "wiki.article.delete", "wiki.article.setting",
                            "wiki.app.create", "wiki.app.site", "wiki.app.style",
                            "wiki.app.content", "wiki.app.delete"), CONV_MEMBER));
            default -> null;
        };
    }

    private static List<String> minus(List<String> src, Set<String> remove) {
        return src.stream().filter(t -> !remove.contains(t)).toList();
    }

    private static List<String> concat(List<String> a, List<String> b) {
        return Stream.concat(a.stream(), b.stream()).distinct().toList();
    }
}

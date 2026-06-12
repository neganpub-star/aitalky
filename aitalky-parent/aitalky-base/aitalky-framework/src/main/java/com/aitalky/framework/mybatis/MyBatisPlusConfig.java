package com.aitalky.framework.mybatis;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.handler.TenantLineHandler;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.TenantLineInnerInterceptor;
import com.aitalky.framework.tenant.TenantContext;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.LongValue;
import net.sf.jsqlparser.expression.NullValue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Set;

/**
 * MyBatis-Plus 配置：多租户 SQL 拦截 + 分页。
 * <p><b>多租户拦截器（核心）</b>：对带 project_id 的表，自动在 where 拼上 {@code project_id = 当前租户}，
 * 杜绝跨项目串数据——不用每个 SQL 手写租户条件。
 * <p>无 project_id 的表（平台 pf_、id_account/project/invite_link 等）在 {@code IGNORE_TABLES} 中忽略；
 * 当上下文无 projectId（平台后管/登录前）时也整体忽略。
 */
@Configuration
public class MyBatisPlusConfig {

    /** 租户列名 */
    private static final String TENANT_COLUMN = "project_id";

    /** 不参与多租户过滤的表（本身无 project_id 列 / 跨租户/平台级） */
    private static final Set<String> IGNORE_TABLES = Set.of(
            "pf_admin", "pf_admin_role", "pf_plan", "pf_plan_quota", "pf_addon_pack", "pf_agreement",
            "id_account", "id_project", "id_invite_link"
    );

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();

        // 1) 多租户拦截器（要放在分页之前）
        interceptor.addInnerInterceptor(new TenantLineInnerInterceptor(new TenantLineHandler() {
            @Override
            public Expression getTenantId() {
                Long projectId = TenantContext.getProjectId();
                // 上下文无租户时返回 NULL（配合下方 ignoreTable，整体不拼条件）
                return projectId == null ? new NullValue() : new LongValue(projectId);
            }

            @Override
            public String getTenantIdColumn() {
                return TENANT_COLUMN;
            }

            @Override
            public boolean ignoreTable(String tableName) {
                // 无登录租户上下文 → 全部忽略（平台后管/登录接口）
                if (TenantContext.getProjectId() == null) {
                    return true;
                }
                String t = tableName.toLowerCase();
                // 平台级表（pf_ 前缀）本就无 project_id 列，一律忽略；防止新增 pf_ 表漏配 IGNORE_TABLES 踩坑
                return t.startsWith("pf_") || IGNORE_TABLES.contains(t);
            }
        }));

        // 2) 分页
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
}

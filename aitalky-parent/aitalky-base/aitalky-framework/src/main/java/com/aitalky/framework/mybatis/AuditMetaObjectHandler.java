package com.aitalky.framework.mybatis;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import com.aitalky.framework.tenant.TenantContext;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 审计字段自动填充：create_by/create_time/update_by/update_time。
 * <p>操作人取当前登录成员 id（无则 0=系统）。del_flag 默认值由 DDL 兜底。
 */
@Component
public class AuditMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        Long operator = currentOperator();
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, now);
        this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, now);
        this.strictInsertFill(metaObject, "createBy", Long.class, operator);
        this.strictInsertFill(metaObject, "updateBy", Long.class, operator);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
        this.strictUpdateFill(metaObject, "updateBy", Long.class, currentOperator());
    }

    private Long currentOperator() {
        Long memberId = TenantContext.getMemberId();
        if (memberId != null) {
            return memberId;
        }
        Long accountId = TenantContext.getAccountId();
        return accountId != null ? accountId : 0L;
    }
}

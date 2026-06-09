package com.aitalky.framework.mybatis;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 实体基类：所有表共有的 主键 + 审计字段 + 逻辑删除。
 * <p>id 用雪花ID手动注入（IdType.INPUT）；审计字段由 {@code AuditMetaObjectHandler} 自动填充。
 */
@Data
public class BaseEntity implements Serializable {

    /** 主键(雪花ID)，插入前由 Service 用 SnowflakeIdGenerator 赋值 */
    @TableId(value = "id", type = IdType.INPUT)
    private Long id;

    @TableField(value = "create_by", fill = FieldFill.INSERT)
    private Long createBy;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_by", fill = FieldFill.INSERT_UPDATE)
    private Long updateBy;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    /** 逻辑删除标志 0存在 1删除（全局配置 + 注解双保险） */
    @TableLogic
    @TableField("del_flag")
    private Integer delFlag;
}

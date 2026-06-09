package com.aitalky.framework.log.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 操作日志(sys_oper_log) */
@Data
@TableName("sys_oper_log")
public class SysOperLog {

    @TableId(value = "id", type = IdType.INPUT)
    private Long id;
    private Long projectId;
    private Long operatorId;
    private String action;
    private String method;
    private String params;
    private String ip;
    private Long costMs;
    private Integer success;
    private String errorMsg;
    private LocalDateTime createTime;
}

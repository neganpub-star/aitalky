package com.aitalky.framework.log.mapper;

import com.aitalky.framework.log.entity.SysOperLog;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/** 操作日志数据访问(包名匹配各入口的 @MapperScan("com.aitalky.**.mapper")) */
@Mapper
public interface SysOperLogMapper extends BaseMapper<SysOperLog> {
}

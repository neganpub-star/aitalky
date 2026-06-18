package com.aitalky.billing.mapper;

import com.aitalky.billing.entity.BilSubscriptionLog;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/** 订阅操作日志数据访问 */
@Mapper
public interface BilSubscriptionLogMapper extends BaseMapper<BilSubscriptionLog> {
}

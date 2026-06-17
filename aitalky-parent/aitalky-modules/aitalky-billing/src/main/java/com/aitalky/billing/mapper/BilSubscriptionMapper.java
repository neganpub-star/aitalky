package com.aitalky.billing.mapper;

import com.aitalky.billing.entity.BilSubscription;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Update;

/** 项目订阅数据访问 */
@Mapper
public interface BilSubscriptionMapper extends BaseMapper<BilSubscription> {

    /** 将已过期且仍有效的订阅置为过期(跨项目,定时任务用);返回处理条数 */
    @Update("UPDATE bil_subscription SET status = 0, update_time = NOW() " +
            "WHERE status = 1 AND expire_time < NOW() AND del_flag = 0")
    int expireOverdue();
}

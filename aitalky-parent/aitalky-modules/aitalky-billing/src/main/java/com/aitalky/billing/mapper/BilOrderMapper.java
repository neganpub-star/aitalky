package com.aitalky.billing.mapper;

import com.aitalky.billing.entity.BilOrder;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/** 订阅订单数据访问 */
@Mapper
public interface BilOrderMapper extends BaseMapper<BilOrder> {

    /** 作废项目当前所有待支付订单(下新单前调用，保证唯一待支付) */
    @Update("UPDATE bil_order SET status = 2, update_time = NOW() " +
            "WHERE project_id = #{projectId} AND status = 0 AND del_flag = 0")
    int voidPendingOrders(@Param("projectId") Long projectId);

    /**
     * 核销:待支付→已完成(状态条件更新，防重复核销)。
     * <p>返回受影响行数(0=订单不存在/已支付/已作废)。
     */
    @Update("UPDATE bil_order SET status = 1, paid_time = NOW(), update_time = NOW() " +
            "WHERE id = #{orderId} AND project_id = #{projectId} AND status = 0 AND del_flag = 0")
    int markPaid(@Param("orderId") Long orderId, @Param("projectId") Long projectId);

    /** 取消单个待支付订单(status 0→2,状态条件更新);返回受影响行数 */
    @Update("UPDATE bil_order SET status = 2, update_time = NOW() " +
            "WHERE id = #{orderId} AND project_id = #{projectId} AND status = 0 AND del_flag = 0")
    int cancelOne(@Param("orderId") Long orderId, @Param("projectId") Long projectId);

    /** 作废项目内已超时的待支付订单(expire_time<now);读取待支付前懒过期,避免返回死单/挡新单。返回条数 */
    @Update("UPDATE bil_order SET status = 2, update_time = NOW() " +
            "WHERE project_id = #{projectId} AND status = 0 AND expire_time IS NOT NULL AND expire_time < NOW() AND del_flag = 0")
    int expireStalePending(@Param("projectId") Long projectId);

    /** 作废所有已超时的待支付订单(跨项目,定时任务用);返回条数 */
    @Update("UPDATE bil_order SET status = 2, update_time = NOW() " +
            "WHERE status = 0 AND expire_time IS NOT NULL AND expire_time < NOW() AND del_flag = 0")
    int expireOverduePending();
}

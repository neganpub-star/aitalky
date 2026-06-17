package com.aitalky.billing.mapper;

import com.aitalky.billing.entity.BilWallet;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.math.BigDecimal;

/** 项目钱包数据访问 */
@Mapper
public interface BilWalletMapper extends BaseMapper<BilWallet> {

    /**
     * 原子入账:余额 += amount 且 version+1，带 version 乐观锁条件。
     * <p>金额自增在 DB 完成(非读改写)，配合项目锁 + txid 幂等三重防丢更新。
     * <p>回调无租户上下文，故显式带 project_id 条件;返回受影响行数(0=version 冲突需重试)。
     */
    @Update("UPDATE bil_wallet SET balance = balance + #{amount}, version = version + 1, " +
            "sign = #{sign}, update_time = NOW() " +
            "WHERE project_id = #{projectId} AND version = #{version} AND del_flag = 0")
    int creditBalance(@Param("projectId") Long projectId,
                      @Param("amount") BigDecimal amount,
                      @Param("sign") String sign,
                      @Param("version") Integer version);

    /**
     * 原子扣款:余额 -= amount 且 version+1，带 version 乐观锁 + 余额充足条件。
     * <p>核销订单用;balance >= amount 条件保证余额不会被扣成负数(0行=余额不足或并发冲突)。
     */
    @Update("UPDATE bil_wallet SET balance = balance - #{amount}, version = version + 1, " +
            "sign = #{sign}, update_time = NOW() " +
            "WHERE project_id = #{projectId} AND version = #{version} AND balance >= #{amount} AND del_flag = 0")
    int debitBalance(@Param("projectId") Long projectId,
                     @Param("amount") BigDecimal amount,
                     @Param("sign") String sign,
                     @Param("version") Integer version);
}

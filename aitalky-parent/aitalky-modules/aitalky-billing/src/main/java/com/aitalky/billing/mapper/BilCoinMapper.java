package com.aitalky.billing.mapper;

import com.aitalky.billing.entity.BilCoin;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/** 币种/链配置数据访问 */
@Mapper
public interface BilCoinMapper extends BaseMapper<BilCoin> {
}

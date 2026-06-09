package com.aitalky.customer.mapper;

import com.aitalky.customer.entity.CusCustomer;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/** 客户数据访问 */
@Mapper
public interface CusCustomerMapper extends BaseMapper<CusCustomer> {
}

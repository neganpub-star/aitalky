package com.aitalky.messenger.mapper;

import com.aitalky.messenger.entity.MseMessenger;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/** 信使配置数据访问 */
@Mapper
public interface MseMessengerMapper extends BaseMapper<MseMessenger> {
}

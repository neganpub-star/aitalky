package com.aitalky.identity.mapper;

import com.aitalky.identity.entity.IdInvite;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/** 邮箱邀请数据访问 */
@Mapper
public interface IdInviteMapper extends BaseMapper<IdInvite> {
}

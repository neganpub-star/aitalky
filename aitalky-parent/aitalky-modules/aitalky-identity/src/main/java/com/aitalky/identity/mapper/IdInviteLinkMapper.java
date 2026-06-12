package com.aitalky.identity.mapper;

import com.aitalky.identity.entity.IdInviteLink;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/** 链接邀请数据访问(本表在多租户忽略表中,查询需手动带 project_id) */
@Mapper
public interface IdInviteLinkMapper extends BaseMapper<IdInviteLink> {
}

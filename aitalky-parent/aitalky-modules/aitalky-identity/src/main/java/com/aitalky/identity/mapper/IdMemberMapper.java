package com.aitalky.identity.mapper;

import com.aitalky.identity.entity.IdMember;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/** IdMember 数据访问(继承 BaseMapper,获得通用 CRUD;复杂查询再加自定义方法) */
@Mapper
public interface IdMemberMapper extends BaseMapper<IdMember> {
}

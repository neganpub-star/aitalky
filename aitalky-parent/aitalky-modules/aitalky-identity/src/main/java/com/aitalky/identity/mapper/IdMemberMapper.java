package com.aitalky.identity.mapper;

import com.aitalky.identity.entity.IdMember;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

/** IdMember 数据访问(继承 BaseMapper,获得通用 CRUD;复杂查询再加自定义方法) */
@Mapper
public interface IdMemberMapper extends BaseMapper<IdMember> {

    /**
     * 取该项目+账号的成员 id(含已软删 del_flag=1);自写 SQL 不受逻辑删除过滤。
     * 用于重新加入时探测被移除(软删)的旧成员行——唯一键不含 del_flag,需复活而非新插。
     */
    @Select("SELECT id FROM id_member WHERE project_id = #{projectId} AND account_id = #{accountId} LIMIT 1")
    Long findAnyMemberId(@Param("projectId") Long projectId, @Param("accountId") Long accountId);

    /** 复活软删成员(重新加入):清 del_flag + 重置角色/昵称/头像/状态/工作状态。 */
    @Update("UPDATE id_member SET del_flag = 0, role_id = #{roleId}, nickname = #{nickname}, "
            + "avatar = #{avatar}, status = 1, online_status = 0, work_status = 1, update_time = NOW() "
            + "WHERE id = #{id}")
    int reviveMember(@Param("id") Long id, @Param("roleId") Long roleId,
                     @Param("nickname") String nickname, @Param("avatar") String avatar);
}

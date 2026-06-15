package com.aitalky.conversation.mapper;

import com.aitalky.conversation.entity.AsnGroupMember;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/** AsnGroupMember 数据访问 */
@Mapper
public interface AsnGroupMemberMapper extends BaseMapper<AsnGroupMember> {

    /**
     * 物理删除某组的全部成员。
     * <p>组成员是纯关联记录、无审计价值;且唯一键 (group_id, member_id) 不含 del_flag,
     * 逻辑删除残留的旧行会让"移除后重新加入同一队友"撞唯一键,故走物理删除。
     */
    @Delete("DELETE FROM asn_group_member WHERE group_id = #{groupId}")
    int physicalDeleteByGroup(@Param("groupId") Long groupId);

    /**
     * 物理删除某组的指定成员(普通分配/专属分配移除队友共用)。
     * <p>同上:uk(group_id, member_id) 不含 del_flag,软删残留行会让"移除后重加同人"撞唯一键。
     */
    @Delete("DELETE FROM asn_group_member WHERE group_id = #{groupId} AND member_id = #{memberId}")
    int physicalDeleteMember(@Param("groupId") Long groupId, @Param("memberId") Long memberId);
}

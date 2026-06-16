package com.aitalky.conversation.mapper;

import com.aitalky.conversation.entity.AsnGroup;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/** AsnGroup 数据访问 */
@Mapper
public interface AsnGroupMapper extends BaseMapper<AsnGroup> {

    /**
     * 按 id 取组名称(渠道名称展示用)。
     * <p>自定义 SQL 不走 @TableLogic 逻辑删除过滤:策略被删后,存量会话仍能回显其历史渠道名。
     */
    @Select("SELECT name FROM asn_group WHERE id = #{groupId}")
    String selectNameById(Long groupId);
}

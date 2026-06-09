package com.aitalky.conversation.mapper;

import com.aitalky.conversation.entity.CnvConversation;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/** 会话数据访问 */
@Mapper
public interface CnvConversationMapper extends BaseMapper<CnvConversation> {
}

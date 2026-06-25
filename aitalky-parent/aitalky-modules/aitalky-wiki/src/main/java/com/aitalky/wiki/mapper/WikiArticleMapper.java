package com.aitalky.wiki.mapper;

import com.aitalky.wiki.entity.WikiArticle;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/** WikiArticle 数据访问 */
@Mapper
public interface WikiArticleMapper extends BaseMapper<WikiArticle> {
}

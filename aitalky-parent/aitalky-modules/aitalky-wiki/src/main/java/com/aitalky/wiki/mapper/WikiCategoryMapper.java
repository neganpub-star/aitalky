package com.aitalky.wiki.mapper;

import com.aitalky.wiki.entity.WikiCategory;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/** WikiCategory 数据访问 */
@Mapper
public interface WikiCategoryMapper extends BaseMapper<WikiCategory> {
}

package com.aitalky.messenger.mapper;

import com.aitalky.messenger.entity.MseMessengerLanguage;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/** 信使启用语种数据访问 */
@Mapper
public interface MseMessengerLanguageMapper extends BaseMapper<MseMessengerLanguage> {

    /**
     * 物理删除某项目某语种(绕过逻辑删除)。
     * <p>语种是可反复增删的配置,逻辑删除会因 uk_project_lang 导致重新添加同语种时唯一键冲突,故用物理删除。
     */
    @Delete("DELETE FROM mse_messenger_language WHERE project_id = #{projectId} AND language = #{language}")
    int physicalDelete(@Param("projectId") Long projectId, @Param("language") String language);
}

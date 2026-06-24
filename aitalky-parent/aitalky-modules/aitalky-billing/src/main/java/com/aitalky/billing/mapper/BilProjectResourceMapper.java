package com.aitalky.billing.mapper;

import com.aitalky.billing.entity.BilProjectResource;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/** 项目级永久加量包配额数据访问 */
@Mapper
public interface BilProjectResourceMapper extends BaseMapper<BilProjectResource> {

    /** 累加已购配额(行存在则 +delta);返回受影响行数,0 表示该行不存在需新增 */
    @Update("UPDATE bil_project_resource SET purchased_amount = purchased_amount + #{delta}, update_time = NOW() " +
            "WHERE project_id = #{projectId} AND resource_type = #{resourceType} AND del_flag = 0")
    int incrAmount(@Param("projectId") Long projectId, @Param("resourceType") String resourceType, @Param("delta") long delta);

    /** 覆盖设置已购配额(行存在);返回受影响行数,0 表示该行不存在需新增。后管调整额度用 */
    @Update("UPDATE bil_project_resource SET purchased_amount = #{amount}, update_time = NOW() " +
            "WHERE project_id = #{projectId} AND resource_type = #{resourceType} AND del_flag = 0")
    int setAmount(@Param("projectId") Long projectId, @Param("resourceType") String resourceType, @Param("amount") long amount);

    /** 累加已消耗量(翻译/AI 扣费,原子);返回受影响行数,0 表示该行不存在需新增 */
    @Update("UPDATE bil_project_resource SET used_amount = used_amount + #{delta}, update_time = NOW() " +
            "WHERE project_id = #{projectId} AND resource_type = #{resourceType} AND del_flag = 0")
    int incrUsed(@Param("projectId") Long projectId, @Param("resourceType") String resourceType, @Param("delta") long delta);
}

package com.aitalky.platform.service;

import com.aitalky.platform.dto.PlanVO;
import com.aitalky.platform.dto.SavePlanCmd;

import java.util.List;

/**
 * 套餐管理(平台后管):列表/详情/新增编辑/上下架/删除。含资源配额(pf_plan_quota)。
 */
public interface PlanService {

    /** 套餐列表(按档位升序),含各自配额 */
    List<PlanVO> list();

    /** 套餐详情 */
    PlanVO get(Long id);

    /** 新增/编辑(id 为空=新增);同步覆盖配额。返回套餐id */
    Long save(SavePlanCmd cmd);

    /** 上架/下架(status 1上架 0下架) */
    void updateStatus(Long id, Integer status);

    /** 删除(逻辑删除套餐 + 其配额) */
    void delete(Long id);
}

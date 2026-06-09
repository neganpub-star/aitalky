package com.aitalky.messenger.service;

import com.aitalky.messenger.dto.QuickReplyCategoryVO;
import com.aitalky.messenger.dto.QuickReplyVO;

import java.util.List;

/** 快捷回复服务(项目内共享,project_id 多租户自动隔离) */
public interface QuickReplyService {

    /** 分类列表(按 sort) */
    List<QuickReplyCategoryVO> listCategories();

    /** 新增分类,返回 id */
    Long addCategory(String name);

    /** 删除分类(其下条目的 category_id 置空=未分类) */
    void deleteCategory(Long id);

    /** 条目列表(项目共享) */
    List<QuickReplyVO> list();

    /** 新增条目,返回 id */
    Long addReply(Long categoryId, String title, String content);

    /** 更新条目 */
    void updateReply(Long id, Long categoryId, String title, String content);

    /** 删除条目 */
    void deleteReply(Long id);
}

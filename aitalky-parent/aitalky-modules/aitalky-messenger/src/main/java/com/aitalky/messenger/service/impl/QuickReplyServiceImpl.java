package com.aitalky.messenger.service.impl;

import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.messenger.dto.QuickReplyCategoryVO;
import com.aitalky.messenger.dto.QuickReplyVO;
import com.aitalky.messenger.entity.SupQuickReply;
import com.aitalky.messenger.entity.SupQuickReplyCategory;
import com.aitalky.messenger.mapper.SupQuickReplyCategoryMapper;
import com.aitalky.messenger.mapper.SupQuickReplyMapper;
import com.aitalky.messenger.service.QuickReplyService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 快捷回复实现。project_id 由多租户拦截器自动注入(insert 自动填、select 自动过滤)。
 * <p>MVP:条目按项目共享(scope=1);个人话术后续扩展。
 */
@Service
@RequiredArgsConstructor
public class QuickReplyServiceImpl implements QuickReplyService {

    private final SupQuickReplyMapper replyMapper;
    private final SupQuickReplyCategoryMapper categoryMapper;
    private final SnowflakeIdGenerator idGenerator;

    @Override
    public List<QuickReplyCategoryVO> listCategories() {
        return categoryMapper.selectList(Wrappers.<SupQuickReplyCategory>lambdaQuery()
                        .orderByAsc(SupQuickReplyCategory::getSort).orderByAsc(SupQuickReplyCategory::getId))
                .stream().map(c -> new QuickReplyCategoryVO(c.getId(), c.getName(), c.getSort())).toList();
    }

    @Override
    public Long addCategory(String name) {
        SupQuickReplyCategory c = new SupQuickReplyCategory();
        c.setName(name);
        c.setSort(0);
        c.setId(idGenerator.nextId()); // 主键 IdType.INPUT,需手动注入雪花ID
        categoryMapper.insert(c);
        return c.getId();
    }

    @Override
    public void renameCategory(Long id, String name) {
        SupQuickReplyCategory c = categoryMapper.selectById(id);
        if (c == null) {
            return;
        }
        c.setName(name);
        categoryMapper.updateById(c);
    }

    @Override
    public void deleteCategory(Long id) {
        // 其下条目改为未分类(category_id = null)
        replyMapper.update(null, Wrappers.<SupQuickReply>lambdaUpdate()
                .eq(SupQuickReply::getCategoryId, id).set(SupQuickReply::getCategoryId, null));
        categoryMapper.deleteById(id);
    }

    @Override
    public List<QuickReplyVO> list() {
        // 分类名映射(未分类 category_id 为 null);editorName 由 app 层 Controller 回填
        java.util.Map<Long, String> catNames = categoryMapper.selectList(Wrappers.<SupQuickReplyCategory>lambdaQuery())
                .stream().collect(java.util.stream.Collectors.toMap(SupQuickReplyCategory::getId, SupQuickReplyCategory::getName));
        return replyMapper.selectList(Wrappers.<SupQuickReply>lambdaQuery()
                        .orderByAsc(SupQuickReply::getSort).orderByDesc(SupQuickReply::getId))
                .stream().map(r -> new QuickReplyVO(r.getId(), r.getCategoryId(),
                        r.getCategoryId() == null ? null : catNames.get(r.getCategoryId()),
                        r.getTitle(), r.getContent(), r.getSort(), r.getUpdateBy(), null, r.getUpdateTime())).toList();
    }

    @Override
    public Long addReply(Long categoryId, String title, String content) {
        SupQuickReply r = new SupQuickReply();
        r.setScope(1);
        r.setCategoryId(categoryId);
        r.setTitle(title);
        r.setContent(content);
        r.setSort(0);
        r.setId(idGenerator.nextId()); // 主键 IdType.INPUT,需手动注入雪花ID
        replyMapper.insert(r);
        return r.getId();
    }

    @Override
    public void updateReply(Long id, Long categoryId, String title, String content) {
        SupQuickReply r = replyMapper.selectById(id);
        if (r == null) {
            return;
        }
        r.setCategoryId(categoryId);
        r.setTitle(title);
        r.setContent(content);
        replyMapper.updateById(r);
    }

    @Override
    public void updateSort(Long id, Integer sort) {
        SupQuickReply r = replyMapper.selectById(id);
        if (r == null) {
            return;
        }
        r.setSort(sort == null ? 0 : sort);
        replyMapper.updateById(r);
    }

    @Override
    public void deleteReply(Long id) {
        replyMapper.deleteById(id);
    }
}

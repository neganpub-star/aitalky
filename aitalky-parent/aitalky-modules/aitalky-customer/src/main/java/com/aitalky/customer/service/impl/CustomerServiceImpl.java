package com.aitalky.customer.service.impl;

import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.customer.entity.CusCustomer;
import com.aitalky.customer.mapper.CusCustomerMapper;
import com.aitalky.customer.service.CustomerService;
import com.aitalky.framework.lock.DistributedLockTemplate;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;

/**
 * 客户服务实现。解析/创建走分布式锁,避免并发重复建客户。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String[] FIRST = {"Noah", "Zona", "Liam", "Emma", "Olivia", "Mia", "Lucas", "Ava", "Leo", "Nora"};
    private static final String[] LAST = {"Hobson", "Carnegie", "Roger", "Smith", "Brown", "Davis", "Wang", "Lee", "Kim", "Stone"};

    private final CusCustomerMapper customerMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final DistributedLockTemplate lockTemplate;

    @Override
    public CusCustomer resolveOrCreate(Long projectId, String externalUserId, String visitorId, String lang) {
        boolean isUser = StringUtils.hasText(externalUserId);
        String idKey = isUser ? externalUserId : visitorId;
        CusCustomer existing = findOne(projectId, externalUserId, visitorId, isUser);
        if (existing != null) {
            return existing;
        }
        // 锁内二次查 + 创建,避免并发重复
        return lockTemplate.execute("lock:customer:" + projectId + ":" + idKey, 3, 10, () -> {
            CusCustomer again = findOne(projectId, externalUserId, visitorId, isUser);
            if (again != null) {
                return again;
            }
            CusCustomer c = new CusCustomer();
            c.setId(idGenerator.nextId());
            c.setProjectId(projectId);
            c.setExternalUserId(externalUserId);
            c.setVisitorId(visitorId);
            c.setType(isUser ? 2 : 1);
            c.setName(randomName());
            c.setAvatar("https://api.dicebear.com/7.x/avataaars/svg?seed=" + c.getId());
            c.setSourceLanguage(lang);
            customerMapper.insert(c);
            log.info("创建客户 customerId={}, projectId={}, type={}", c.getId(), projectId, c.getType());
            return c;
        });
    }

    @Override
    public CusCustomer getById(Long customerId) {
        return customerMapper.selectById(customerId);
    }

    @Override
    public void updateContact(Long customerId, Long projectId, String contact, String email) {
        CusCustomer c = customerMapper.selectById(customerId);
        // 越权保护:客户不存在或不属于当前项目则不更新
        if (c == null || !projectId.equals(c.getProjectId())) {
            return;
        }
        c.setContact(contact);
        c.setEmail(email);
        customerMapper.updateById(c);
    }

    private CusCustomer findOne(Long projectId, String externalUserId, String visitorId, boolean isUser) {
        return customerMapper.selectOne(Wrappers.<CusCustomer>lambdaQuery()
                .eq(CusCustomer::getProjectId, projectId)
                .eq(isUser, CusCustomer::getExternalUserId, externalUserId)
                .eq(!isUser, CusCustomer::getVisitorId, visitorId)
                .last("limit 1"));
    }

    private String randomName() {
        return FIRST[RANDOM.nextInt(FIRST.length)] + " " + LAST[RANDOM.nextInt(LAST.length)];
    }
}

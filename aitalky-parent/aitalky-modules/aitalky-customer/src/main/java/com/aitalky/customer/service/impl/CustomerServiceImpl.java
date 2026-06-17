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
    // 随机名池:100 名 × 100 姓 = 1 万种组合,大幅降低测试数据撞名概率(真实接入由业务系统传昵称,不走此池)
    private static final String[] FIRST = {
            "Noah", "Liam", "Oliver", "Elijah", "James", "William", "Benjamin", "Lucas", "Henry", "Theodore",
            "Jack", "Levi", "Alexander", "Jackson", "Mateo", "Daniel", "Michael", "Mason", "Sebastian", "Ethan",
            "Logan", "Owen", "Samuel", "Jacob", "Asher", "Aiden", "John", "Joseph", "Wyatt", "David",
            "Leo", "Luke", "Julian", "Hudson", "Grayson", "Matthew", "Ezra", "Gabriel", "Carter", "Isaac",
            "Jayden", "Luca", "Anthony", "Dylan", "Lincoln", "Thomas", "Maverick", "Elias", "Josiah", "Charles",
            "Olivia", "Emma", "Charlotte", "Amelia", "Sophia", "Mia", "Isabella", "Ava", "Evelyn", "Luna",
            "Harper", "Camila", "Sofia", "Scarlett", "Elizabeth", "Eleanor", "Emily", "Chloe", "Mila", "Violet",
            "Penelope", "Gianna", "Aria", "Abigail", "Ella", "Avery", "Hazel", "Nora", "Layla", "Lily",
            "Aurora", "Nova", "Ellie", "Madison", "Grace", "Isla", "Willow", "Zoe", "Riley", "Stella",
            "Hannah", "Zona", "Ivy", "Victoria", "Lucy", "Leah", "Naomi", "Ruby", "Eliana", "Maya"};
    private static final String[] LAST = {
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
            "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
            "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
            "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
            "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
            "Hobson", "Carnegie", "Roger", "Wang", "Kim", "Stone", "Carnahan", "Phillips", "Evans", "Turner",
            "Parker", "Collins", "Edwards", "Stewart", "Morris", "Murphy", "Cook", "Rogers", "Morgan", "Cooper",
            "Reed", "Bailey", "Bell", "Gomez", "Kelly", "Howard", "Ward", "Cox", "Diaz", "Richardson",
            "Wood", "Watson", "Brooks", "Bennett", "Gray", "James", "Reyes", "Cruz", "Hughes", "Price",
            "Myers", "Long", "Foster", "Sanders", "Ross", "Powell", "Sullivan", "Russell", "Ortiz", "Jenkins"};

    private final CusCustomerMapper customerMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final DistributedLockTemplate lockTemplate;

    @Override
    public CusCustomer resolveOrCreate(Long projectId, String externalUserId, String visitorId, String lang) {
        boolean isUser = StringUtils.hasText(externalUserId);
        String idKey = isUser ? externalUserId : visitorId;
        CusCustomer existing = findOne(projectId, externalUserId, visitorId, isUser);
        if (existing != null) {
            // 回填来源语言:历史客户可能因早期 init 传空而 sourceLanguage 为空,补写一次(已有则不动)
            if (!StringUtils.hasText(existing.getSourceLanguage()) && StringUtils.hasText(lang)) {
                existing.setSourceLanguage(lang);
                customerMapper.updateById(existing);
            }
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

    @Override
    public long countByProject(Long projectId) {
        return customerMapper.selectCount(Wrappers.<CusCustomer>lambdaQuery()
                .eq(CusCustomer::getProjectId, projectId));
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

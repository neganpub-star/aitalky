package com.aitalky.message.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;
import java.util.Map;

/**
 * 消息(MongoDB)。会话内单调 seq 保证顺序;senderName/senderAvatar 为发送时快照(改资料不回溯)。
 * 内部消息/@提及:internal=true + mentions[]。
 */
@Data
@Document("messages")
@CompoundIndexes({
        // 热路径:按会话取消息 / 增量同步(loadLatest、sync、retract)——查询代价与集合总量无关
        @CompoundIndex(name = "conv_seq", def = "{'conversationId': 1, 'seq': 1}"),
        // 内容搜索/按项目过滤:先用 projectId 命中索引缩小范围,再正则匹配 content;timestamp 倒序便于取新
        @CompoundIndex(name = "proj_ts", def = "{'projectId': 1, 'timestamp': -1}")
})
public class Message {

    @Id
    private String id;
    /** 业务消息ID(雪花,去重/撤回用) */
    private Long msgId;
    /** 会话内单调序号(排序/同步水位/缺口检测) */
    private Long seq;
    private Long projectId;
    private Long conversationId;
    private Long customerId;
    /** customer / agent / system */
    private String senderType;
    /** agent=memberId(真实发送者,负责人代发=负责人id) / customer=customerId */
    private Long senderId;
    /** 发送者昵称【发送时快照】 */
    private String senderName;
    /** 发送者头像【发送时快照】 */
    private String senderAvatar;
    /** text / image / file / card */
    private String type;
    /** 文本内容;富消息放 payload */
    private String content;
    /** 图片/文件/卡片结构化内容 */
    private Map<String, Object> payload;
    /** 译文缓存 {lang: text} */
    private Map<String, String> translations;
    private Boolean isRead;
    /** 撤回置 false */
    private Boolean isVisible;
    /** true=内部消息/备注(客户不可见) */
    private Boolean internal;
    /** 内部消息 @提及的成员id */
    private List<Long> mentions;
    @Field("timestamp")
    private Long timestamp;
}
